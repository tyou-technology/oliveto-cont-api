import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class ArticleNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.ARTICLE_NOT_FOUND);
  }
}
