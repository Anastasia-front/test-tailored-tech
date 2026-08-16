import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateFolderDto, RenameFolderDto } from './dto/folder.dto';
import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateFolderDto) {
    return this.folders.create(user, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  getContents(@CurrentUser() user: User | null, @Param('id') id: string) {
    return this.folders.getContents(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  rename(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: RenameFolderDto) {
    return this.folders.rename(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/delete-preview')
  deletePreview(@CurrentUser() user: User, @Param('id') id: string) {
    return this.folders.deletePreview(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.folders.delete(user, id);
  }
}
