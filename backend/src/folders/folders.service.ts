import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { AccessService } from '../common/access.service';
import { resolveNameConflict } from '../common/name-conflict.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateFolderDto, RenameFolderDto } from './dto/folder.dto';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessService,
  ) {}

  /** Walks from `folderId` up to the root, applying +/- delta to each ancestor's rollup counters. */
  async adjustAncestorCounters(folderId: string, deltaSize: bigint, deltaCount: number) {
    let currentId: string | null = folderId;
    while (currentId) {
      const folder: { id: string; parentId: string | null } | null =
        await this.prisma.folder.update({
          where: { id: currentId },
          data: {
            totalSizeBytes: { increment: deltaSize },
            totalItemCount: { increment: deltaCount },
          },
          select: { id: true, parentId: true },
        });
      currentId = folder.parentId;
    }
  }

  async create(user: User, dto: CreateFolderDto) {
    const parent = await this.prisma.folder.findUnique({ where: { id: dto.parentId } });
    if (!parent) throw new NotFoundException('Parent folder not found');
    await this.access.assertIsOwnerOfDataRoom(user.id, parent.dataRoomId).catch(() => {
      throw new NotFoundException('Parent folder not found');
    });

    const siblings = await this.prisma.folder.findMany({
      where: { parentId: parent.id },
      select: { name: true },
    });
    const name = resolveNameConflict(dto.name, new Set(siblings.map((s) => s.name)));

    const folder = await this.prisma.folder.create({
      data: { name, parentId: parent.id, dataRoomId: parent.dataRoomId },
    });
    await this.adjustAncestorCounters(parent.id, BigInt(0), 1);
    return folder;
  }

  async getContents(user: User | null, folderId: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.access.assertCanViewFolder(user?.id ?? null, user?.email ?? null, folder);

    const [subfolders, files, breadcrumb, dataRoom] = await Promise.all([
      this.prisma.folder.findMany({ where: { parentId: folder.id }, orderBy: { name: 'asc' } }),
      this.prisma.file.findMany({ where: { folderId: folder.id }, orderBy: { name: 'asc' } }),
      this.access.getFolderChain(folder.id),
      this.prisma.dataRoom.findUnique({ where: { id: folder.dataRoomId } }),
    ]);

    return {
      folder: this.serializeFolder(folder),
      dataRoom: dataRoom
        ? { id: dataRoom.id, name: dataRoom.name, ownerId: dataRoom.ownerId }
        : null,
      breadcrumb: breadcrumb
        .reverse()
        .map((f) => ({
          id: f.id,
          name: f.isRoot ? (dataRoom?.name ?? 'Root') : f.name,
          isRoot: f.isRoot,
        })),
      subfolders: subfolders.map((f) => this.serializeFolder(f)),
      files: files.map((f) => this.serializeFile(f)),
    };
  }

  async rename(user: User, folderId: string, dto: RenameFolderDto) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.isRoot) throw new BadRequestException('Cannot rename the root folder');
    await this.access.assertIsOwnerOfDataRoom(user.id, folder.dataRoomId).catch(() => {
      throw new NotFoundException('Folder not found');
    });

    const siblings = await this.prisma.folder.findMany({
      where: { parentId: folder.parentId, id: { not: folder.id } },
      select: { name: true },
    });
    const name = resolveNameConflict(dto.name, new Set(siblings.map((s) => s.name)));

    return this.prisma.folder.update({ where: { id: folder.id }, data: { name } });
  }

  async deletePreview(user: User, folderId: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.access.assertIsOwnerOfDataRoom(user.id, folder.dataRoomId).catch(() => {
      throw new NotFoundException('Folder not found');
    });

    const descendantFolderIds = await this.getDescendantFolderIds(folder.id);
    const fileCount = await this.prisma.file.count({
      where: { folderId: { in: [folder.id, ...descendantFolderIds] } },
    });
    return {
      folderCount: descendantFolderIds.length,
      fileCount,
      totalSizeBytes: folder.totalSizeBytes.toString(),
    };
  }

  async delete(user: User, folderId: string) {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.isRoot)
      throw new BadRequestException('Cannot delete the root folder of a data room');
    await this.access.assertIsOwnerOfDataRoom(user.id, folder.dataRoomId).catch(() => {
      throw new NotFoundException('Folder not found');
    });

    const descendantFolderIds = await this.getDescendantFolderIds(folder.id);
    const files = await this.prisma.file.findMany({
      where: { folderId: { in: [folder.id, ...descendantFolderIds] } },
      select: { s3Key: true },
    });

    const deltaSize = -folder.totalSizeBytes;
    const parentId = folder.parentId;

    await this.prisma.folder.delete({ where: { id: folder.id } }); // cascades children + files + shares
    await this.storage.deleteObjects(files.map((f) => f.s3Key));

    if (parentId) {
      // -1 for the deleted folder itself, plus its own subtree item count.
      await this.adjustAncestorCounters(parentId, deltaSize, -(folder.totalItemCount + 1));
    }
    return { success: true };
  }

  private async getDescendantFolderIds(rootId: string): Promise<string[]> {
    const result: string[] = [];
    let frontier = [rootId];
    while (frontier.length) {
      const children = await this.prisma.folder.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      const ids = children.map((c) => c.id);
      result.push(...ids);
      frontier = ids;
    }
    return result;
  }

  serializeFolder(folder: {
    id: string;
    name: string;
    parentId: string | null;
    dataRoomId: string;
    isRoot: boolean;
    createdAt: Date;
    updatedAt: Date;
    totalSizeBytes: bigint;
    totalItemCount: number;
  }) {
    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      dataRoomId: folder.dataRoomId,
      isRoot: folder.isRoot,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      totalSizeBytes: folder.totalSizeBytes.toString(),
      totalItemCount: folder.totalItemCount,
      type: 'folder' as const,
    };
  }

  serializeFile(file: {
    id: string;
    name: string;
    sizeBytes: bigint;
    mimeType: string;
    folderId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: file.id,
      name: file.name,
      sizeBytes: file.sizeBytes.toString(),
      mimeType: file.mimeType,
      folderId: file.folderId,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      type: 'file' as const,
    };
  }
}
