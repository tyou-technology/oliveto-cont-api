import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtPayload } from '@common/types/jwt-payload.type';
import { ARTICLES_ROUTES } from '@modules/articles/constants/articles.constants';
import { Role } from '@common/types/enums';
import { ArticlesService } from '@modules/articles/service/articles.service';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';
import { PublicArticleQueryDto } from '@modules/articles/dto/public-article-query.dto';

@ApiTags('articles')
@Controller(ARTICLES_ROUTES.BASE)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiOperation({ summary: 'List articles (public, filterable)' })
  @ApiOkResponse({ description: 'Paginated article list' })
  @Public()
  @Get()
  async listArticles(@Query() query: ArticleQueryDto) {
    const result = await this.articlesService.list(query);
    return {
      ...result,
      _links: { self: { href: '/articles' } },
    };
  }

  @ApiOperation({ summary: 'List published articles with tags (public)' })
  @ApiOkResponse({ description: 'Paginated published article list' })
  @Public()
  @Get(ARTICLES_ROUTES.PUBLISHED)
  async listPublishedArticles(@Query() query: PublicArticleQueryDto) {
    const result = await this.articlesService.listPublished(query);
    return {
      ...result,
      _links: { self: { href: '/articles/published' } },
    };
  }

  @ApiOperation({ summary: 'Get article by slug (public)' })
  @ApiOkResponse({ description: 'Article detail' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @Public()
  @Get(ARTICLES_ROUTES.SLUG)
  async findBySlug(@Param('slug') slug: string) {
    const article = await this.articlesService.findBySlug(slug);
    return {
      data: article,
      _links: {
        self: { href: `/articles/slug/${slug}` },
        collection: { href: '/articles' },
      },
    };
  }

  @ApiOperation({ summary: 'Create a new article (Editor+)' })
  @ApiCreatedResponse({ description: 'Article created' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @Post()
  async createArticle(@Body() dto: CreateArticleDto, @CurrentUser() currentUser: JwtPayload) {
    const article = await this.articlesService.create(dto, currentUser.id);
    return {
      data: article,
      _links: {
        self: { href: `/articles/slug/${article.slug}` },
        collection: { href: '/articles' },
      },
    };
  }

  @ApiOperation({ summary: 'Update an article (Editor+)' })
  @ApiOkResponse({ description: 'Article updated' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @Patch(ARTICLES_ROUTES.BY_ID)
  async updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    const article = await this.articlesService.update(id, dto);
    return {
      data: article,
      _links: {
        self: { href: `/articles/slug/${article.slug}` },
        collection: { href: '/articles' },
      },
    };
  }

  @ApiOperation({ summary: 'Delete an article (Admin only)' })
  @ApiNoContentResponse({ description: 'Article deleted' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(ARTICLES_ROUTES.BY_ID)
  async deleteArticle(@Param('id') id: string): Promise<void> {
    await this.articlesService.delete(id);
  }

  @ApiOperation({ summary: 'Publish an article (Editor+)' })
  @ApiOkResponse({ description: 'Article published' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(ARTICLES_ROUTES.PUBLISH)
  async publishArticle(@Param('id') id: string) {
    const article = await this.articlesService.publish(id);
    return {
      data: article,
      _links: {
        self: { href: `/articles/slug/${article.slug}` },
        collection: { href: '/articles' },
      },
    };
  }

  @ApiOperation({ summary: 'Archive an article (Editor+)' })
  @ApiOkResponse({ description: 'Article archived' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(ARTICLES_ROUTES.ARCHIVE)
  async archiveArticle(@Param('id') id: string) {
    const article = await this.articlesService.archive(id);
    return {
      data: article,
      _links: {
        self: { href: `/articles/slug/${article.slug}` },
        collection: { href: '/articles' },
      },
    };
  }
}
