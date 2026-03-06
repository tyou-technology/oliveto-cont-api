import { Module } from '@nestjs/common';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { TagsController } from '@modules/tags/resource/tags.controller';
import { TagsService } from '@modules/tags/service/tags.service';
import { TagsRepository } from '@modules/tags/repository/tags.repository';
import { TagMapper } from '@modules/tags/mapper/tag.mapper';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService, TagsRepository, TagMapper],
  exports: [TagsService],
})
export class TagsModule {}
