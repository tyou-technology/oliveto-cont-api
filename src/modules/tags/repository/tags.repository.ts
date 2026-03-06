import { Injectable } from '@nestjs/common';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateTagDto } from '@modules/tags/dto/create-tag.dto';
import { UpdateTagDto } from '@modules/tags/dto/update-tag.dto';
import { TagNotFoundException } from '@modules/tags/exception/tag-not-found.exception';
import { TagNameAlreadyExistsException } from '@modules/tags/exception/tag-name-already-exists.exception';

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTagDto) {
    try {
      return await this.prisma.tag.create({ data: dto });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) throw new TagNameAlreadyExistsException();
      throw err;
    }
  }

  async findById(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new TagNotFoundException();
    return tag;
  }

  async findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async update(id: string, dto: UpdateTagDto) {
    try {
      return await this.prisma.tag.update({ where: { id }, data: dto });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new TagNotFoundException();
      if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) throw new TagNameAlreadyExistsException();
      throw err;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.tag.delete({ where: { id } });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new TagNotFoundException();
      throw err;
    }
  }
}
