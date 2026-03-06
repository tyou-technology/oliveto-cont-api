import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@common/constants/error-messages';

export class LeadNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.LEAD_NOT_FOUND);
  }
}
