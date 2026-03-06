import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ArticlesService } from '@modules/articles/articles.service';
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

const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });

const dbError = () => new Error('Connection refused');

const mockPrisma = {
  article: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ArticlesService', () => {
  let service: ArticlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticlesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    jest.clearAllMocks();
  });

  // ── generateUniqueSlug ──────────────────────────────────────────────────────

  describe('generateUniqueSlug()', () => {
    it('should return a slugified version of the title when no collision exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Como Abrir Uma Empresa');

      expect(result).toBe('como-abrir-uma-empresa');
    });

    it('should append a numeric suffix when the base slug is already taken', async () => {
      mockPrisma.article.findUnique.mockResolvedValueOnce(mockArticle).mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Como Abrir Uma Empresa no Brasil');

      expect(result).toMatch(/^como-abrir-uma-empresa-no-brasil-\d+$/);
    });

    it('should query the database to check slug uniqueness', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await service.generateUniqueSlug('Guia Tributário');

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'guia-tributario' } }),
      );
    });

    it('should handle special characters and accents in the title', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      const result = await service.generateUniqueSlug('Tributação: O Guia Completo!');

      expect(result).not.toMatch(/[^a-z0-9-]/);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(dbError());

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
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      const result = await service.create(createDto, authorId);

      expect(mockPrisma.article.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockArticle);
    });

    it('should generate and persist a unique slug derived from the title', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.slug).toBe('como-abrir-uma-empresa-no-brasil');
    });

    it('should default status to DRAFT on creation', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.status).toBe(ArticleStatus.DRAFT);
    });

    it('should associate the article with the provided authorId', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.authorId).toBe(authorId);
    });

    it('should connect the provided tag ids as articleTags relation', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      const dataStr = JSON.stringify(callArg.data);
      expect(dataStr).toContain(mockTag.id);
    });

    it('should create an article with no tags when tagIds is not provided', async () => {
      const dtoWithoutTags: CreateArticleDto = {
        title: 'Artigo Simples',
        content: 'Conteúdo.',
        readingTime: 1,
      };
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await service.create(dtoWithoutTags, authorId);

      expect(result.articleTags).toEqual([]);
    });

    it('should persist the readingTime provided in the DTO', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.readingTime).toBe(5);
    });

    it('should initialise visitsCount to 0 on creation', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.visitsCount).toBe(0);
    });

    it('should not set publishedAt on creation', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.publishedAt).toBeUndefined();
    });

    it('should persist optional SEO fields when provided', async () => {
      const dtoWithSeo: CreateArticleDto = {
        ...createDto,
        seoTitle: 'SEO Title Custom',
        seoDescription: 'Descrição para motores de busca.',
      };
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ ...mockArticle, ...dtoWithSeo });

      await service.create(dtoWithSeo, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.seoTitle).toBe('SEO Title Custom');
      expect(callArg.data.seoDescription).toBe('Descrição para motores de busca.');
    });

    it('should persist the briefing field when provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.briefing).toBe('Um guia completo para abertura de empresas.');
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockRejectedValue(dbError());

      await expect(service.create(createDto, authorId)).rejects.toThrow('Connection refused');
    });
  });

  // ── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the article with author and articleTags when the slug exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      const result = await service.findBySlug('declaracao-de-imposto-de-renda');

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'declaracao-de-imposto-de-renda' } }),
      );
      expect(result).toEqual(publishedArticle);
    });

    it('should throw NotFoundException when the slug does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent-slug')).rejects.toThrow(NotFoundException);
    });

    it('should include the author relation in the query', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      await service.findBySlug('declaracao-de-imposto-de-renda');

      const callArg = mockPrisma.article.findUnique.mock.calls[0][0];
      expect(callArg.include?.author || callArg.select?.author).toBeTruthy();
    });

    it('should include the articleTags relation in the query', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      await service.findBySlug('declaracao-de-imposto-de-renda');

      const callArg = mockPrisma.article.findUnique.mock.calls[0][0];
      expect(callArg.include?.articleTags || callArg.select?.articleTags).toBeTruthy();
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(dbError());

      await expect(service.findBySlug('any-slug')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the article when the id exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.findById('article_cuid_1');

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(dbError());

      await expect(service.findById('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the article with changed fields', async () => {
      const dto: UpdateArticleDto = { title: 'Novo Título Atualizado' };
      const updated = { ...mockArticle, title: 'Novo Título Atualizado' };
      mockPrisma.article.update.mockResolvedValue(updated);

      const result = await service.update('article_cuid_1', dto);

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result.title).toBe('Novo Título Atualizado');
    });

    it('should regenerate the slug when the title changes', async () => {
      const dto: UpdateArticleDto = { title: 'Título Totalmente Novo' };
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, title: dto.title });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.slug).toBeDefined();
      expect(callArg.data.slug).toBe('titulo-totalmente-novo');
    });

    it('should not change the slug when the title is not updated', async () => {
      const dto: UpdateArticleDto = { briefing: 'Novo resumo.' };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, briefing: 'Novo resumo.' });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.slug).toBeUndefined();
    });

    it('should update the briefing field', async () => {
      const dto: UpdateArticleDto = { briefing: 'Resumo atualizado.' };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, briefing: dto.briefing });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.briefing).toBe('Resumo atualizado.');
    });

    it('should update the readingTime field', async () => {
      const dto: UpdateArticleDto = { readingTime: 12 };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, readingTime: 12 });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.readingTime).toBe(12);
    });

    it('should reconnect articleTags when tagIds are provided', async () => {
      const dto: UpdateArticleDto = { tagIds: [mockTag2.id] };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, articleTags: [mockTag2] });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      const dataStr = JSON.stringify(callArg.data);
      expect(dataStr).toContain(mockTag2.id);
    });

    it('should disconnect all articleTags when an empty tagIds array is provided', async () => {
      const dto: UpdateArticleDto = { tagIds: [] };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await service.update('article_cuid_1', dto);

      expect(result.articleTags).toEqual([]);
    });

    it('should not modify articleTags when tagIds is not present in the DTO', async () => {
      const dto: UpdateArticleDto = { briefing: 'Somente o briefing muda.' };
      mockPrisma.article.update.mockResolvedValue({ ...mockArticle, briefing: dto.briefing });

      await service.update('article_cuid_1', dto);

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      const dataStr = JSON.stringify(callArg.data);
      expect(dataStr).not.toContain('articleTags');
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(service.update('nonexistent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(service.update('article_cuid_1', { title: 'X' })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── publish ─────────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('should set status to PUBLISHED and record publishedAt', async () => {
      const published = {
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      };
      mockPrisma.article.update.mockResolvedValue(published);

      const result = await service.publish('article_cuid_1');

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'article_cuid_1' },
          data: expect.objectContaining({
            status: ArticleStatus.PUBLISHED,
            publishedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(service.publish('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(service.publish('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── archive ─────────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('should set status to ARCHIVED', async () => {
      const archived = { ...mockArticle, status: ArticleStatus.ARCHIVED };
      mockPrisma.article.update.mockResolvedValue(archived);

      const result = await service.archive('article_cuid_1');

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'article_cuid_1' },
          data: expect.objectContaining({ status: ArticleStatus.ARCHIVED }),
        }),
      );
      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('should not reset publishedAt when archiving a previously published article', async () => {
      const archived = { ...publishedArticle, status: ArticleStatus.ARCHIVED };
      mockPrisma.article.update.mockResolvedValue(archived);

      const result = await service.archive('article_cuid_2');

      expect(result.publishedAt).toEqual(publishedArticle.publishedAt);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(service.archive('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should delete the article and return the deleted record', async () => {
      mockPrisma.article.delete.mockResolvedValue(mockArticle);

      const result = await service.delete('article_cuid_1');

      expect(mockPrisma.article.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockPrisma.article.delete.mockRejectedValue(prismaP2025());

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.delete.mockRejectedValue(dbError());

      await expect(service.delete('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list()', () => {
    const baseQuery: ArticleQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of articles with meta', async () => {
      const articles = [publishedArticle, mockArticle];
      mockPrisma.article.findMany.mockResolvedValue(articles);
      mockPrisma.article.count.mockResolvedValue(2);

      const result = await service.list(baseQuery);

      expect(result).toEqual({
        data: articles,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('should return empty data and total 0 when no articles exist', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      const result = await service.list(baseQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for multi-page results', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(25);

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should apply correct skip/take for page 2', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(20);

      await service.list({ page: 2, limit: 5 });

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should filter by status when provided in the query', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, status: ArticleStatus.PUBLISHED });

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
        }),
      );
    });

    it('should filter articles by tagId through the articleTags relation', async () => {
      mockPrisma.article.findMany.mockResolvedValue([mockArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, tagId: mockTag.id });

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      const whereStr = JSON.stringify(callArg.where);
      expect(whereStr).toContain(mockTag.id);
    });

    it('should perform a search across title, briefing, and content when search is provided', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, search: 'imposto' });

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      const whereStr = JSON.stringify(callArg.where);
      expect(whereStr).toContain('imposto');
    });

    it('should order published articles by publishedAt descending by default', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list({ ...baseQuery, status: ArticleStatus.PUBLISHED });

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ publishedAt: 'desc' }),
        }),
      );
    });

    it('should include the author relation in the list results', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list(baseQuery);

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.include?.author || callArg.select?.author).toBeTruthy();
    });

    it('should include the articleTags relation in the list results', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await service.list(baseQuery);

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.include?.articleTags || callArg.select?.articleTags).toBeTruthy();
    });

    it('should propagate database errors', async () => {
      mockPrisma.article.findMany.mockRejectedValue(dbError());

      await expect(service.list(baseQuery)).rejects.toThrow('Connection refused');
    });
  });
});
