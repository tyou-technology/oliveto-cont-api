import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LeadStatus, LeadOrigin } from '@common/types/enums';
import { LeadsController } from '@modules/leads/leads.controller';
import { LeadsService } from '@modules/leads/leads.service';
import { CreateLeadDto } from '@modules/leads/dto/create-lead.dto';
import { UpdateLeadStatusDto } from '@modules/leads/dto/update-lead-status.dto';
import { UpdateLeadNotesDto } from '@modules/leads/dto/update-lead-notes.dto';
import { LeadQueryDto } from '@modules/leads/dto/lead-query.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockLead = {
  id: 'lead_cuid_1',
  name: 'Carlos Mendes',
  email: 'carlos@empresa.com.br',
  phone: '+55 11 91234-5678',
  company: 'Mendes & Filhos Ltda',
  service: 'company_formation',
  message: 'Gostaria de abrir uma empresa e precisamos de ajuda com a contabilidade.',
  origin: LeadOrigin.CONTACT_FORM,
  status: LeadStatus.NEW,
  isRead: false,
  notes: null,
  contactedAt: null,
  createdAt: new Date('2026-01-10'),
  updatedAt: new Date('2026-01-10'),
};

const mockLead2 = {
  id: 'lead_cuid_2',
  name: 'Ana Lima',
  email: 'ana@lima.com.br',
  phone: null,
  company: null,
  service: 'tax_filing',
  message: 'Preciso de ajuda com minha declaração de imposto de renda.',
  origin: LeadOrigin.NEWSLETTER,
  status: LeadStatus.CONTACTED,
  isRead: true,
  notes: 'Ligou no dia 12/01. Reunião agendada para 20/01.',
  contactedAt: new Date('2026-01-12'),
  createdAt: new Date('2026-01-11'),
  updatedAt: new Date('2026-01-12'),
};

const paginatedResult = {
  data: [mockLead, mockLead2],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

const mockLeadsService = {
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  addNotes: jest.fn(),
  markAsRead: jest.fn(),
  list: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LeadsController', () => {
  let controller: LeadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [{ provide: LeadsService, useValue: mockLeadsService }],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    jest.clearAllMocks();
  });

  // ── POST /leads ─────────────────────────────────────────────────────────────

  describe('createLead()', () => {
    const createDto: CreateLeadDto = {
      name: 'Carlos Mendes',
      email: 'carlos@empresa.com.br',
      phone: '+55 11 91234-5678',
      company: 'Mendes & Filhos Ltda',
      service: 'company_formation',
      message: 'Gostaria de abrir uma empresa e precisamos de ajuda com a contabilidade.',
      origin: LeadOrigin.CONTACT_FORM,
    };

    it('should create and return the new lead with _links', async () => {
      mockLeadsService.create.mockResolvedValue(mockLead);

      const result = await controller.createLead(createDto);

      expect(mockLeadsService.create).toHaveBeenCalledWith(createDto);
      expect(result.data).toEqual(mockLead);
      expect(result._links.self).toBeDefined();
      expect(result._links.status).toBeDefined();
      expect(result._links.notes).toBeDefined();
      expect(result._links.read).toBeDefined();
    });

    it('should create a lead with only required fields when optional fields are omitted', async () => {
      const minimalDto: CreateLeadDto = {
        name: 'João Silva',
        email: 'joao@silva.com.br',
        origin: LeadOrigin.NEWSLETTER,
      };
      mockLeadsService.create.mockResolvedValue({
        ...mockLead,
        ...minimalDto,
        phone: null,
        company: null,
        message: null,
      });

      const result = await controller.createLead(minimalDto);

      expect(mockLeadsService.create).toHaveBeenCalledWith(minimalDto);
      expect(result.data.phone).toBeNull();
    });

    it('should return the lead with isRead false and status NEW', async () => {
      mockLeadsService.create.mockResolvedValue(mockLead);

      const result = await controller.createLead(createDto);

      expect(result.data.isRead).toBe(false);
      expect(result.data.status).toBe(LeadStatus.NEW);
    });

    it('should propagate service errors', async () => {
      mockLeadsService.create.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.createLead(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── GET /leads ──────────────────────────────────────────────────────────────

  describe('listLeads()', () => {
    const query: LeadQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of leads with _links', async () => {
      mockLeadsService.list.mockResolvedValue(paginatedResult);

      const result = await controller.listLeads(query);

      expect(mockLeadsService.list).toHaveBeenCalledWith(query);
      expect(result).toMatchObject(paginatedResult);
      expect(result._links.self).toBeDefined();
    });

    it('should pass status filter to the service', async () => {
      const filteredQuery: LeadQueryDto = { ...query, status: LeadStatus.NEW };
      mockLeadsService.list.mockResolvedValue(paginatedResult);

      await controller.listLeads(filteredQuery);

      expect(mockLeadsService.list).toHaveBeenCalledWith(filteredQuery);
    });

    it('should pass origin filter to the service', async () => {
      const filteredQuery: LeadQueryDto = { ...query, origin: LeadOrigin.CONTACT_FORM };
      mockLeadsService.list.mockResolvedValue(paginatedResult);

      await controller.listLeads(filteredQuery);

      expect(mockLeadsService.list).toHaveBeenCalledWith(filteredQuery);
    });

    it('should pass isRead filter to the service', async () => {
      const unreadQuery: LeadQueryDto = { ...query, isRead: false };
      mockLeadsService.list.mockResolvedValue({ data: [mockLead], meta: { total: 1 } });

      await controller.listLeads(unreadQuery);

      expect(mockLeadsService.list).toHaveBeenCalledWith(unreadQuery);
    });

    it('should return empty results when no leads match the filters', async () => {
      mockLeadsService.list.mockResolvedValue({ data: [], meta: { total: 0, totalPages: 0 } });

      const result = await controller.listLeads(query);

      expect(result.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockLeadsService.list.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.listLeads(query)).rejects.toThrow('Connection refused');
    });
  });

  // ── GET /leads/:id ──────────────────────────────────────────────────────────

  describe('findLead()', () => {
    it('should return the lead with _links when the id exists', async () => {
      mockLeadsService.findById.mockResolvedValue(mockLead);

      const result = await controller.findLead('lead_cuid_1');

      expect(mockLeadsService.findById).toHaveBeenCalledWith('lead_cuid_1');
      expect(result.data).toEqual(mockLead);
      expect(result._links.self).toBeDefined();
      expect(result._links.status).toBeDefined();
      expect(result._links.notes).toBeDefined();
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockLeadsService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findLead('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return the full lead shape including notes, origin, and isRead', async () => {
      mockLeadsService.findById.mockResolvedValue(mockLead2);

      const result = await controller.findLead('lead_cuid_2');

      expect(result.data).toHaveProperty('notes');
      expect(result.data).toHaveProperty('origin');
      expect(result.data).toHaveProperty('isRead');
      expect(result.data).toHaveProperty('contactedAt');
    });

    it('should propagate service errors', async () => {
      mockLeadsService.findById.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.findLead('lead_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /leads/:id/status ──────────────────────────────────────────────────

  describe('updateLeadStatus()', () => {
    const statusDto: UpdateLeadStatusDto = { status: LeadStatus.CONTACTED };

    it('should update the lead status and return the updated record with _links', async () => {
      const updated = { ...mockLead, status: LeadStatus.CONTACTED, contactedAt: new Date() };
      mockLeadsService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateLeadStatus('lead_cuid_1', statusDto);

      expect(mockLeadsService.updateStatus).toHaveBeenCalledWith('lead_cuid_1', statusDto);
      expect(result.data.status).toBe(LeadStatus.CONTACTED);
      expect(result._links.self).toBeDefined();
    });

    it('should reflect contactedAt in the response when transitioning to CONTACTED', async () => {
      const updated = { ...mockLead, status: LeadStatus.CONTACTED, contactedAt: new Date() };
      mockLeadsService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateLeadStatus('lead_cuid_1', statusDto);

      expect(result.data.contactedAt).toBeInstanceOf(Date);
    });

    it('should update to QUALIFIED status', async () => {
      const dto: UpdateLeadStatusDto = { status: LeadStatus.QUALIFIED };
      mockLeadsService.updateStatus.mockResolvedValue({ ...mockLead2, status: LeadStatus.QUALIFIED });

      const result = await controller.updateLeadStatus('lead_cuid_2', dto);

      expect(result.data.status).toBe(LeadStatus.QUALIFIED);
    });

    it('should update to CONVERTED status', async () => {
      const dto: UpdateLeadStatusDto = { status: LeadStatus.CONVERTED };
      mockLeadsService.updateStatus.mockResolvedValue({ ...mockLead2, status: LeadStatus.CONVERTED });

      const result = await controller.updateLeadStatus('lead_cuid_2', dto);

      expect(result.data.status).toBe(LeadStatus.CONVERTED);
    });

    it('should update to LOST status', async () => {
      const dto: UpdateLeadStatusDto = { status: LeadStatus.LOST };
      mockLeadsService.updateStatus.mockResolvedValue({ ...mockLead, status: LeadStatus.LOST });

      const result = await controller.updateLeadStatus('lead_cuid_1', dto);

      expect(result.data.status).toBe(LeadStatus.LOST);
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockLeadsService.updateStatus.mockRejectedValue(new NotFoundException());

      await expect(controller.updateLeadStatus('nonexistent', statusDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate service errors', async () => {
      mockLeadsService.updateStatus.mockRejectedValue(new Error('Connection refused'));

      await expect(
        controller.updateLeadStatus('lead_cuid_1', statusDto),
      ).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /leads/:id/notes ───────────────────────────────────────────────────

  describe('updateLeadNotes()', () => {
    const notesDto: UpdateLeadNotesDto = { notes: 'Ligou no dia 12/01. Reunião agendada.' };

    it('should set notes on the lead and return the updated record with _links', async () => {
      const updated = { ...mockLead, notes: notesDto.notes };
      mockLeadsService.addNotes.mockResolvedValue(updated);

      const result = await controller.updateLeadNotes('lead_cuid_1', notesDto);

      expect(mockLeadsService.addNotes).toHaveBeenCalledWith('lead_cuid_1', notesDto);
      expect(result.data.notes).toBe('Ligou no dia 12/01. Reunião agendada.');
      expect(result._links.self).toBeDefined();
    });

    it('should allow overwriting existing notes with new content', async () => {
      const newNotesDto: UpdateLeadNotesDto = { notes: 'Nota atualizada em 20/01.' };
      mockLeadsService.addNotes.mockResolvedValue({ ...mockLead2, notes: newNotesDto.notes });

      const result = await controller.updateLeadNotes('lead_cuid_2', newNotesDto);

      expect(result.data.notes).toBe('Nota atualizada em 20/01.');
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockLeadsService.addNotes.mockRejectedValue(new NotFoundException());

      await expect(controller.updateLeadNotes('nonexistent', notesDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate service errors', async () => {
      mockLeadsService.addNotes.mockRejectedValue(new Error('Connection refused'));

      await expect(
        controller.updateLeadNotes('lead_cuid_1', notesDto),
      ).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /leads/:id/read ────────────────────────────────────────────────────

  describe('markLeadAsRead()', () => {
    it('should mark the lead as read and return the updated record with _links', async () => {
      const updated = { ...mockLead, isRead: true };
      mockLeadsService.markAsRead.mockResolvedValue(updated);

      const result = await controller.markLeadAsRead('lead_cuid_1');

      expect(mockLeadsService.markAsRead).toHaveBeenCalledWith('lead_cuid_1');
      expect(result.data.isRead).toBe(true);
      expect(result._links.self).toBeDefined();
    });

    it('should be idempotent — calling on an already-read lead returns it unchanged', async () => {
      mockLeadsService.markAsRead.mockResolvedValue(mockLead2); // already isRead: true

      const result = await controller.markLeadAsRead('lead_cuid_2');

      expect(result.data.isRead).toBe(true);
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockLeadsService.markAsRead.mockRejectedValue(new NotFoundException());

      await expect(controller.markLeadAsRead('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockLeadsService.markAsRead.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.markLeadAsRead('lead_cuid_1')).rejects.toThrow('Connection refused');
    });
  });
});
