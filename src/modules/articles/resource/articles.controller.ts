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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ROUTES } from '@common/constants/routes';
import { Role } from '@common/types/enums';
import { ArticlesService } from '@modules/articles/service/articles.service';
import { CreateArticleDto } from '@modules/articles/dto/create-article.dto';
import { UpdateArticleDto } from '@modules/articles/dto/update-article.dto';
import { ArticleQueryDto } from '@modules/articles/dto/article-query.dto';

@ApiTags('articles')
@Controller(ROUTES.ARTICLES.BASE)
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiOperation({ summary: 'List articles (public, filterable)' })
  @ApiOkResponse({ description: 'Paginated article list' })
  @Public()
  @Get()
  listArticles(@Query() query: ArticleQueryDto) {
    return this.articlesService.list(query);
  }

  @ApiOperation({ summary: 'Get article by slug (public)' })
  @ApiOkResponse({ description: 'Article detail' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @Public()
  @Get(ROUTES.ARTICLES.SLUG)
  findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @ApiOperation({ summary: 'Create a new article (Editor+)' })
  @ApiOkResponse({ description: 'Article created' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @Post()
  createArticle(@Body() dto: CreateArticleDto, @CurrentUser() currentUser: any) {
    return this.articlesService.create(dto, currentUser.id);
  }

  @ApiOperation({ summary: 'Update an article (Editor+)' })
  @ApiOkResponse({ description: 'Article updated' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @Patch(ROUTES.ARTICLES.BY_ID)
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an article (Admin only)' })
  @ApiOkResponse({ description: 'Article deleted' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(ROUTES.ARTICLES.BY_ID)
  deleteArticle(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }

  @ApiOperation({ summary: 'Publish an article (Editor+)' })
  @ApiOkResponse({ description: 'Article published' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(ROUTES.ARTICLES.PUBLISH)
  publishArticle(@Param('id') id: string) {
    return this.articlesService.publish(id);
  }

  @ApiOperation({ summary: 'Archive an article (Editor+)' })
  @ApiOkResponse({ description: 'Article archived' })
  @ApiNotFoundResponse({ description: 'Article not found' })
  @ApiBearerAuth()
  @Roles(Role.EDITOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(ROUTES.ARTICLES.ARCHIVE)
  archiveArticle(@Param('id') id: string) {
    return this.articlesService.archive(id);
  }
}
