import { ArticleStatus } from '@common/types/enums';

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
