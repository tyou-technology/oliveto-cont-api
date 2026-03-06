import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TagsRepository } from '@modules/tags/repository/tags.repository';
import { TagsService } from '@modules/tags/service/tags.service';
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

const dbError = () => new Error('Connection refused');

const mockTagsRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, { provide: TagsRepository, useValue: mockTagsRepo }],
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
      mockTagsRepo.create.mockResolvedValue(mockTag);

      const result = await service.create(createDto);

      expect(mockTagsRepo.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockTag);
    });

    it('should create a tag with only name when optional fields are omitted', async () => {
      const minimalDto: CreateTagDto = { name: 'tributacao' };
      mockTagsRepo.create.mockResolvedValue({
        ...mockTag,
        name: 'tributacao',
        description: null,
        color: null,
        icon: null,
      });

      const result = await service.create(minimalDto);

      expect(result.name).toBe('tributacao');
    });

    it('should throw ConflictException when a tag with the same name already exists', async () => {
      mockTagsRepo.create.mockRejectedValue(new ConflictException('Tag name already exists'));

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate non-conflict database errors', async () => {
      mockTagsRepo.create.mockRejectedValue(dbError());

      await expect(service.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the tag when the id exists', async () => {
      mockTagsRepo.findById.mockResolvedValue(mockTag);

      const result = await service.findById('tag_cuid_1');

      expect(mockTagsRepo.findById).toHaveBeenCalledWith('tag_cuid_1');
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockTagsRepo.findById.mockRejectedValue(new NotFoundException());

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockTagsRepo.findById.mockRejectedValue(dbError());

      await expect(service.findById('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all tags', async () => {
      mockTagsRepo.findAll.mockResolvedValue([mockTag, mockTag2]);

      const result = await service.findAll();

      expect(mockTagsRepo.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockTag, mockTag2]);
    });

    it('should return an empty array when no tags exist', async () => {
      mockTagsRepo.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockTagsRepo.findAll.mockRejectedValue(dbError());

      await expect(service.findAll()).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the tag with the changed fields', async () => {
      const dto: UpdateTagDto = { name: 'contabilidade-avancada' };
      const updated = { ...mockTag, name: 'contabilidade-avancada' };
      mockTagsRepo.update.mockResolvedValue(updated);

      const result = await service.update('tag_cuid_1', dto);

      expect(mockTagsRepo.update).toHaveBeenCalledWith('tag_cuid_1', dto);
      expect(result.name).toBe('contabilidade-avancada');
    });

    it('should update the description field', async () => {
      const dto: UpdateTagDto = { description: 'Nova descrição detalhada.' };
      mockTagsRepo.update.mockResolvedValue({ ...mockTag, description: dto.description });

      await service.update('tag_cuid_1', dto);

      expect(mockTagsRepo.update).toHaveBeenCalledWith('tag_cuid_1', dto);
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockTagsRepo.update.mockRejectedValue(new NotFoundException());

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when the new name is already taken by another tag', async () => {
      mockTagsRepo.update.mockRejectedValue(new ConflictException('Tag name already exists'));

      await expect(service.update('tag_cuid_1', { name: 'imposto' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate non-conflict database errors', async () => {
      mockTagsRepo.update.mockRejectedValue(dbError());

      await expect(service.update('tag_cuid_1', { name: 'X' })).rejects.toThrow('Connection refused');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the tag and return the deleted record', async () => {
      mockTagsRepo.delete.mockResolvedValue(mockTag);

      const result = await service.delete('tag_cuid_1');

      expect(mockTagsRepo.delete).toHaveBeenCalledWith('tag_cuid_1');
      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockTagsRepo.delete.mockRejectedValue(new NotFoundException());

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockTagsRepo.delete.mockRejectedValue(dbError());

      await expect(service.delete('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });
});
