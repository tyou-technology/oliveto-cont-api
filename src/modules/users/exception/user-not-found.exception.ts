import { NotFoundException } from '@nestjs/common';
import { USER_ERROR_MESSAGES } from '@modules/users/constants/users.constants';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super(USER_ERROR_MESSAGES.USER_NOT_FOUND);
  }
}
