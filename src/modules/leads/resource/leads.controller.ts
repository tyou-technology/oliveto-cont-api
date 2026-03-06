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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/types/enums';
import { LEADS_ROUTES } from '@modules/leads/constants/leads.constants';
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
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLead(@Body() dto: CreateLeadDto) {
    const lead = await this.leadsService.create(dto);
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

  @ApiOperation({ summary: 'List all leads with optional filters (Admin only)' })
  @ApiOkResponse({ description: 'Paginated lead list' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get()
  async listLeads(@Query() query: LeadQueryDto) {
    const result = await this.leadsService.list(query);
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
  async findLead(@Param('id') id: string) {
    const lead = await this.leadsService.findById(id);
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
  async updateLeadStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    const lead = await this.leadsService.updateStatus(id, dto);
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
  async updateLeadNotes(@Param('id') id: string, @Body() dto: UpdateLeadNotesDto) {
    const lead = await this.leadsService.addNotes(id, dto);
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
  async markLeadAsRead(@Param('id') id: string) {
    const lead = await this.leadsService.markAsRead(id);
    return {
      data: lead,
      _links: {
        self: { href: `/leads/${id}`, method: 'GET' },
        collection: { href: '/leads', method: 'GET' },
      },
    };
  }
}
