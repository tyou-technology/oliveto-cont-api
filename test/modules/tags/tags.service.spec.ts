import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@modules/prisma/prisma.service';
import { TagsService } from '@modules/tags/tags.service';
import { CreateTagDto } from '@modules/tags/dto/create-tag.dto';
import { UpdateTagDto } from '@modules/tags/dto/update-tag.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTag = {
  id: 'tag_cuid_1',
  name: 'contabilidade',
  description: 'Artigos sobre contabilidade empresarial.',
  color: '#4CAF50',
  icon: 'calculator',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockTag2 = {
  id: 'tag_cuid_2',
  name: 'imposto',
  description: 'Artigos sobre impostos e tributação.',
  color: '#F44336',
  icon: 'receipt',
  createdAt: new Date('2026-01-02'),
  updatedAt: new Date('2026-01-02'),
};

const prismaP2002 = () =>
  Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: ['name'] } });

const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });

const dbError = () => new Error('Connection refused');

const mockPrisma = {
  tag: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TagsService>(TagsService);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto: CreateTagDto = {
      name: 'contabilidade',
      description: 'Artigos sobre contabilidade empresarial.',
      color: '#4CAF50',
      icon: 'calculator',
    };

    it('should create and return the new tag', async () => {
      mockPrisma.tag.create.mockResolvedValue(mockTag);

      const result = await service.create(createDto);

      expect(mockPrisma.tag.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTag);
    });

    it('should persist the name, description, color, and icon fields', async () => {
      mockPrisma.tag.create.mockResolvedValue(mockTag);

      await service.create(createDto);

      const callArg = mockPrisma.tag.create.mock.calls[0][0];
      expect(callArg.data.name).toBe('contabilidade');
      expect(callArg.data.description).toBe('Artigos sobre contabilidade empresarial.');
      expect(callArg.data.color).toBe('#4CAF50');
      expect(callArg.data.icon).toBe('calculator');
    });

    it('should create a tag with only name when optional fields are omitted', async () => {
      const minimalDto: CreateTagDto = { name: 'tributacao' };
      mockPrisma.tag.create.mockResolvedValue({
        ...mockTag,
        name: 'tributacao',
        description: null,
        color: null,
        icon: null,
      });

      const result = await service.create(minimalDto);

      expect(mockPrisma.tag.create).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('tributacao');
    });

    it('should throw ConflictException when a tag with the same name already exists', async () => {
      mockPrisma.tag.create.mockRejectedValue(prismaP2002());

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate non-P2002 database errors', async () => {
      mockPrisma.tag.create.mockRejectedValue(dbError());

      await expect(service.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the tag when the id exists', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.findById('tag_cuid_1');

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.tag.findUnique.mockRejectedValue(dbError());

      await expect(service.findById('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all tags', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag, mockTag2]);

      const result = await service.findAll();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockTag, mockTag2]);
    });

    it('should return an empty array when no tags exist', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should order tags by name ascending', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag, mockTag2]);

      await service.findAll();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should propagate database errors', async () => {
      mockPrisma.tag.findMany.mockRejectedValue(dbError());

      await expect(service.findAll()).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the tag with the changed fields', async () => {
      const dto: UpdateTagDto = { name: 'contabilidade-avancada' };
      const updated = { ...mockTag, name: 'contabilidade-avancada' };
      mockPrisma.tag.update.mockResolvedValue(updated);

      const result = await service.update('tag_cuid_1', dto);

      expect(mockPrisma.tag.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result.name).toBe('contabilidade-avancada');
    });

    it('should update the description field', async () => {
      const dto: UpdateTagDto = { description: 'Nova descrição detalhada.' };
      mockPrisma.tag.update.mockResolvedValue({ ...mockTag, description: dto.description });

      await service.update('tag_cuid_1', dto);

      const callArg = mockPrisma.tag.update.mock.calls[0][0];
      expect(callArg.data.description).toBe('Nova descrição detalhada.');
    });

    it('should update the color field', async () => {
      const dto: UpdateTagDto = { color: '#2196F3' };
      mockPrisma.tag.update.mockResolvedValue({ ...mockTag, color: '#2196F3' });

      await service.update('tag_cuid_1', dto);

      const callArg = mockPrisma.tag.update.mock.calls[0][0];
      expect(callArg.data.color).toBe('#2196F3');
    });

    it('should update the icon field', async () => {
      const dto: UpdateTagDto = { icon: 'chart-bar' };
      mockPrisma.tag.update.mockResolvedValue({ ...mockTag, icon: 'chart-bar' });

      await service.update('tag_cuid_1', dto);

      const callArg = mockPrisma.tag.update.mock.calls[0][0];
      expect(callArg.data.icon).toBe('chart-bar');
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockPrisma.tag.update.mockRejectedValue(prismaP2025());

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when the new name is already taken by another tag', async () => {
      mockPrisma.tag.update.mockRejectedValue(prismaP2002());

      await expect(service.update('tag_cuid_1', { name: 'imposto' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate non-P2002/P2025 database errors', async () => {
      mockPrisma.tag.update.mockRejectedValue(dbError());

      await expect(service.update('tag_cuid_1', { name: 'X' })).rejects.toThrow('Connection refused');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the tag and return the deleted record', async () => {
      mockPrisma.tag.delete.mockResolvedValue(mockTag);

      const result = await service.delete('tag_cuid_1');

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockPrisma.tag.delete.mockRejectedValue(prismaP2025());

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.tag.delete.mockRejectedValue(dbError());

      await expect(service.delete('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });
});
