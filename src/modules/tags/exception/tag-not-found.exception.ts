import { NotFoundException } from '@nestjs/common';
import { TAG_ERROR_MESSAGES } from '@modules/tags/constants/tags.constants';

export class TagNotFoundException extends NotFoundException {
  constructor() {
    super(TAG_ERROR_MESSAGES.TAG_NOT_FOUND);
  }
}
