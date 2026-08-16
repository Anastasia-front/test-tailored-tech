import { Injectable, NotFoundException } from '@nestjs/common';
import { ShareType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateDataRoomDto } from './dto/data-room.dto';

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(ownerId: string, dto: CreateDataRoomDto) {
    return this.prisma.dataRoom.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId,
        folders: {
          create: { name: 'Root', isRoot: true },
        },
      },
      include: { folders: true },
    });
  }

  async listOwned(ownerId: string) {
    const rooms = await this.prisma.dataRoom.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { folders: { where: { isRoot: true } } },
    });
    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      rootFolderId: r.folders[0]?.id,
      totalSizeBytes: r.folders[0]?.totalSizeBytes.toString() ?? '0',
      totalItemCount: r.folders[0]?.totalItemCount ?? 0,
      isOwner: true,
    }));
  }

  async listSharedWithMe(userId: string, userEmail: string) {
    const shares = await this.prisma.share.findMany({
      where: {
        revoked: false,
        shareType: ShareType.PERMISSIONED,
        grantees: { some: { OR: [{ userId }, { email: userEmail }] } },
        dataRoomId: { not: null },
      },
      include: { dataRoom: { include: { folders: { where: { isRoot: true } } } } },
    });
    return shares
      .filter((s) => s.dataRoom)
      .map((s) => ({
        id: s.dataRoom!.id,
        name: s.dataRoom!.name,
        description: s.dataRoom!.description,
        createdAt: s.dataRoom!.createdAt,
        updatedAt: s.dataRoom!.updatedAt,
        rootFolderId: s.dataRoom!.folders[0]?.id,
        totalSizeBytes: s.dataRoom!.folders[0]?.totalSizeBytes.toString() ?? '0',
        totalItemCount: s.dataRoom!.folders[0]?.totalItemCount ?? 0,
        isOwner: false,
        shareId: s.id,
      }));
  }

  async getOwned(ownerId: string, id: string) {
    const room = await this.prisma.dataRoom.findFirst({
      where: { id, ownerId },
      include: { folders: { where: { isRoot: true } } },
    });
    if (!room) throw new NotFoundException('Data room not found');
    return room;
  }

  async delete(ownerId: string, id: string) {
    const room = await this.getOwned(ownerId, id);
    const files = await this.prisma.file.findMany({
      where: { folder: { dataRoomId: room.id } },
      select: { s3Key: true },
    });
    await this.prisma.dataRoom.delete({ where: { id: room.id } });
    await this.storage.deleteObjects(files.map((f) => f.s3Key));
    return { success: true };
  }

  async deletePreview(ownerId: string, id: string) {
    const room = await this.getOwned(ownerId, id);
    const rootFolder = room.folders[0];
    return {
      folderCount: await this.countFoldersUnder(room.id),
      fileCount: rootFolder?.totalItemCount
        ? await this.prisma.file.count({ where: { folder: { dataRoomId: room.id } } })
        : 0,
      totalSizeBytes: rootFolder?.totalSizeBytes.toString() ?? '0',
    };
  }

  private async countFoldersUnder(dataRoomId: string) {
    return this.prisma.folder.count({ where: { dataRoomId, isRoot: false } });
  }
}
