import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LeadStatus, LeadOrigin } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { MailService } from '@modules/mail/mail.service';
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

const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });

const dbError = () => new Error('Connection refused');

const mockPrisma = {
  lead: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockMailService = {
  sendNewLeadAlert: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto: CreateLeadDto = {
      name: 'Carlos Mendes',
      email: 'carlos@empresa.com.br',
      phone: '+55 11 91234-5678',
      company: 'Mendes & Filhos Ltda',
      service: 'company_formation',
      message: 'Gostaria de abrir uma empresa e precisamos de ajuda com a contabilidade.',
      origin: LeadOrigin.CONTACT_FORM,
    };

    it('should create and return the new lead', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      const result = await service.create(createDto);

      expect(mockPrisma.lead.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLead);
    });

    it('should persist all provided fields', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      await service.create(createDto);

      const callArg = mockPrisma.lead.create.mock.calls[0][0];
      expect(callArg.data.name).toBe('Carlos Mendes');
      expect(callArg.data.email).toBe('carlos@empresa.com.br');
      expect(callArg.data.phone).toBe('+55 11 91234-5678');
      expect(callArg.data.company).toBe('Mendes & Filhos Ltda');
      expect(callArg.data.service).toBe('company_formation');
      expect(callArg.data.message).toBe(
        'Gostaria de abrir uma empresa e precisamos de ajuda com a contabilidade.',
      );
      expect(callArg.data.origin).toBe(LeadOrigin.CONTACT_FORM);
    });

    it('should default status to NEW on creation', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      await service.create(createDto);

      const callArg = mockPrisma.lead.create.mock.calls[0][0];
      expect(callArg.data.status).toBe(LeadStatus.NEW);
    });

    it('should default isRead to false on creation', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      await service.create(createDto);

      const callArg = mockPrisma.lead.create.mock.calls[0][0];
      expect(callArg.data.isRead).toBe(false);
    });

    it('should create a lead with only required fields when optional fields are omitted', async () => {
      const minimalDto: CreateLeadDto = {
        name: 'João Silva',
        email: 'joao@silva.com.br',
        origin: LeadOrigin.NEWSLETTER,
      };
      mockPrisma.lead.create.mockResolvedValue({
        ...mockLead,
        ...minimalDto,
        phone: null,
        company: null,
        service: null,
        message: null,
      });
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      const result = await service.create(minimalDto);

      expect(result.phone).toBeNull();
      expect(result.company).toBeNull();
    });

    it('should trigger a new lead alert email after creation', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockResolvedValue(undefined);

      await service.create(createDto);

      expect(mockMailService.sendNewLeadAlert).toHaveBeenCalledWith(mockLead);
    });

    it('should return the created lead even when the email alert fails', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockRejectedValue(new Error('SMTP error'));

      const result = await service.create(createDto);

      expect(result).toEqual(mockLead);
    });

    it('should not throw when the email alert fails', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);
      mockMailService.sendNewLeadAlert.mockRejectedValue(new Error('SMTP error'));

      await expect(service.create(createDto)).resolves.not.toThrow();
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.lead.create.mockRejectedValue(dbError());

      await expect(service.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the lead when the id exists', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.findById('lead_cuid_1');

      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lead_cuid_1' } }),
      );
      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.lead.findUnique.mockRejectedValue(dbError());

      await expect(service.findById('lead_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('should update the lead status and return the updated record', async () => {
      const dto: UpdateLeadStatusDto = { status: LeadStatus.CONTACTED };
      const updated = { ...mockLead, status: LeadStatus.CONTACTED };
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.updateStatus('lead_cuid_1', dto);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead_cuid_1' },
          data: expect.objectContaining({ status: LeadStatus.CONTACTED }),
        }),
      );
      expect(result.status).toBe(LeadStatus.CONTACTED);
    });

    it('should set contactedAt when transitioning to CONTACTED for the first time', async () => {
      const dto: UpdateLeadStatusDto = { status: LeadStatus.CONTACTED };
      mockPrisma.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.CONTACTED,
        contactedAt: new Date(),
      });

      await service.updateStatus('lead_cuid_1', dto);

      const callArg = mockPrisma.lead.update.mock.calls[0][0];
      expect(callArg.data.contactedAt).toBeInstanceOf(Date);
    });

    it('should not override contactedAt when already set', async () => {
      const alreadyContacted = { ...mockLead2 }; // contactedAt is already set
      mockPrisma.lead.findUnique.mockResolvedValue(alreadyContacted);
      const dto: UpdateLeadStatusDto = { status: LeadStatus.QUALIFIED };
      mockPrisma.lead.update.mockResolvedValue({
        ...alreadyContacted,
        status: LeadStatus.QUALIFIED,
      });

      await service.updateStatus('lead_cuid_2', dto);

      const callArg = mockPrisma.lead.update.mock.calls[0][0];
      // contactedAt must not be overwritten once set
      expect(callArg.data.contactedAt).toBeUndefined();
    });

    it('should transition through all valid statuses', async () => {
      const statuses = [
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.CONVERTED,
        LeadStatus.LOST,
      ];

      for (const status of statuses) {
        mockPrisma.lead.update.mockResolvedValue({ ...mockLead, status });

        const result = await service.updateStatus('lead_cuid_1', { status });

        expect(result.status).toBe(status);
        jest.clearAllMocks();
      }
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockPrisma.lead.update.mockRejectedValue(prismaP2025());

      await expect(
        service.updateStatus('nonexistent', { status: LeadStatus.CONTACTED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.lead.update.mockRejectedValue(dbError());

      await expect(
        service.updateStatus('lead_cuid_1', { status: LeadStatus.CONTACTED }),
      ).rejects.toThrow('Connection refused');
    });
  });

  // ── addNotes ─────────────────────────────────────────────────────────────────

  describe('addNotes()', () => {
    it('should set notes on the lead and return the updated record', async () => {
      const dto: UpdateLeadNotesDto = { notes: 'Ligou no dia 12/01. Reunião agendada.' };
      const updated = { ...mockLead, notes: dto.notes };
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.addNotes('lead_cuid_1', dto);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead_cuid_1' },
          data: expect.objectContaining({ notes: dto.notes }),
        }),
      );
      expect(result.notes).toBe('Ligou no dia 12/01. Reunião agendada.');
    });

    it('should allow overwriting existing notes with new content', async () => {
      const dto: UpdateLeadNotesDto = { notes: 'Nota atualizada em 20/01.' };
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead2, notes: dto.notes });

      const result = await service.addNotes('lead_cuid_2', dto);

      expect(result.notes).toBe('Nota atualizada em 20/01.');
    });

    it('should allow clearing notes by passing an empty string', async () => {
      const dto: UpdateLeadNotesDto = { notes: '' };
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead2, notes: '' });

      const result = await service.addNotes('lead_cuid_2', dto);

      expect(result.notes).toBe('');
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockPrisma.lead.update.mockRejectedValue(prismaP2025());

      await expect(service.addNotes('nonexistent', { notes: 'Some notes.' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.lead.update.mockRejectedValue(dbError());

      await expect(service.addNotes('lead_cuid_1', { notes: 'Any note.' })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── markAsRead ───────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should set isRead to true and return the updated lead', async () => {
      const updated = { ...mockLead, isRead: true };
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.markAsRead('lead_cuid_1');

      expect(mockPrisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead_cuid_1' },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
      expect(result.isRead).toBe(true);
    });

    it('should be idempotent — marking an already-read lead does not throw', async () => {
      mockPrisma.lead.update.mockResolvedValue(mockLead2); // already isRead: true

      await expect(service.markAsRead('lead_cuid_2')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when the lead does not exist', async () => {
      mockPrisma.lead.update.mockRejectedValue(prismaP2025());

      await expect(service.markAsRead('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.lead.update.mockRejectedValue(dbError());

      await expect(service.markAsRead('lead_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list()', () => {
    const baseQuery: LeadQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of leads with meta', async () => {
      const leads = [mockLead, mockLead2];
      mockPrisma.lead.findMany.mockResolvedValue(leads);
      mockPrisma.lead.count.mockResolvedValue(2);

      const result = await service.list(baseQuery);

      expect(result).toEqual({
        data: leads,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('should return empty data and total 0 when no leads exist', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      const result = await service.list(baseQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for multi-page results', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead]);
      mockPrisma.lead.count.mockResolvedValue(25);

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply correct skip/take for page 2', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(20);

      await service.list({ page: 2, limit: 5 });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead]);
      mockPrisma.lead.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, status: LeadStatus.NEW });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: LeadStatus.NEW }),
        }),
      );
    });

    it('should filter by origin when provided', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead]);
      mockPrisma.lead.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, origin: LeadOrigin.CONTACT_FORM });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ origin: LeadOrigin.CONTACT_FORM }),
        }),
      );
    });

    it('should filter by isRead: false to show only unread leads', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead]);
      mockPrisma.lead.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, isRead: false });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('should filter by isRead: true to show only read leads', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead2]);
      mockPrisma.lead.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, isRead: true });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: true }),
        }),
      );
    });

    it('should combine status and origin filters when both are provided', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead]);
      mockPrisma.lead.count.mockResolvedValue(1);

      await service.list({
        ...baseQuery,
        status: LeadStatus.NEW,
        origin: LeadOrigin.CONTACT_FORM,
      });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LeadStatus.NEW,
            origin: LeadOrigin.CONTACT_FORM,
          }),
        }),
      );
    });

    it('should order leads by createdAt descending by default', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([mockLead2, mockLead]);
      mockPrisma.lead.count.mockResolvedValue(2);

      await service.list(baseQuery);

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ createdAt: 'desc' }),
        }),
      );
    });

    it('should propagate database errors', async () => {
      mockPrisma.lead.findMany.mockRejectedValue(dbError());

      await expect(service.list(baseQuery)).rejects.toThrow('Connection refused');
    });
  });

  // ── countUnread ───────────────────────────────────────────────────────────────

  describe('countUnread()', () => {
    it('should return the count of unread leads', async () => {
      mockPrisma.lead.count.mockResolvedValue(5);

      const result = await service.countUnread();

      expect(result).toEqual({ count: 5 });
    });

    it('should query only leads where isRead is false', async () => {
      mockPrisma.lead.count.mockResolvedValue(3);

      await service.countUnread();

      expect(mockPrisma.lead.count).toHaveBeenCalledWith({ where: { isRead: false } });
    });

    it('should return count of 0 when all leads are read', async () => {
      mockPrisma.lead.count.mockResolvedValue(0);

      const result = await service.countUnread();

      expect(result).toEqual({ count: 0 });
    });

    it('should propagate database errors', async () => {
      mockPrisma.lead.count.mockRejectedValue(dbError());

      await expect(service.countUnread()).rejects.toThrow('Connection refused');
    });
  });
});
