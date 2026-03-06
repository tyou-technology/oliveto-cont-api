import { ConflictException } from '@nestjs/common';
import { TAG_ERROR_MESSAGES } from '@modules/tags/constants/tags.constants';

export class TagNameAlreadyExistsException extends ConflictException {
  constructor() {
    super(TAG_ERROR_MESSAGES.TAG_NAME_ALREADY_EXISTS);
  }
}
