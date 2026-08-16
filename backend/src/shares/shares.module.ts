import { Module } from '@nestjs/common';

import { AccessService } from '../common/access.service';
import { FoldersModule } from '../folders/folders.module';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [FoldersModule],
  controllers: [SharesController],
  providers: [SharesService, AccessService],
})
export class SharesModule {}
