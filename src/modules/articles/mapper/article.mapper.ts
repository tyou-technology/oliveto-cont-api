import { Injectable } from '@nestjs/common';
import { ArticleEntity } from '@modules/articles/entity/article.entity';

@Injectable()
export class ArticleMapper {
  toResponse(article: Record<string, any>): ArticleEntity {
    return article as ArticleEntity;
  }
}
