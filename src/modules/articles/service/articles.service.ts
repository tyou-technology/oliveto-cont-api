import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { ArticleStatus } from '@common/types/enums';
import { ArticleNotFoundException } from '@modules/articles/exception/article-not-found.exception';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';
import { PublicArticleQueryDto } from '@modules/articles/dto/public-article-query.dto';
import { ArticlesRepository } from '@modules/articles/repository/articles.repository';

@Injectable()
export class ArticlesService {
  constructor(private readonly articlesRepository: ArticlesRepository) {}

  async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    const exists = await this.articlesRepository.findBySlug(base);
    return exists ? `${base}-${Date.now()}` : base;
  }

  async create(dto: CreateArticleDto, authorId: string) {
    const { tagIds, ...rest } = dto;
    const slug = await this.generateUniqueSlug(dto.title);

    return this.articlesRepository.create({
      ...rest,
      slug,
      authorId,
      status: dto.status ?? ArticleStatus.DRAFT,
      visitsCount: 0,
      ...(tagIds?.length ? { articleTags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
    });
  }

  async findBySlug(slug: string) {
    const article = await this.articlesRepository.findBySlug(slug);
    if (!article) throw new ArticleNotFoundException();
    return article;
  }

  async findById(id: string) {
    return this.articlesRepository.findById(id);
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

    return this.articlesRepository.update(id, data);
  }

  async publish(id: string) {
    return this.articlesRepository.publish(id);
  }

  async archive(id: string) {
    return this.articlesRepository.archive(id);
  }

  async trackView(id: string): Promise<void> {
    return this.articlesRepository.incrementVisitsCount(id);
  }

  async delete(id: string) {
    return this.articlesRepository.delete(id);
  }

  async listPublished(query: PublicArticleQueryDto) {
    const { page = 1, limit = 10, tagId, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: ArticleStatus.PUBLISHED };

    if (tagId) where.articleTags = { some: { tagId } };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { briefing: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const { articles, total } = await this.articlesRepository.findMany(where, skip, limit);

    return {
      data: articles,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
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

    const { articles, total } = await this.articlesRepository.findMany(where, skip, limit);

    return {
      data: articles,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }
}
