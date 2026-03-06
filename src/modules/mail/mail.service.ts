import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendNewLeadAlert(lead: Record<string, unknown>): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_NOTIFICATION_EMAIL');
    this.logger.log(`Sending new lead alert to ${adminEmail} for lead ${lead['id']}`);
  }

  async sendWelcomeEmail(user: Record<string, unknown>): Promise<void> {
    this.logger.log(`Sending welcome email to user ${user['id']}`);
  }
}
