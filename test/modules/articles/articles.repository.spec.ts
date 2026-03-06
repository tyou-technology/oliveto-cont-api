import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ArticlesRepository } from '@modules/articles/repository/articles.repository';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAuthor = { id: 'author_cuid_1', name: 'Jane Editor', avatarUrl: null };

const mockTag = { id: 'tag_cuid_1', name: 'contabilidade', color: '#4CAF50', icon: 'calculator' };

const mockArticle = {
  id: 'article_cuid_1',
  title: 'Como abrir uma empresa no Brasil',
  slug: 'como-abrir-uma-empresa-no-brasil',
  briefing: 'Um guia completo.',
  content: 'Conteúdo.',
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
  status: ArticleStatus.PUBLISHED,
  publishedAt: new Date('2026-01-15'),
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

describe('ArticlesRepository', () => {
  let repository: ArticlesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticlesRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ArticlesRepository>(ArticlesRepository);
    jest.clearAllMocks();
  });

  // ── findBySlug ──────────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the article when the slug exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      const result = await repository.findBySlug('declaracao-de-imposto-de-renda');

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'declaracao-de-imposto-de-renda' } }),
      );
      expect(result).toEqual(publishedArticle);
    });

    it('should return null when the slug does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      const result = await repository.findBySlug('nonexistent-slug');

      expect(result).toBeNull();
    });

    it('should include author and articleTags relations', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      await repository.findBySlug('any-slug');

      const callArg = mockPrisma.article.findUnique.mock.calls[0][0];
      expect(callArg.include?.author || callArg.select?.author).toBeTruthy();
      expect(callArg.include?.articleTags || callArg.select?.articleTags).toBeTruthy();
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(dbError());

      await expect(repository.findBySlug('any-slug')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the article when the id exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(mockArticle);

      const result = await repository.findById('article_cuid_1');

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result).toEqual(mockArticle);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(repository.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(dbError());

      await expect(repository.findById('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createData = {
      title: 'Como abrir uma empresa',
      slug: 'como-abrir-uma-empresa',
      content: 'Conteúdo.',
      readingTime: 5,
      visitsCount: 0,
      status: ArticleStatus.DRAFT,
      authorId: mockAuthor.id,
    };

    it('should create and return the article', async () => {
      mockPrisma.article.create.mockResolvedValue(mockArticle);

      const result = await repository.create(createData);

      expect(mockPrisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createData }),
      );
      expect(result).toEqual(mockArticle);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.article.create.mockRejectedValue(dbError());

      await expect(repository.create(createData)).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the article', async () => {
      const updated = { ...mockArticle, title: 'Novo Título' };
      mockPrisma.article.update.mockResolvedValue(updated);

      const result = await repository.update('article_cuid_1', { title: 'Novo Título' });

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result.title).toBe('Novo Título');
    });

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(repository.update('nonexistent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(repository.update('article_cuid_1', { title: 'X' })).rejects.toThrow(
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

      const result = await repository.publish('article_cuid_1');

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

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(repository.publish('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(repository.publish('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── archive ─────────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('should set status to ARCHIVED', async () => {
      const archived = { ...mockArticle, status: ArticleStatus.ARCHIVED };
      mockPrisma.article.update.mockResolvedValue(archived);

      const result = await repository.archive('article_cuid_1');

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'article_cuid_1' },
          data: expect.objectContaining({ status: ArticleStatus.ARCHIVED }),
        }),
      );
      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.article.update.mockRejectedValue(prismaP2025());

      await expect(repository.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.update.mockRejectedValue(dbError());

      await expect(repository.archive('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should call prisma.article.delete with correct where clause', async () => {
      mockPrisma.article.delete.mockResolvedValue(mockArticle);

      const result = await repository.delete('article_cuid_1');

      expect(mockPrisma.article.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'article_cuid_1' } }),
      );
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException on P2025', async () => {
      mockPrisma.article.delete.mockRejectedValue(prismaP2025());

      await expect(repository.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.article.delete.mockRejectedValue(dbError());

      await expect(repository.delete('article_cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── findMany ─────────────────────────────────────────────────────────────────

  describe('findMany()', () => {
    it('should return articles and total count', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      const result = await repository.findMany({}, 0, 10);

      expect(result).toEqual({ articles: [publishedArticle], total: 1 });
    });

    it('should apply skip and take correctly', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(20);

      await repository.findMany({}, 5, 5);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should pass the where filter to both findMany and count', async () => {
      const where = { status: ArticleStatus.PUBLISHED };
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await repository.findMany(where, 0, 10);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(mockPrisma.article.count).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
    });

    it('should order by publishedAt descending', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await repository.findMany({}, 0, 10);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      );
    });

    it('should include author and articleTags relations', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      await repository.findMany({}, 0, 10);

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.include?.author || callArg.select?.author).toBeTruthy();
      expect(callArg.include?.articleTags || callArg.select?.articleTags).toBeTruthy();
    });

    it('should propagate database errors', async () => {
      mockPrisma.article.findMany.mockRejectedValue(dbError());

      await expect(repository.findMany({}, 0, 10)).rejects.toThrow('Connection refused');
    });
  });
});
