import { ConflictException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
  }
}
