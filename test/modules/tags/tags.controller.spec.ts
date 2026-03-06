import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from '@modules/tags/tags.controller';
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

const mockTagsService = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TagsController', () => {
  let controller: TagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: mockTagsService }],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    jest.clearAllMocks();
  });

  // ── GET /tags ───────────────────────────────────────────────────────────────

  describe('listTags()', () => {
    it('should return all tags with _links', async () => {
      mockTagsService.findAll.mockResolvedValue([mockTag, mockTag2]);

      const result = await controller.listTags();

      expect(mockTagsService.findAll).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual([mockTag, mockTag2]);
      expect(result._links.self).toBeDefined();
    });

    it('should return an empty data array when no tags exist', async () => {
      mockTagsService.findAll.mockResolvedValue([]);

      const result = await controller.listTags();

      expect(result.data).toEqual([]);
    });

    it('should return the complete tag shape including name, description, color, and icon', async () => {
      mockTagsService.findAll.mockResolvedValue([mockTag]);

      const result = await controller.listTags();

      const tag = result.data[0];
      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('description');
      expect(tag).toHaveProperty('color');
      expect(tag).toHaveProperty('icon');
    });

    it('should propagate service errors', async () => {
      mockTagsService.findAll.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.listTags()).rejects.toThrow('Connection refused');
    });
  });

  // ── GET /tags/:id ───────────────────────────────────────────────────────────

  describe('findTag()', () => {
    it('should return the tag with _links when the id exists', async () => {
      mockTagsService.findById.mockResolvedValue(mockTag);

      const result = await controller.findTag('tag_cuid_1');

      expect(mockTagsService.findById).toHaveBeenCalledWith('tag_cuid_1');
      expect(result.data).toEqual(mockTag);
      expect(result._links.self).toBeDefined();
      expect(result._links.collection).toBeDefined();
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockTagsService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findTag('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockTagsService.findById.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.findTag('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── POST /tags ──────────────────────────────────────────────────────────────

  describe('createTag()', () => {
    const createDto: CreateTagDto = {
      name: 'contabilidade',
      description: 'Artigos sobre contabilidade empresarial.',
      color: '#4CAF50',
      icon: 'calculator',
    };

    it('should create and return the new tag with _links', async () => {
      mockTagsService.create.mockResolvedValue(mockTag);

      const result = await controller.createTag(createDto);

      expect(mockTagsService.create).toHaveBeenCalledWith(createDto);
      expect(result.data).toEqual(mockTag);
      expect(result._links.self).toBeDefined();
      expect(result._links.collection).toBeDefined();
    });

    it('should create a tag with only name when optional fields are omitted', async () => {
      const minimalDto: CreateTagDto = { name: 'tributacao' };
      const minimalTag = { ...mockTag, name: 'tributacao', description: null, color: null, icon: null };
      mockTagsService.create.mockResolvedValue(minimalTag);

      const result = await controller.createTag(minimalDto);

      expect(mockTagsService.create).toHaveBeenCalledWith(minimalDto);
      expect(result.data.name).toBe('tributacao');
    });

    it('should throw ConflictException when the tag name is already taken', async () => {
      mockTagsService.create.mockRejectedValue(new ConflictException('Tag name already exists'));

      await expect(controller.createTag(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate service errors', async () => {
      mockTagsService.create.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.createTag(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /tags/:id ─────────────────────────────────────────────────────────

  describe('updateTag()', () => {
    it('should update and return the tag with the changed name and _links', async () => {
      const dto: UpdateTagDto = { name: 'contabilidade-avancada' };
      const updated = { ...mockTag, name: 'contabilidade-avancada' };
      mockTagsService.update.mockResolvedValue(updated);

      const result = await controller.updateTag('tag_cuid_1', dto);

      expect(mockTagsService.update).toHaveBeenCalledWith('tag_cuid_1', dto);
      expect(result.data.name).toBe('contabilidade-avancada');
      expect(result._links.self).toBeDefined();
    });

    it('should update the description field', async () => {
      const dto: UpdateTagDto = { description: 'Descrição revisada.' };
      mockTagsService.update.mockResolvedValue({ ...mockTag, description: 'Descrição revisada.' });

      const result = await controller.updateTag('tag_cuid_1', dto);

      expect(result.data.description).toBe('Descrição revisada.');
    });

    it('should update the color field', async () => {
      const dto: UpdateTagDto = { color: '#2196F3' };
      mockTagsService.update.mockResolvedValue({ ...mockTag, color: '#2196F3' });

      const result = await controller.updateTag('tag_cuid_1', dto);

      expect(result.data.color).toBe('#2196F3');
    });

    it('should update the icon field', async () => {
      const dto: UpdateTagDto = { icon: 'chart-bar' };
      mockTagsService.update.mockResolvedValue({ ...mockTag, icon: 'chart-bar' });

      const result = await controller.updateTag('tag_cuid_1', dto);

      expect(result.data.icon).toBe('chart-bar');
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockTagsService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.updateTag('nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when the new name is already taken', async () => {
      mockTagsService.update.mockRejectedValue(new ConflictException('Tag name already exists'));

      await expect(controller.updateTag('tag_cuid_1', { name: 'imposto' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate service errors', async () => {
      mockTagsService.update.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.updateTag('tag_cuid_1', { name: 'X' })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── DELETE /tags/:id ────────────────────────────────────────────────────────

  describe('deleteTag()', () => {
    it('should delete the tag and return no content (204)', async () => {
      mockTagsService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteTag('tag_cuid_1');

      expect(mockTagsService.delete).toHaveBeenCalledWith('tag_cuid_1');
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the tag does not exist', async () => {
      mockTagsService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteTag('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockTagsService.delete.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.deleteTag('tag_cuid_1')).rejects.toThrow('Connection refused');
    });
  });
});
