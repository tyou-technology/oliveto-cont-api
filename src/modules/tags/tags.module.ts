import { Module } from '@nestjs/common';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { TagsController } from '@modules/tags/resource/tags.controller';
import { TagsService } from '@modules/tags/service/tags.service';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
