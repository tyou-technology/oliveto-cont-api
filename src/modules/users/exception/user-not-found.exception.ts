import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.USER_NOT_FOUND);
  }
}
