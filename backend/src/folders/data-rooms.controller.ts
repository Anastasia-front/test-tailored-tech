import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/data-room.dto';

@UseGuards(JwtAuthGuard)
@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateDataRoomDto) {
    return this.dataRooms.create(user.id, dto);
  }

  @Get()
  async list(@CurrentUser() user: User) {
    const [owned, shared] = await Promise.all([
      this.dataRooms.listOwned(user.id),
      this.dataRooms.listSharedWithMe(user.id, user.email),
    ]);
    return { owned, shared };
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dataRooms.getOwned(user.id, id);
  }

  @Get(':id/delete-preview')
  deletePreview(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dataRooms.deletePreview(user.id, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dataRooms.delete(user.id, id);
  }
}
