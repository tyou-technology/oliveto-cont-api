import { Injectable } from '@nestjs/common';
import { ArticleStatus } from '@common/types/enums';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ArticleNotFoundException } from '@modules/articles/exception/article-not-found.exception';
import { ArticleEntity } from '@modules/articles/entity/article.entity';
import { CreateArticleData, UpdateArticleData } from '@modules/articles/types/article-data.type';

export type { CreateArticleData, UpdateArticleData };

const ARTICLE_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  articleTags: {
    include: {
      tag: { select: { id: true, name: true, color: true, icon: true } },
    },
  },
};

@Injectable()
export class ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<ArticleEntity | null> {
    return this.prisma.article.findUnique({ where: { slug }, include: ARTICLE_INCLUDE }) as Promise<ArticleEntity | null>;
  }

  async findById(id: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    });
    if (!article) throw new ArticleNotFoundException();
    return article as ArticleEntity;
  }

  async create(data: CreateArticleData): Promise<ArticleEntity> {
    return this.prisma.article.create({ data, include: ARTICLE_INCLUDE }) as Promise<ArticleEntity>;
  }

  async update(id: string, data: UpdateArticleData): Promise<ArticleEntity> {
    try {
      return await this.prisma.article.update({ where: { id }, data, include: ARTICLE_INCLUDE }) as ArticleEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async publish(id: string): Promise<ArticleEntity> {
    try {
      return await this.prisma.article.update({
        where: { id },
        data: { status: ArticleStatus.PUBLISHED, publishedAt: new Date() },
        include: ARTICLE_INCLUDE,
      }) as ArticleEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async archive(id: string): Promise<ArticleEntity> {
    try {
      return await this.prisma.article.update({
        where: { id },
        data: { status: ArticleStatus.ARCHIVED },
        include: ARTICLE_INCLUDE,
      }) as ArticleEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.article.delete({ where: { id } });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async findMany(
    where: Record<string, unknown>,
    skip: number,
    take: number,
  ): Promise<{ articles: ArticleEntity[]; total: number }> {
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
    return { articles: articles as ArticleEntity[], total };
  }
}
