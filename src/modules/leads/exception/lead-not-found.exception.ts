import { NotFoundException } from '@nestjs/common';
import { LEAD_ERROR_MESSAGES } from '@modules/leads/constants/leads.constants';

export class LeadNotFoundException extends NotFoundException {
  constructor() {
    super(LEAD_ERROR_MESSAGES.LEAD_NOT_FOUND);
  }
}
