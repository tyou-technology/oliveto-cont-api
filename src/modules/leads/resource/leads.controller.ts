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
  createLead(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @ApiOperation({ summary: 'List all leads with optional filters (Admin only)' })
  @ApiOkResponse({ description: 'Paginated lead list' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get()
  listLeads(@Query() query: LeadQueryDto) {
    return this.leadsService.list(query);
  }

  @ApiOperation({ summary: 'Get lead detail by ID (Admin only)' })
  @ApiOkResponse({ description: 'Lead detail', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get(LEADS_ROUTES.BY_ID)
  findLead(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @ApiOperation({ summary: 'Update lead status (Admin only)' })
  @ApiOkResponse({ description: 'Lead status updated', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.STATUS)
  updateLeadStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto);
  }

  @ApiOperation({ summary: 'Add or update internal notes on a lead (Admin only)' })
  @ApiOkResponse({ description: 'Lead notes updated', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.NOTES)
  updateLeadNotes(@Param('id') id: string, @Body() dto: UpdateLeadNotesDto) {
    return this.leadsService.addNotes(id, dto);
  }

  @ApiOperation({ summary: 'Mark a lead as read (Admin only)' })
  @ApiOkResponse({ description: 'Lead marked as read', type: LeadEntity })
  @ApiNotFoundResponse({ description: 'Lead not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(LEADS_ROUTES.READ)
  markLeadAsRead(@Param('id') id: string) {
    return this.leadsService.markAsRead(id);
  }
}
