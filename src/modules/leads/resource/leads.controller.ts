import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/types/enums';
import { enrichEvent } from '@common/utils/enrich-event.util';
import { LEAD_ACTIONS, LEADS_ROUTES } from '@modules/leads/constants/leads.constants';
import { LeadEntity } from '@modules/leads/entity/lead.entity';
import { LeadsService } from '@modules/leads/service/leads.service';
import { CreateLeadDto } from '@modules/leads/dto/create-lead.dto';
import { UpdateLeadStatusDto } from '@modules/leads/dto/update-lead-status.dto';
import { UpdateLeadNotesDto } from '@modules/leads/dto/update-lead-notes.dto';
import { LeadQueryDto } from '@modules/leads/dto/lead-query.dto';

@ApiTags('Leads')
@Controller(LEADS_ROUTES.BASE)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @ApiOperation({ summary: 'Submit a lead from the website contact form (public)' })
  @ApiCreatedResponse({ description: 'Lead captured', type: LeadEntity })
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLead(@Body() dto: CreateLeadDto, @Req() req?: Request) {
    const lead = await this.leadsService.create(dto);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.CREATE,
        lead_id: lead.id,
        service_interest: lead.service,
        source: lead.origin,
        has_phone: !!lead.phone,
        message_length: lead.message?.length ?? 0,
      },
    });

    return {
      data: lead,
      _links: {
        self: { href: `/leads/${lead.id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
        status: { href: `/leads/${lead.id}/status`, method: 'PATCH' },
        notes: { href: `/leads/${lead.id}/notes`, method: 'PATCH' },
        read: { href: `/leads/${lead.id}/read`, method: 'PATCH' },
      },
    };
  }

  @ApiOperation({ summary: 'Count unread leads (Admin only)' })
  @ApiOkResponse({ description: 'Unread lead count' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get(LEADS_ROUTES.UNREAD_COUNT)
  async countUnreadLeads(@Req() req?: Request) {
    const result = await this.leadsService.countUnread();

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.COUNT_UNREAD,
        unread: result.count,
      },
    });

    return {
      data: result,
      _links: {
        self: { href: '/leads/unread/count', method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
      },
    };
  }

  @ApiOperation({ summary: 'List all leads with optional filters (Admin only)' })
  @ApiOkResponse({ description: 'Paginated lead list' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get()
  async listLeads(@Query() query: LeadQueryDto, @Req() req?: Request) {
    const result = await this.leadsService.list(query);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.LIST,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
      },
    });

    return {
      ...result,
      _links: {
        self: { href: '/leads', method: 'GET' },
      },
    };
  }

  @ApiOperation({ summary: 'Get lead detail by ID (Admin only)' })
  @ApiOkResponse({ description: 'Lead detail', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get(LEADS_ROUTES.BY_ID)
  async findLead(@Param('id') id: string, @Req() req?: Request) {
    const lead = await this.leadsService.findById(id);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.VIEW,
        lead_id: lead.id,
      },
    });

    return {
      data: lead,
      _links: {
        self: { href: `/leads/${id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
        status: { href: `/leads/${id}/status`, method: 'PATCH' },
        notes: { href: `/leads/${id}/notes`, method: 'PATCH' },
        read: { href: `/leads/${id}/read`, method: 'PATCH' },
      },
    };
  }

  @ApiOperation({ summary: 'Update lead status (Admin only)' })
  @ApiOkResponse({ description: 'Lead status updated', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.STATUS)
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @Req() req?: Request,
  ) {
    const lead = await this.leadsService.updateStatus(id, dto);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.UPDATE_STATUS,
        lead_id: lead.id,
        status: lead.status,
      },
    });

    return {
      data: lead,
      _links: {
        self: { href: `/leads/${id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
      },
    };
  }

  @ApiOperation({ summary: 'Add or update internal notes on a lead (Admin only)' })
  @ApiOkResponse({ description: 'Lead notes updated', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.NOTES)
  async updateLeadNotes(
    @Param('id') id: string,
    @Body() dto: UpdateLeadNotesDto,
    @Req() req?: Request,
  ) {
    const lead = await this.leadsService.addNotes(id, dto);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.ADD_NOTES,
        lead_id: lead.id,
      },
    });

    return {
      data: lead,
      _links: {
        self: { href: `/leads/${id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
      },
    };
  }

  @ApiOperation({ summary: 'Mark a lead as read (Admin only)' })
  @ApiOkResponse({ description: 'Lead marked as read', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.READ)
  async markLeadAsRead(@Param('id') id: string, @Req() req?: Request) {
    const lead = await this.leadsService.markAsRead(id);

    enrichEvent(req, {
      lead: {
        action: LEAD_ACTIONS.MARK_AS_READ,
        lead_id: lead.id,
      },
    });

    return {
      data: lead,
      _links: {
        self: { href: `/leads/${id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
      },
    };
  }
}
