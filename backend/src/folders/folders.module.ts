import { Module } from '@nestjs/common';

import { AccessService } from '../common/access.service';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, AccessService],
  exports: [FoldersService, AccessService],
})
export class FoldersModule {}
