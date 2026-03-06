import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { ArticleStatus } from '@common/types/enums';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { ArticleNotFoundException } from '@modules/articles/exception/article-not-found.exception';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';
import { PrismaService } from '@modules/prisma/prisma.service';

const ARTICLE_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  articleTags: true,
};

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    const exists = await this.prisma.article.findUnique({ where: { slug: base } });
    return exists ? `${base}-${Date.now()}` : base;
  }

  async create(dto: CreateArticleDto, authorId: string) {
    const { tagIds, ...rest } = dto;
    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.article.create({
      data: {
        ...rest,
        slug,
        authorId,
        status: ArticleStatus.DRAFT,
        visitsCount: 0,
        ...(tagIds?.length ? { articleTags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      include: ARTICLE_INCLUDE,
    });
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: ARTICLE_INCLUDE,
    });
    if (!article) throw new ArticleNotFoundException();
    return article;
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    });
    if (!article) throw new ArticleNotFoundException();
    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const { tagIds, title, ...rest } = dto;

    const data: Record<string, unknown> = { ...rest };

    if (title !== undefined) {
      data.title = title;
      data.slug = slugify(title, { lower: true, strict: true });
    }

    if (tagIds !== undefined) {
      data.articleTags = {
        deleteMany: {},
        ...(tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : {}),
      };
    }

    try {
      return await this.prisma.article.update({
        where: { id },
        data,
        include: ARTICLE_INCLUDE,
      });
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
      return await this.prisma.article.delete({
        where: { id },
        include: ARTICLE_INCLUDE,
      });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new ArticleNotFoundException();
      throw err;
    }
  }

  async list(query: ArticleQueryDto) {
    const { page = 1, limit = 10, status, tagId, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (tagId) where.articleTags = { some: { tagId } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { briefing: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }
}
