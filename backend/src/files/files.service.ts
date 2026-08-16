import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { AccessService } from '../common/access.service';
import { resolveNameConflict } from '../common/name-conflict.util';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfirmUploadDto, RequestUploadUrlDto, UpdateFileDto } from './dto/file.dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
    private readonly folders: FoldersService,
  ) {}

  private async assertOwnedFolder(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.access.assertIsOwnerOfDataRoom(userId, folder.dataRoomId).catch(() => {
      throw new NotFoundException('Folder not found');
    });
    return folder;
  }

  async requestUploadUrl(user: User, dto: RequestUploadUrlDto) {
    const folder = await this.assertOwnedFolder(user.id, dto.folderId);
    const existing = await this.prisma.file.findMany({
      where: { folderId: folder.id },
      select: { name: true },
    });
    const resolvedName = resolveNameConflict(dto.fileName, new Set(existing.map((f) => f.name)));
    const key = this.storage.buildKey(folder.dataRoomId, folder.id, resolvedName);
    const uploadUrl = await this.storage.getUploadUrl(
      key,
      dto.contentType || 'application/octet-stream',
    );
    return { uploadUrl, key, resolvedName };
  }

  async confirmUpload(user: User, dto: ConfirmUploadDto) {
    const folder = await this.assertOwnedFolder(user.id, dto.folderId);
    const existing = await this.prisma.file.findMany({
      where: { folderId: folder.id },
      select: { name: true },
    });
    // Re-resolve in case of a race between two concurrent uploads with the same name.
    const name = resolveNameConflict(dto.name, new Set(existing.map((f) => f.name)));

    const file = await this.prisma.file.create({
      data: {
        name,
        sizeBytes: BigInt(dto.sizeBytes),
        mimeType: dto.mimeType || 'application/octet-stream',
        s3Key: dto.key,
        folderId: folder.id,
        uploadedById: user.id,
      },
    });
    await this.folders.adjustAncestorCounters(folder.id, BigInt(dto.sizeBytes), 1);
    return this.folders.serializeFile(file);
  }

  async get(user: User | null, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    await this.access.assertCanViewFile(user?.id ?? null, user?.email ?? null, file);
    return this.folders.serializeFile(file);
  }

  async getViewUrl(user: User | null, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    await this.access.assertCanViewFile(user?.id ?? null, user?.email ?? null, file);
    const url = await this.storage.getDownloadUrl(file.s3Key);
    return { url, name: file.name, mimeType: file.mimeType };
  }

  async update(user: User, id: string, dto: UpdateFileDto) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    const currentFolder = await this.assertOwnedFolder(user.id, file.folderId);

    let targetFolderId = file.folderId;
    if (dto.folderId && dto.folderId !== file.folderId) {
      const targetFolder = await this.assertOwnedFolder(user.id, dto.folderId);
      if (targetFolder.dataRoomId !== currentFolder.dataRoomId) {
        throw new BadRequestException('Cannot move a file across data rooms');
      }
      targetFolderId = targetFolder.id;
    }

    const siblingScopeFolderId = targetFolderId;
    const existing = await this.prisma.file.findMany({
      where: { folderId: siblingScopeFolderId, id: { not: file.id } },
      select: { name: true },
    });
    const name = resolveNameConflict(dto.name ?? file.name, new Set(existing.map((f) => f.name)));

    const updated = await this.prisma.file.update({
      where: { id: file.id },
      data: { name, folderId: targetFolderId },
    });

    if (targetFolderId !== file.folderId) {
      await this.folders.adjustAncestorCounters(file.folderId, -file.sizeBytes, -1);
      await this.folders.adjustAncestorCounters(targetFolderId, file.sizeBytes, 1);
    }

    return this.folders.serializeFile(updated);
  }

  async delete(user: User, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    await this.assertOwnedFolder(user.id, file.folderId);

    await this.prisma.file.delete({ where: { id: file.id } });
    await this.storage.deleteObject(file.s3Key);
    await this.folders.adjustAncestorCounters(file.folderId, -file.sizeBytes, -1);
    return { success: true };
  }
}
