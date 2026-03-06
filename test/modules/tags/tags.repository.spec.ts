import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@modules/prisma/prisma.service';
import { TagsRepository } from '@modules/tags/repository/tags.repository';

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
  description: 'Artigos sobre impostos.',
  color: '#F44336',
  icon: 'receipt',
  createdAt: new Date('2026-01-02'),
  updatedAt: new Date('2026-01-02'),
};

const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });
const prismaP2002 = () =>
  Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target: ['name'] },
  });
const dbError = () => new Error('Connection refused');

const mockPrisma = {
  tag: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TagsRepository', () => {
  let repository: TagsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<TagsRepository>(TagsRepository);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto = {
      name: 'contabilidade',
      description: 'Artigos sobre contabilidade empresarial.',
      color: '#4CAF50',
      icon: 'calculator',
    };

    it('should create and return the tag', async () => {
      mockPrisma.tag.create.mockResolvedValue(mockTag);

      const result = await repository.create(createDto);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createDto }),
      );
      expect(result).toEqual(mockTag);
    });

    it('should throw ConflictException on P2002', async () => {
      mockPrisma.tag.create.mockRejectedValue(prismaP2002());

      await expect(repository.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate non-P2002 database errors', async () => {
      mockPrisma.tag.create.mockRejectedValue(dbError());

      await expect(repository.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the tag when the id exists', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      const result = await repository.findById('tag_cuid_1');

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(repository.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.tag.findUnique.mockRejectedValue(dbError());

      await expect(repository.findById('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all tags ordered by name', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag, mockTag2]);

      const result = await repository.findAll();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
      expect(result).toEqual([mockTag, mockTag2]);
    });

    it('should return an empty array when no tags exist', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockPrisma.tag.findMany.mockRejectedValue(dbError());

      await expect(repository.findAll()).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the tag', async () => {
      const updated = { ...mockTag, name: 'contabilidade-avancada' };
      mockPrisma.tag.update.mockResolvedValue(updated);

      const result = await repository.update('tag_cuid_1', { name: 'contabilidade-avancada' });

      expect(mockPrisma.tag.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result.name).toBe('contabilidade-avancada');
    });

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.tag.update.mockRejectedValue(prismaP2025());

      await expect(repository.update('nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on P2002', async () => {
      mockPrisma.tag.update.mockRejectedValue(prismaP2002());

      await expect(repository.update('tag_cuid_1', { name: 'imposto' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate non-P2025/P2002 database errors', async () => {
      mockPrisma.tag.update.mockRejectedValue(dbError());

      await expect(repository.update('tag_cuid_1', { name: 'X' })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete and return the deleted tag', async () => {
      mockPrisma.tag.delete.mockResolvedValue(mockTag);

      const result = await repository.delete('tag_cuid_1');

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tag_cuid_1' } }),
      );
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.tag.delete.mockRejectedValue(prismaP2025());

      await expect(repository.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.tag.delete.mockRejectedValue(dbError());

      await expect(repository.delete('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });
});
