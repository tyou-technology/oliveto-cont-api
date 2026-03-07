import { Injectable, Logger } from '@nestjs/common';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { LeadStatus } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { MailService } from '@modules/mail/mail.service';
import { CreateLeadDto } from '@modules/leads/dto/create-lead.dto';
import { UpdateLeadStatusDto } from '@modules/leads/dto/update-lead-status.dto';
import { UpdateLeadNotesDto } from '@modules/leads/dto/update-lead-notes.dto';
import { LeadQueryDto } from '@modules/leads/dto/lead-query.dto';
import { LeadNotFoundException } from '@modules/leads/exception/lead-not-found.exception';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        ...dto,
        status: LeadStatus.NEW,
        isRead: false,
      },
    });

    this.mailService.sendNewLeadAlert(lead).catch((err) => {
      this.logger.error('Failed to send new lead alert email', err);
    });

    return lead;
  }

  async findById(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new LeadNotFoundException();
    return lead;
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto) {
    const data: Record<string, unknown> = { status: dto.status };

    if (dto.status === LeadStatus.CONTACTED) {
      data.contactedAt = new Date();
    }

    try {
      return await this.prisma.lead.update({ where: { id }, data });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new LeadNotFoundException();
      throw err;
    }
  }

  async addNotes(id: string, dto: UpdateLeadNotesDto) {
    try {
      return await this.prisma.lead.update({
        where: { id },
        data: { notes: dto.notes },
      });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new LeadNotFoundException();
      throw err;
    }
  }

  async markAsRead(id: string) {
    try {
      return await this.prisma.lead.update({
        where: { id },
        data: { isRead: true },
      });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new LeadNotFoundException();
      throw err;
    }
  }

  async list(query: LeadQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status !== undefined) where.status = query.status;
    if (query.origin !== undefined) where.origin = query.origin;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async countUnread(): Promise<{ count: number }> {
    const count = await this.prisma.lead.count({ where: { isRead: false } });
    return { count };
  }
}
