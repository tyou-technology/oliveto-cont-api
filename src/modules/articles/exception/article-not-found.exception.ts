import { NotFoundException } from '@nestjs/common';
import { ARTICLE_ERROR_MESSAGES } from '@modules/articles/constants/articles.constants';

export class ArticleNotFoundException extends NotFoundException {
  constructor() {
    super(ARTICLE_ERROR_MESSAGES.ARTICLE_NOT_FOUND);
  }
}
