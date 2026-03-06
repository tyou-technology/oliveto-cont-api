import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus } from '@common/types/enums';
import { ArticlesRepository } from '@modules/articles/repository/articles.repository';
import { ArticlesService } from '@modules/articles/service/articles.service';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAuthor = {
  id: 'author_cuid_1',
  name: 'Jane Editor',
  avatarUrl: null,
};

const mockTag = {
  id: 'tag_cuid_1',
  name: 'contabilidade',
  description: 'Artigos sobre contabilidade empresarial.',
  color: '#4CAF50',
  icon: 'calculator',
};

const mockTag2 = {
  id: 'tag_cuid_2',
  name: 'imposto',
  description: 'Artigos sobre impostos e tributação.',
  color: '#F44336',
  icon: 'receipt',
};

const mockArticle = {
  id: 'article_cuid_1',
  title: 'Como abrir uma empresa no Brasil',
  slug: 'como-abrir-uma-empresa-no-brasil',
  briefing: 'Um guia completo para abertura de empresas.',
  content: 'Conteúdo completo do artigo em português.',
  readingTime: 5,
  visitsCount: 0,
  coverUrl: null,
  status: ArticleStatus.DRAFT,
  publishedAt: null,
  authorId: mockAuthor.id,
  author: mockAuthor,
  articleTags: [mockTag],
  seoTitle: null,
  seoDescription: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const publishedArticle = {
  ...mockArticle,
  id: 'article_cuid_2',
  slug: 'declaracao-de-imposto-de-renda',
  title: 'Declaração de Imposto de Renda',
  briefing: 'Tudo que você precisa saber sobre o IR.',
  readingTime: 8,
  visitsCount: 142,
  status: ArticleStatus.PUBLISHED,
  publishedAt: new Date('2026-01-15'),
  articleTags: [mockTag2],
};

const dbError = () => new Error('Connection refused');

const mockArticlesRepo = {
  findBySlug: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  publish: jest.fn(),
  archive: jest.fn(),
  delete: jest.fn(),
  findMany: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticlesService, { provide: ArticlesRepository, useValue: mockArticlesRepo }],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    jest.clearAllMocks();
  });

  // ── generateUniqueSlug ──────────────────────────────────────────────────────

  describe('generateUniqueSlug()', () => {
    it('should return a slugified version of the title when no collision exists', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Como Abrir Uma Empresa');

      expect(result).toBe('como-abrir-uma-empresa');
    });

    it('should append a numeric suffix when the base slug is already taken', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValueOnce(mockArticle).mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Como Abrir Uma Empresa no Brasil');

      expect(result).toMatch(/^como-abrir-uma-empresa-no-brasil-\d+$/);
    });

    it('should query the repository to check slug uniqueness', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);

      await service.generateUniqueSlug('Guia Tributário');

      expect(mockArticlesRepo.findBySlug).toHaveBeenCalledWith('guia-tributario');
    });

    it('should handle special characters and accents in the title', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Tributação: O Guia Completo!');

      expect(result).not.toMatch(/[^a-z0-9-]/);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should propagate unexpected database errors', async () => {
      mockArticlesRepo.findBySlug.mockRejectedValue(dbError());

      await expect(service.generateUniqueSlug('Any Title')).rejects.toThrow('Connection refused');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto: CreateArticleDto = {
      title: 'Como abrir uma empresa no Brasil',
      content: 'Conteúdo completo do artigo em português.',
      briefing: 'Um guia completo para abertura de empresas.',
      readingTime: 5,
      tagIds: [mockTag.id],
    };
    const authorId = mockAuthor.id;

    it('should create an article and return it with the author relation', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      const result = await service.create(createDto, authorId);

      expect(mockArticlesRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockArticle);
    });

    it('should generate and persist a unique slug derived from the title', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.slug).toBe('como-abrir-uma-empresa-no-brasil');
    });

    it('should default status to DRAFT on creation', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.status).toBe(ArticleStatus.DRAFT);
    });

    it('should associate the article with the provided authorId', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.authorId).toBe(authorId);
    });

    it('should connect the provided tag ids as articleTags relation', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      const dataStr = JSON.stringify(callArg);
      expect(dataStr).toContain(mockTag.id);
    });

    it('should create an article with no tags when tagIds is not provided', async () => {
      const dtoWithoutTags: CreateArticleDto = {
        title: 'Artigo Simples',
        content: 'Conteúdo.',
        readingTime: 1,
      };
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await service.create(dtoWithoutTags, authorId);

      expect(result.articleTags).toEqual([]);
    });

    it('should persist the readingTime provided in the DTO', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.readingTime).toBe(5);
    });

    it('should initialise visitsCount to 0 on creation', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.visitsCount).toBe(0);
    });

    it('should not set publishedAt on creation', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.publishedAt).toBeUndefined();
    });

    it('should persist optional SEO fields when provided', async () => {
      const dtoWithSeo: CreateArticleDto = {
        ...createDto,
        seoTitle: 'SEO Title Custom',
        seoDescription: 'Descrição para motores de busca.',
      };
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue({ ...mockArticle, ...dtoWithSeo });

      await service.create(dtoWithSeo, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.seoTitle).toBe('SEO Title Custom');
      expect(callArg.seoDescription).toBe('Descrição para motores de busca.');
    });

    it('should persist the briefing field when provided', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockArticlesRepo.create.mock.calls[0][0];
      expect(callArg.briefing).toBe('Um guia completo para abertura de empresas.');
    });

    it('should propagate unexpected database errors', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);
      mockArticlesRepo.create.mockRejectedValue(dbError());

      await expect(service.create(createDto, authorId)).rejects.toThrow('Connection refused');
    });
  });

  // ── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the article with author and articleTags when the slug exists', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(publishedArticle);

      const result = await service.findBySlug('declaracao-de-imposto-de-renda');

      expect(mockArticlesRepo.findBySlug).toHaveBeenCalledWith('declaracao-de-imposto-de-renda');
      expect(result).toEqual(publishedArticle);
    });

    it('should throw NotFoundException when the slug does not exist', async () => {
      mockArticlesRepo.findBySlug.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent-slug')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockArticlesRepo.findBySlug.mockRejectedValue(dbError());

      await expect(service.findBySlug('any-slug')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the article when the id exists', async () => {
      mockArticlesRepo.findById.mockResolvedValue(mockArticle);

      const result = await service.findById('article_cuid_1');

      expect(mockArticlesRepo.findById).toHaveBeenCalledWith('article_cuid_1');
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockArticlesRepo.findById.mockRejectedValue(new NotFoundException());

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockArticlesRepo.findById.mockRejectedValue(dbError());

      await expect(service.findById('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the article with changed fields', async () => {
      const dto: UpdateArticleDto = { title: 'Novo Título Atualizado' };
      const updated = { ...mockArticle, title: 'Novo Título Atualizado' };
      mockArticlesRepo.update.mockResolvedValue(updated);

      const result = await service.update('article_cuid_1', dto);

      expect(mockArticlesRepo.update).toHaveBeenCalledWith(
        'article_cuid_1',
        expect.objectContaining({ title: 'Novo Título Atualizado' }),
      );
      expect(result.title).toBe('Novo Título Atualizado');
    });

    it('should regenerate the slug when the title changes', async () => {
      const dto: UpdateArticleDto = { title: 'Título Totalmente Novo' };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, title: dto.title });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      expect(callArg.slug).toBeDefined();
      expect(callArg.slug).toBe('titulo-totalmente-novo');
    });

    it('should not change the slug when the title is not updated', async () => {
      const dto: UpdateArticleDto = { briefing: 'Novo resumo.' };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, briefing: 'Novo resumo.' });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      expect(callArg.slug).toBeUndefined();
    });

    it('should update the briefing field', async () => {
      const dto: UpdateArticleDto = { briefing: 'Resumo atualizado.' };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, briefing: dto.briefing });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      expect(callArg.briefing).toBe('Resumo atualizado.');
    });

    it('should update the readingTime field', async () => {
      const dto: UpdateArticleDto = { readingTime: 12 };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, readingTime: 12 });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      expect(callArg.readingTime).toBe(12);
    });

    it('should reconnect articleTags when tagIds are provided', async () => {
      const dto: UpdateArticleDto = { tagIds: [mockTag2.id] };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, articleTags: [mockTag2] });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      const dataStr = JSON.stringify(callArg);
      expect(dataStr).toContain(mockTag2.id);
    });

    it('should disconnect all articleTags when an empty tagIds array is provided', async () => {
      const dto: UpdateArticleDto = { tagIds: [] };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await service.update('article_cuid_1', dto);

      expect(result.articleTags).toEqual([]);
    });

    it('should not modify articleTags when tagIds is not present in the DTO', async () => {
      const dto: UpdateArticleDto = { briefing: 'Somente o briefing muda.' };
      mockArticlesRepo.update.mockResolvedValue({ ...mockArticle, briefing: dto.briefing });

      await service.update('article_cuid_1', dto);

      const callArg = mockArticlesRepo.update.mock.calls[0][1];
      const dataStr = JSON.stringify(callArg);
      expect(dataStr).not.toContain('articleTags');
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesRepo.update.mockRejectedValue(new NotFoundException());

      await expect(service.update('nonexistent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockArticlesRepo.update.mockRejectedValue(dbError());

      await expect(service.update('article_cuid_1', { title: 'X' })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── publish ─────────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('should delegate to the repository and return the published article', async () => {
      const published = {
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      };
      mockArticlesRepo.publish.mockResolvedValue(published);

      const result = await service.publish('article_cuid_1');

      expect(mockArticlesRepo.publish).toHaveBeenCalledWith('article_cuid_1');
      expect(result.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesRepo.publish.mockRejectedValue(new NotFoundException());

      await expect(service.publish('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockArticlesRepo.publish.mockRejectedValue(dbError());

      await expect(service.publish('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── archive ─────────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('should delegate to the repository and return the archived article', async () => {
      const archived = { ...mockArticle, status: ArticleStatus.ARCHIVED };
      mockArticlesRepo.archive.mockResolvedValue(archived);

      const result = await service.archive('article_cuid_1');

      expect(mockArticlesRepo.archive).toHaveBeenCalledWith('article_cuid_1');
      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('should not reset publishedAt when archiving a previously published article', async () => {
      const archived = { ...publishedArticle, status: ArticleStatus.ARCHIVED };
      mockArticlesRepo.archive.mockResolvedValue(archived);

      const result = await service.archive('article_cuid_2');

      expect(result.publishedAt).toEqual(publishedArticle.publishedAt);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesRepo.archive.mockRejectedValue(new NotFoundException());

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockArticlesRepo.archive.mockRejectedValue(dbError());

      await expect(service.archive('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the article and return the deleted record', async () => {
      mockArticlesRepo.delete.mockResolvedValue(mockArticle);

      const result = await service.delete('article_cuid_1');

      expect(mockArticlesRepo.delete).toHaveBeenCalledWith('article_cuid_1');
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesRepo.delete.mockRejectedValue(new NotFoundException());

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockArticlesRepo.delete.mockRejectedValue(dbError());

      await expect(service.delete('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list()', () => {
    const baseQuery: ArticleQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of articles with meta', async () => {
      const articles = [publishedArticle, mockArticle];
      mockArticlesRepo.findMany.mockResolvedValue({ articles, total: 2 });

      const result = await service.list(baseQuery);

      expect(result).toEqual({
        data: articles,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('should return empty data and total 0 when no articles exist', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [], total: 0 });

      const result = await service.list(baseQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for multi-page results', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [publishedArticle], total: 25 });

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply correct skip/take for page 2', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [], total: 20 });

      await service.list({ page: 2, limit: 5 });

      expect(mockArticlesRepo.findMany).toHaveBeenCalledWith(expect.any(Object), 5, 5);
    });

    it('should filter by status when provided in the query', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [publishedArticle], total: 1 });

      await service.list({ ...baseQuery, status: ArticleStatus.PUBLISHED });

      expect(mockArticlesRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should filter articles by tagId through the articleTags relation', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [mockArticle], total: 1 });

      await service.list({ ...baseQuery, tagId: mockTag.id });

      const [where] = mockArticlesRepo.findMany.mock.calls[0];
      const whereStr = JSON.stringify(where);
      expect(whereStr).toContain(mockTag.id);
    });

    it('should perform a search across title, briefing, and content when search is provided', async () => {
      mockArticlesRepo.findMany.mockResolvedValue({ articles: [publishedArticle], total: 1 });

      await service.list({ ...baseQuery, search: 'imposto' });

      const [where] = mockArticlesRepo.findMany.mock.calls[0];
      const whereStr = JSON.stringify(where);
      expect(whereStr).toContain('imposto');
    });

    it('should propagate database errors', async () => {
      mockArticlesRepo.findMany.mockRejectedValue(dbError());

      await expect(service.list(baseQuery)).rejects.toThrow('Connection refused');
    });
  });
});
