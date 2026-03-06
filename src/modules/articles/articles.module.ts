import { Module } from '@nestjs/common';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { ArticlesController } from '@modules/articles/resource/articles.controller';
import { ArticlesService } from '@modules/articles/service/articles.service';
import { ArticlesRepository } from '@modules/articles/repository/articles.repository';
import { ArticleMapper } from '@modules/articles/mapper/article.mapper';

@Module({
  imports: [PrismaModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesRepository, ArticleMapper],
  exports: [ArticlesService],
})
export class ArticlesModule {}
