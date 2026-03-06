import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
  listTags() {
    return this.tagsService.findAll();
  }

  @ApiOperation({ summary: 'Get tag by id (public)' })
  @ApiOkResponse({ description: 'Tag detail' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @Public()
  @Get(TAGS_ROUTES.BY_ID)
  findTag(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new tag (Admin only)' })
  @ApiOkResponse({ description: 'Tag created' })
  @ApiConflictResponse({ description: 'Tag name already exists' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  createTag(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @ApiOperation({ summary: 'Update a tag (Admin only)' })
  @ApiOkResponse({ description: 'Tag updated' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiConflictResponse({ description: 'Tag name already exists' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(TAGS_ROUTES.BY_ID)
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a tag (Admin only)' })
  @ApiOkResponse({ description: 'Tag deleted' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(TAGS_ROUTES.BY_ID)
  deleteTag(@Param('id') id: string) {
    return this.tagsService.delete(id);
  }
}
