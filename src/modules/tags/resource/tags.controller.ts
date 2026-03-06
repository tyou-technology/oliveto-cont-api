import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { TAGS_ROUTES } from '@modules/tags/constants/tags.constants';
import { Role } from '@common/types/enums';
import { TagsService } from '@modules/tags/service/tags.service';
import { CreateTagDto } from '@modules/tags/dto/create-tag.dto';
import { UpdateTagDto } from '@modules/tags/dto/update-tag.dto';

@ApiTags('tags')
@Controller(TAGS_ROUTES.BASE)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @ApiOperation({ summary: 'List all tags (public)' })
  @ApiOkResponse({ description: 'Tag list' })
  @Public()
  @Get()
  async listTags() {
    const tags = await this.tagsService.findAll();
    return {
      data: tags,
      _links: { self: { href: '/tags' } },
    };
  }

  @ApiOperation({ summary: 'Get tag by id (public)' })
  @ApiOkResponse({ description: 'Tag detail' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @Public()
  @Get(TAGS_ROUTES.BY_ID)
  async findTag(@Param('id') id: string) {
    const tag = await this.tagsService.findById(id);
    return {
      data: tag,
      _links: {
        self: { href: `/tags/${id}` },
        collection: { href: '/tags' },
      },
    };
  }

  @ApiOperation({ summary: 'Create a new tag (Admin only)' })
  @ApiCreatedResponse({ description: 'Tag created' })
  @ApiConflictResponse({ description: 'Tag name already exists' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  async createTag(@Body() dto: CreateTagDto) {
    const tag = await this.tagsService.create(dto);
    return {
      data: tag,
      _links: {
        self: { href: `/tags/${tag.id}` },
        collection: { href: '/tags' },
      },
    };
  }

  @ApiOperation({ summary: 'Update a tag (Admin only)' })
  @ApiOkResponse({ description: 'Tag updated' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiConflictResponse({ description: 'Tag name already exists' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(TAGS_ROUTES.BY_ID)
  async updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    const tag = await this.tagsService.update(id, dto);
    return {
      data: tag,
      _links: {
        self: { href: `/tags/${id}` },
        collection: { href: '/tags' },
      },
    };
  }

  @ApiOperation({ summary: 'Delete a tag (Admin only)' })
  @ApiNoContentResponse({ description: 'Tag deleted' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(TAGS_ROUTES.BY_ID)
  async deleteTag(@Param('id') id: string): Promise<void> {
    await this.tagsService.delete(id);
  }
}
