import { ConflictException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class TagNameAlreadyExistsException extends ConflictException {
  constructor() {
    super(ERROR_MESSAGES.TAG_NAME_ALREADY_EXISTS);
  }
}
