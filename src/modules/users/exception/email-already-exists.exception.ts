import { ConflictException } from '@nestjs/common';
import { USER_ERROR_MESSAGES } from '@modules/users/constants/users.constants';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super(USER_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
  }
}
