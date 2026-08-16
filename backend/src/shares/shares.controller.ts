import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ResourceType, User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShareDto } from './dto/share.dto';
import { SharesService } from './shares.service';

@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('shares')
  create(@CurrentUser() user: User, @Body() dto: CreateShareDto) {
    return this.shares.create(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shares')
  list(
    @CurrentUser() user: User,
    @Query('resourceType') resourceType: ResourceType,
    @Query('resourceId') resourceId: string,
  ) {
    return this.shares.listForResource(user, resourceType, resourceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shares/mine')
  listMine(@CurrentUser() user: User) {
    return this.shares.listMine(user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('shares/:id')
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.shares.revoke(user, id);
  }

  // --- Public, unauthenticated link resolution ---

  @Get('public/:token')
  resolvePublic(@Param('token') token: string) {
    return this.shares.resolvePublic(token);
  }

  @Get('public/:token/folders/:folderId')
  browseFolder(@Param('token') token: string, @Param('folderId') folderId: string) {
    return this.shares.publicBrowseFolder(token, folderId);
  }

  @Get('public/:token/files/:fileId/view-url')
  fileViewUrl(@Param('token') token: string, @Param('fileId') fileId: string) {
    return this.shares.publicFileViewUrl(token, fileId);
  }
}
