import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class TagNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.TAG_NOT_FOUND);
  }
}
