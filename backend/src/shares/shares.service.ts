import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceType, ShareType, User } from '@prisma/client';
import { randomBytes } from 'crypto';

import { AccessService } from '../common/access.service';
import { FoldersService } from '../folders/folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateShareDto } from './dto/share.dto';

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly folders: FoldersService,
    private readonly storage: StorageService,
  ) {}

  private async assertOwnsResource(userId: string, resourceType: ResourceType, resourceId: string) {
    if (resourceType === ResourceType.DATA_ROOM) {
      await this.access.assertIsOwnerOfDataRoom(userId, resourceId);
    } else if (resourceType === ResourceType.FOLDER) {
      const folder = await this.prisma.folder.findUnique({ where: { id: resourceId } });
      if (!folder) throw new NotFoundException('Folder not found');
      await this.access.assertIsOwnerOfDataRoom(userId, folder.dataRoomId);
    } else {
      const file = await this.prisma.file.findUnique({ where: { id: resourceId } });
      if (!file) throw new NotFoundException('File not found');
      const folder = await this.prisma.folder.findUnique({ where: { id: file.folderId } });
      if (!folder) throw new NotFoundException('File not found');
      await this.access.assertIsOwnerOfDataRoom(userId, folder.dataRoomId);
    }
  }

  async create(user: User, dto: CreateShareDto) {
    await this.assertOwnsResource(user.id, dto.resourceType, dto.resourceId);

    if (dto.shareType === ShareType.PERMISSIONED && (!dto.emails || dto.emails.length === 0)) {
      throw new BadRequestException('At least one email is required for a permissioned share');
    }

    const data: any = {
      resourceType: dto.resourceType,
      shareType: dto.shareType,
      createdById: user.id,
    };
    if (dto.resourceType === ResourceType.DATA_ROOM) data.dataRoomId = dto.resourceId;
    if (dto.resourceType === ResourceType.FOLDER) data.folderId = dto.resourceId;
    if (dto.resourceType === ResourceType.FILE) data.fileId = dto.resourceId;
    if (dto.shareType === ShareType.PUBLIC_LINK) data.token = randomBytes(24).toString('base64url');

    const share = await this.prisma.share.create({
      data: {
        ...data,
        grantees:
          dto.shareType === ShareType.PERMISSIONED
            ? { create: (dto.emails ?? []).map((email) => ({ email })) }
            : undefined,
      },
      include: { grantees: true },
    });
    return this.serialize(share);
  }

  async listForResource(user: User, resourceType: ResourceType, resourceId: string) {
    await this.assertOwnsResource(user.id, resourceType, resourceId);
    const where: any = { resourceType, revoked: false };
    if (resourceType === ResourceType.DATA_ROOM) where.dataRoomId = resourceId;
    if (resourceType === ResourceType.FOLDER) where.folderId = resourceId;
    if (resourceType === ResourceType.FILE) where.fileId = resourceId;

    const shares = await this.prisma.share.findMany({
      where,
      include: { grantees: true },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => this.serialize(s));
  }

  async revoke(user: User, shareId: string) {
    const share = await this.prisma.share.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Share not found');
    if (share.createdById !== user.id) throw new ForbiddenException('Not authorized');
    await this.prisma.share.update({ where: { id: shareId }, data: { revoked: true } });
    return { success: true };
  }

  async listMine(user: User) {
    const shares = await this.prisma.share.findMany({
      where: {
        revoked: false,
        shareType: ShareType.PERMISSIONED,
        grantees: { some: { OR: [{ userId: user.id }, { email: user.email }] } },
      },
      include: { dataRoom: true, folder: true, file: true },
      orderBy: { createdAt: 'desc' },
    });

    const roomRootFolders = await this.prisma.folder.findMany({
      where: {
        isRoot: true,
        dataRoomId: {
          in: shares
            .filter((s) => s.resourceType === ResourceType.DATA_ROOM)
            .map((s) => s.dataRoomId!),
        },
      },
    });
    const rootByRoomId = new Map(roomRootFolders.map((f) => [f.dataRoomId, f.id]));

    return shares.map((s) => ({
      id: s.id,
      resourceType: s.resourceType,
      resourceName: s.dataRoom?.name ?? s.folder?.name ?? s.file?.name ?? 'Untitled',
      entryFolderId:
        s.resourceType === ResourceType.FOLDER
          ? (s.folderId ?? undefined)
          : s.resourceType === ResourceType.DATA_ROOM
            ? rootByRoomId.get(s.dataRoomId!)
            : undefined,
      dataRoomId: s.dataRoomId,
      folderId: s.folderId,
      fileId: s.fileId,
      createdAt: s.createdAt,
    }));
  }

  // --- Public link resolution (anonymous) ---

  private async loadShareByToken(token: string) {
    const share = await this.prisma.share.findUnique({ where: { token } });
    if (!share || share.revoked || share.shareType !== ShareType.PUBLIC_LINK) {
      throw new NotFoundException('This link is invalid or has been revoked');
    }
    return share;
  }

  async resolvePublic(token: string) {
    const share = await this.loadShareByToken(token);
    if (share.resourceType === ResourceType.FILE) {
      const file = await this.prisma.file.findUnique({ where: { id: share.fileId! } });
      if (!file) throw new NotFoundException('This content no longer exists');
      return { resourceType: 'FILE' as const, file: this.folders.serializeFile(file) };
    }

    let folderId: string;
    if (share.resourceType === ResourceType.DATA_ROOM) {
      const root = await this.prisma.folder.findFirst({
        where: { dataRoomId: share.dataRoomId!, isRoot: true },
      });
      if (!root) throw new NotFoundException('This content no longer exists');
      folderId = root.id;
    } else {
      folderId = share.folderId!;
    }

    const contents = await this.publicBrowseFolder(token, folderId);
    return { resourceType: 'FOLDER' as const, ...contents };
  }

  async publicBrowseFolder(token: string, folderId: string) {
    const share = await this.loadShareByToken(token);
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('This content no longer exists');
    await this.assertWithinSharedSubtree(share, folder.id);

    const [subfolders, files, dataRoom] = await Promise.all([
      this.prisma.folder.findMany({ where: { parentId: folder.id }, orderBy: { name: 'asc' } }),
      this.prisma.file.findMany({ where: { folderId: folder.id }, orderBy: { name: 'asc' } }),
      this.prisma.dataRoom.findUnique({ where: { id: folder.dataRoomId } }),
    ]);

    // Breadcrumb stops at the shared root — viewers shouldn't see ancestors above what was shared with them.
    const fullChain = await this.access.getFolderChain(folder.id);
    const sharedRootId = share.resourceType === ResourceType.FOLDER ? share.folderId : undefined;
    let chain = fullChain.reverse();
    if (sharedRootId) {
      const idx = chain.findIndex((f) => f.id === sharedRootId);
      if (idx >= 0) chain = chain.slice(idx);
    }

    return {
      folder: this.folders.serializeFolder(folder),
      dataRoom: dataRoom ? { id: dataRoom.id, name: dataRoom.name } : null,
      breadcrumb: chain.map((f) => ({
        id: f.id,
        name: f.isRoot ? (dataRoom?.name ?? 'Root') : f.name,
        isRoot: f.isRoot,
      })),
      subfolders: subfolders.map((f) => this.folders.serializeFolder(f)),
      files: files.map((f) => this.folders.serializeFile(f)),
    };
  }

  async publicFileViewUrl(token: string, fileId: string) {
    const share = await this.loadShareByToken(token);
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('This content no longer exists');
    await this.assertWithinSharedSubtree(share, file.folderId, file.id);
    const url = await this.storage.getDownloadUrl(file.s3Key);
    return { url, name: file.name, mimeType: file.mimeType };
  }

  private async assertWithinSharedSubtree(
    share: {
      resourceType: ResourceType;
      dataRoomId: string | null;
      folderId: string | null;
      fileId: string | null;
    },
    folderId: string,
    fileId?: string,
  ) {
    if (share.resourceType === ResourceType.FILE) {
      if (share.fileId !== fileId) throw new NotFoundException('This content no longer exists');
      return;
    }
    const chain = await this.access.getFolderChain(folderId);
    if (share.resourceType === ResourceType.DATA_ROOM) {
      const dataRoomId = chain[0]?.dataRoomId;
      if (dataRoomId !== share.dataRoomId)
        throw new NotFoundException('This content no longer exists');
      return;
    }
    if (share.resourceType === ResourceType.FOLDER) {
      const inSubtree = chain.some((f) => f.id === share.folderId);
      if (!inSubtree) throw new NotFoundException('This content no longer exists');
    }
  }

  private serialize(share: any) {
    return {
      id: share.id,
      resourceType: share.resourceType,
      shareType: share.shareType,
      token: share.token,
      revoked: share.revoked,
      createdAt: share.createdAt,
      grantees: (share.grantees ?? []).map((g: any) => ({ id: g.id, email: g.email })),
    };
  }
}
