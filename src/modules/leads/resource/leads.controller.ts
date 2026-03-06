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
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { Role } from '@common/types/enums';
import { ROUTES } from '@common/constants/routes';
import { LeadsService } from '@modules/leads/service/leads.service';
import { CreateLeadDto } from '@modules/leads/dto/create-lead.dto';
import { UpdateLeadStatusDto } from '@modules/leads/dto/update-lead-status.dto';
import { UpdateLeadNotesDto } from '@modules/leads/dto/update-lead-notes.dto';
import { LeadQueryDto } from '@modules/leads/dto/lead-query.dto';

@ApiTags('Leads')
@Controller(ROUTES.LEADS.BASE)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createLead(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  listLeads(@Query() query: LeadQueryDto) {
    return this.leadsService.list(query);
  }

  @Roles(Role.ADMIN)
  @Get(ROUTES.LEADS.BY_ID)
  findLead(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Roles(Role.ADMIN)
  @Patch(ROUTES.LEADS.STATUS)
  updateLeadStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leadsService.updateStatus(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(ROUTES.LEADS.NOTES)
  updateLeadNotes(@Param('id') id: string, @Body() dto: UpdateLeadNotesDto) {
    return this.leadsService.addNotes(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(ROUTES.LEADS.READ)
  markLeadAsRead(@Param('id') id: string) {
    return this.leadsService.markAsRead(id);
  }
}
