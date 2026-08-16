import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ConfirmUploadDto, RequestUploadUrlDto, UpdateFileDto } from './dto/file.dto';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  requestUploadUrl(@CurrentUser() user: User, @Body() dto: RequestUploadUrlDto) {
    return this.files.requestUploadUrl(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  confirmUpload(@CurrentUser() user: User, @Body() dto: ConfirmUploadDto) {
    return this.files.confirmUpload(user, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  get(@CurrentUser() user: User | null, @Param('id') id: string) {
    return this.files.get(user, id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/view-url')
  getViewUrl(@CurrentUser() user: User | null, @Param('id') id: string) {
    return this.files.getViewUrl(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.files.update(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.files.delete(user, id);
  }
}
