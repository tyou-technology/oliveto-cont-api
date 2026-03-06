import { Injectable } from '@nestjs/common';
import { ArticleEntity } from '@modules/articles/entity/article.entity';

@Injectable()
export class ArticleMapper {
  toResponse(article: ArticleEntity): ArticleEntity {
    return article;
  }
}
