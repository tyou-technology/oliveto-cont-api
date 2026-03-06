import { Injectable } from '@nestjs/common';
import { ArticleStatus } from '@common/types/enums';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ArticleNotFoundException } from '@modules/articles/exception/article-not-found.exception';

const ARTICLE_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  articleTags: true,
};

export interface CreateArticleData {
  title: string;
  slug: string;
  content: string;
  briefing?: string;
  readingTime: number;
  visitsCount: number;
  status: ArticleStatus;
  authorId: string;
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  articleTags?: { create: { tagId: string }[] };
}

export interface UpdateArticleData {
  title?: string;
  slug?: string;
  content?: string;
  briefing?: string;
  readingTime?: number;
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  articleTags?: { deleteMany: object; create?: { tagId: string }[] };
}

@Injectable()
export class ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    return this.prisma.article.findUnique({ where: { slug }, include: ARTICLE_INCLUDE });
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    });
    if (!article) throw new ArticleNotFoundException();
    return article;
  }

  async create(data: CreateArticleData) {
    return this.prisma.article.create({ data, include: ARTICLE_INCLUDE });
  }

  async update(id: string, data: UpdateArticleData) {
    try {
      return await this.prisma.article.update({ where: { id }, data, include: ARTICLE_INCLUDE });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async publish(id: string) {
    try {
      return await this.prisma.article.update({
        where: { id },
        data: { status: ArticleStatus.PUBLISHED, publishedAt: new Date() },
        include: ARTICLE_INCLUDE,
      });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async archive(id: string) {
    try {
      return await this.prisma.article.update({
        where: { id },
        data: { status: ArticleStatus.ARCHIVED },
        include: ARTICLE_INCLUDE,
      });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.article.delete({ where: { id }, include: ARTICLE_INCLUDE });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async findMany(where: Record<string, unknown>, skip: number, take: number) {
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.article.count({ where }),
    ]);
    return { articles, total };
  }
}
