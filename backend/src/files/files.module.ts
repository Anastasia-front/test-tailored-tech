import { Module } from '@nestjs/common';

import { AccessService } from '../common/access.service';
import { FoldersModule } from '../folders/folders.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [FoldersModule],
  controllers: [FilesController],
  providers: [FilesService, AccessService],
})
export class FilesModule {}
