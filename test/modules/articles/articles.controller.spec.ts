import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus, Role } from '@common/types/enums';
import { ArticlesController } from '@modules/articles/articles.controller';
import { ArticlesService } from '@modules/articles/articles.service';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';
import { PublicArticleQueryDto } from '@modules/articles/dto/public-article-query.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAuthor = {
  id: 'author_cuid_1',
  name: 'Jane Editor',
  avatarUrl: null,
};

const mockCurrentUser = {
  id: mockAuthor.id,
  email: 'editor@oliveto.com.br',
  role: Role.EDITOR,
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

const paginatedResult = {
  data: [publishedArticle],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

const mockArticlesService = {
  create: jest.fn(),
  update: jest.fn(),
  findBySlug: jest.fn(),
  findById: jest.fn(),
  publish: jest.fn(),
  archive: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  listPublished: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ArticlesController', () => {
  let controller: ArticlesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [{ provide: ArticlesService, useValue: mockArticlesService }],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    jest.clearAllMocks();
  });

  // ── GET /articles ───────────────────────────────────────────────────────────

  describe('listArticles()', () => {
    const query: ArticleQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of articles with _links', async () => {
      mockArticlesService.list.mockResolvedValue(paginatedResult);

      const result = await controller.listArticles(query);

      expect(mockArticlesService.list).toHaveBeenCalledWith(query);
      expect(result).toMatchObject(paginatedResult);
      expect(result._links.self).toBeDefined();
    });

    it('should pass the full query object including status filter to the service', async () => {
      const filteredQuery: ArticleQueryDto = { ...query, status: ArticleStatus.PUBLISHED };
      mockArticlesService.list.mockResolvedValue(paginatedResult);

      await controller.listArticles(filteredQuery);

      expect(mockArticlesService.list).toHaveBeenCalledWith(filteredQuery);
    });

    it('should pass tagId filter to the service', async () => {
      const tagQuery: ArticleQueryDto = { ...query, tagId: mockTag.id };
      mockArticlesService.list.mockResolvedValue(paginatedResult);

      await controller.listArticles(tagQuery);

      expect(mockArticlesService.list).toHaveBeenCalledWith(tagQuery);
    });

    it('should pass search query to the service', async () => {
      const searchQuery: ArticleQueryDto = { ...query, search: 'imposto de renda' };
      mockArticlesService.list.mockResolvedValue({ data: [], meta: {} });

      await controller.listArticles(searchQuery);

      expect(mockArticlesService.list).toHaveBeenCalledWith(searchQuery);
    });

    it('should return empty results when no articles match the filters', async () => {
      mockArticlesService.list.mockResolvedValue({ data: [], meta: { total: 0, totalPages: 0 } });

      const result = await controller.listArticles(query);

      expect(result.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.list.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.listArticles(query)).rejects.toThrow('Connection refused');
    });
  });

  // ── GET /articles/published ───────────────────────────────────────────────────

  describe('listPublishedArticles()', () => {
    const query: PublicArticleQueryDto = { page: 1, limit: 10 };
    const publishedResult = {
      data: [publishedArticle],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };

    it('should return published articles with _links', async () => {
      mockArticlesService.listPublished.mockResolvedValue(publishedResult);

      const result = await controller.listPublishedArticles(query);

      expect(mockArticlesService.listPublished).toHaveBeenCalledWith(query);
      expect(result).toMatchObject(publishedResult);
      expect(result._links.self).toBeDefined();
    });

    it('should pass tagId filter to the service', async () => {
      const tagQuery: PublicArticleQueryDto = { ...query, tagId: mockTag.id };
      mockArticlesService.listPublished.mockResolvedValue(publishedResult);

      await controller.listPublishedArticles(tagQuery);

      expect(mockArticlesService.listPublished).toHaveBeenCalledWith(tagQuery);
    });

    it('should pass search query to the service', async () => {
      const searchQuery: PublicArticleQueryDto = { ...query, search: 'imposto' };
      mockArticlesService.listPublished.mockResolvedValue({ data: [], meta: {} });

      await controller.listPublishedArticles(searchQuery);

      expect(mockArticlesService.listPublished).toHaveBeenCalledWith(searchQuery);
    });

    it('should return empty results when no published articles match', async () => {
      mockArticlesService.listPublished.mockResolvedValue({ data: [], meta: { total: 0, totalPages: 0 } });

      const result = await controller.listPublishedArticles(query);

      expect(result.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.listPublished.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.listPublishedArticles(query)).rejects.toThrow('Connection refused');
    });
  });

  // ── GET /articles/slug/:slug ─────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the article that matches the slug with _links', async () => {
      mockArticlesService.findBySlug.mockResolvedValue(publishedArticle);

      const result = await controller.findBySlug('declaracao-de-imposto-de-renda');

      expect(mockArticlesService.findBySlug).toHaveBeenCalledWith(
        'declaracao-de-imposto-de-renda',
      );
      expect(result.data).toEqual(publishedArticle);
      expect(result._links.self).toBeDefined();
      expect(result._links.collection).toBeDefined();
    });

    it('should throw NotFoundException when the slug does not match any article', async () => {
      mockArticlesService.findBySlug.mockRejectedValue(new NotFoundException());

      await expect(controller.findBySlug('nonexistent-slug')).rejects.toThrow(NotFoundException);
    });

    it('should return articleTags with full tag data alongside the article', async () => {
      mockArticlesService.findBySlug.mockResolvedValue(publishedArticle);

      const result = await controller.findBySlug('declaracao-de-imposto-de-renda');

      expect(result.data.articleTags).toEqual([mockTag2]);
      expect(result.data.articleTags[0]).toHaveProperty('name');
      expect(result.data.articleTags[0]).toHaveProperty('color');
      expect(result.data.articleTags[0]).toHaveProperty('icon');
    });

    it('should return readingTime and visitsCount in the response', async () => {
      mockArticlesService.findBySlug.mockResolvedValue(publishedArticle);

      const result = await controller.findBySlug('declaracao-de-imposto-de-renda');

      expect(result.data.readingTime).toBe(8);
      expect(result.data.visitsCount).toBe(142);
    });
  });

  // ── POST /articles ──────────────────────────────────────────────────────────

  describe('createArticle()', () => {
    const createDto: CreateArticleDto = {
      title: 'Como abrir uma empresa no Brasil',
      content: 'Conteúdo completo do artigo em português.',
      briefing: 'Um guia completo.',
      readingTime: 5,
      tagIds: [mockTag.id],
    };

    it('should create an article and return it with _links', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      const result = await controller.createArticle(createDto, mockCurrentUser as any);

      expect(mockArticlesService.create).toHaveBeenCalledWith(createDto, mockCurrentUser.id);
      expect(result.data).toEqual(mockArticle);
      expect(result._links.self).toBeDefined();
      expect(result._links.collection).toBeDefined();
    });

    it('should pass the current user id as the authorId to the service', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      await controller.createArticle(createDto, mockCurrentUser as any);

      const [, calledAuthorId] = mockArticlesService.create.mock.calls[0];
      expect(calledAuthorId).toBe(mockCurrentUser.id);
    });

    it('should return articleTags in the response after creation', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      const result = await controller.createArticle(createDto, mockCurrentUser as any);

      expect(result.data.articleTags).toEqual([mockTag]);
    });

    it('should return an empty articleTags array when no tagIds are provided', async () => {
      const dtoWithoutTags: CreateArticleDto = {
        title: 'Artigo Simples',
        content: 'Conteúdo simples.',
        readingTime: 2,
      };
      mockArticlesService.create.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await controller.createArticle(dtoWithoutTags, mockCurrentUser as any);

      expect(result.data.articleTags).toEqual([]);
    });

    it('should return visitsCount as 0 on a freshly created article', async () => {
      mockArticlesService.create.mockResolvedValue(mockArticle);

      const result = await controller.createArticle(createDto, mockCurrentUser as any);

      expect(result.data.visitsCount).toBe(0);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.create.mockRejectedValue(new Error('Connection refused'));

      await expect(
        controller.createArticle(createDto, mockCurrentUser as any),
      ).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /articles/:id ─────────────────────────────────────────────────────

  describe('updateArticle()', () => {
    const updateDto: UpdateArticleDto = { title: 'Título Atualizado' };

    it('should update and return the article with _links', async () => {
      const updated = { ...mockArticle, title: 'Título Atualizado' };
      mockArticlesService.update.mockResolvedValue(updated);

      const result = await controller.updateArticle('article_cuid_1', updateDto);

      expect(mockArticlesService.update).toHaveBeenCalledWith('article_cuid_1', updateDto);
      expect(result.data.title).toBe('Título Atualizado');
      expect(result._links.self).toBeDefined();
    });

    it('should update the briefing field', async () => {
      const briefingDto: UpdateArticleDto = { briefing: 'Resumo atualizado.' };
      mockArticlesService.update.mockResolvedValue({ ...mockArticle, briefing: 'Resumo atualizado.' });

      const result = await controller.updateArticle('article_cuid_1', briefingDto);

      expect(result.data.briefing).toBe('Resumo atualizado.');
    });

    it('should update the readingTime field', async () => {
      const timeDto: UpdateArticleDto = { readingTime: 15 };
      mockArticlesService.update.mockResolvedValue({ ...mockArticle, readingTime: 15 });

      const result = await controller.updateArticle('article_cuid_1', timeDto);

      expect(result.data.readingTime).toBe(15);
    });

    it('should update articleTags when tagIds are provided', async () => {
      const tagUpdateDto: UpdateArticleDto = { tagIds: [mockTag2.id] };
      mockArticlesService.update.mockResolvedValue({ ...mockArticle, articleTags: [mockTag2] });

      const result = await controller.updateArticle('article_cuid_1', tagUpdateDto);

      expect(mockArticlesService.update).toHaveBeenCalledWith('article_cuid_1', tagUpdateDto);
      expect(result.data.articleTags).toEqual([mockTag2]);
    });

    it('should allow clearing all articleTags by passing an empty tagIds array', async () => {
      const clearTagsDto: UpdateArticleDto = { tagIds: [] };
      mockArticlesService.update.mockResolvedValue({ ...mockArticle, articleTags: [] });

      const result = await controller.updateArticle('article_cuid_1', clearTagsDto);

      expect(result.data.articleTags).toEqual([]);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.updateArticle('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── DELETE /articles/:id ────────────────────────────────────────────────────

  describe('deleteArticle()', () => {
    it('should delete the article and return no content (204)', async () => {
      mockArticlesService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteArticle('article_cuid_1');

      expect(mockArticlesService.delete).toHaveBeenCalledWith('article_cuid_1');
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteArticle('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.delete.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.deleteArticle('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /articles/:id/publish ─────────────────────────────────────────────

  describe('publishArticle()', () => {
    it('should publish the article and return it with PUBLISHED status and _links', async () => {
      const published = {
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      };
      mockArticlesService.publish.mockResolvedValue(published);

      const result = await controller.publishArticle('article_cuid_1');

      expect(mockArticlesService.publish).toHaveBeenCalledWith('article_cuid_1');
      expect(result.data.status).toBe(ArticleStatus.PUBLISHED);
      expect(result._links.self).toBeDefined();
    });

    it('should set publishedAt to a date on publish', async () => {
      const published = {
        ...mockArticle,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2026-01-20'),
      };
      mockArticlesService.publish.mockResolvedValue(published);

      const result = await controller.publishArticle('article_cuid_1');

      expect(result.data.publishedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesService.publish.mockRejectedValue(new NotFoundException());

      await expect(controller.publishArticle('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.publish.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.publishArticle('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── PATCH /articles/:id/archive ─────────────────────────────────────────────

  describe('archiveArticle()', () => {
    it('should archive the article and return it with ARCHIVED status and _links', async () => {
      const archived = { ...publishedArticle, status: ArticleStatus.ARCHIVED };
      mockArticlesService.archive.mockResolvedValue(archived);

      const result = await controller.archiveArticle('article_cuid_2');

      expect(mockArticlesService.archive).toHaveBeenCalledWith('article_cuid_2');
      expect(result.data.status).toBe(ArticleStatus.ARCHIVED);
      expect(result._links.self).toBeDefined();
    });

    it('should preserve publishedAt when archiving a previously published article', async () => {
      const archived = { ...publishedArticle, status: ArticleStatus.ARCHIVED };
      mockArticlesService.archive.mockResolvedValue(archived);

      const result = await controller.archiveArticle('article_cuid_2');

      expect(result.data.publishedAt).toEqual(publishedArticle.publishedAt);
    });

    it('should throw NotFoundException when the article does not exist', async () => {
      mockArticlesService.archive.mockRejectedValue(new NotFoundException());

      await expect(controller.archiveArticle('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate service errors', async () => {
      mockArticlesService.archive.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.archiveArticle('article_cuid_2')).rejects.toThrow('Connection refused');
    });
  });
});
