import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Folder, ShareType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Centralizes "can this user see this resource" logic. A resource is
 * visible to a user if:
 *  1. they own the data room it belongs to, or
 *  2. there is a non-revoked PERMISSIONED share on the data room, an
 *     ancestor folder, the folder itself, or (for files) the file itself,
 *     with a grantee row matching their user id / email.
 *
 * Public-link access is handled separately (see SharesService.resolvePublicToken)
 * because it's anonymous and keyed by token rather than by user.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getFolderChain(folderId: string): Promise<Folder[]> {
    const chain: Folder[] = [];
    let current = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!current) throw new NotFoundException('Folder not found');
    chain.push(current);
    while (current?.parentId) {
      current = await this.prisma.folder.findUnique({ where: { id: current.parentId } });
      if (!current) break;
      chain.push(current);
    }
    return chain; // [self, parent, grandparent, ..., root]
  }

  async userHasPermissionedAccess(
    userId: string,
    userEmail: string,
    opts: { dataRoomId?: string; folderIds?: string[]; fileId?: string },
  ): Promise<boolean> {
    const or: any[] = [];
    if (opts.dataRoomId) or.push({ dataRoomId: opts.dataRoomId });
    if (opts.folderIds?.length) or.push({ folderId: { in: opts.folderIds } });
    if (opts.fileId) or.push({ fileId: opts.fileId });
    if (or.length === 0) return false;

    const share = await this.prisma.share.findFirst({
      where: {
        revoked: false,
        shareType: ShareType.PERMISSIONED,
        OR: or,
        grantees: { some: { OR: [{ userId }, { email: userEmail }] } },
      },
    });
    return !!share;
  }

  /** Throws 404 (not 403, to avoid leaking existence) if the user cannot view this folder. */
  async assertCanViewFolder(userId: string | null, userEmail: string | null, folder: Folder) {
    const owner = await this.prisma.dataRoom.findUnique({ where: { id: folder.dataRoomId } });
    if (!owner) throw new NotFoundException('Folder not found');
    if (userId && owner.ownerId === userId) return;

    if (userId && userEmail) {
      const chain = await this.getFolderChain(folder.id);
      const has = await this.userHasPermissionedAccess(userId, userEmail, {
        dataRoomId: owner.id,
        folderIds: chain.map((f) => f.id),
      });
      if (has) return;
    }
    throw new NotFoundException('Folder not found');
  }

  async assertCanViewFile(
    userId: string | null,
    userEmail: string | null,
    file: { id: string; folderId: string },
  ) {
    const folder = await this.prisma.folder.findUnique({ where: { id: file.folderId } });
    if (!folder) throw new NotFoundException('File not found');
    const owner = await this.prisma.dataRoom.findUnique({ where: { id: folder.dataRoomId } });
    if (!owner) throw new NotFoundException('File not found');
    if (userId && owner.ownerId === userId) return;

    if (userId && userEmail) {
      const chain = await this.getFolderChain(folder.id);
      const has = await this.userHasPermissionedAccess(userId, userEmail, {
        dataRoomId: owner.id,
        folderIds: chain.map((f) => f.id),
        fileId: file.id,
      });
      if (has) return;
    }
    throw new NotFoundException('File not found');
  }

  async assertIsOwnerOfDataRoom(userId: string, dataRoomId: string) {
    const room = await this.prisma.dataRoom.findUnique({ where: { id: dataRoomId } });
    if (!room) throw new NotFoundException('Data room not found');
    if (room.ownerId !== userId) throw new ForbiddenException('Not authorized');
    return room;
  }
}
