import { Module } from '@nestjs/common';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { MailModule } from '@modules/mail/mail.module';
import { LeadsController } from '@modules/leads/resource/leads.controller';
import { LeadsService } from '@modules/leads/service/leads.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
