import { Injectable } from '@nestjs/common';
import { TagsRepository } from '@modules/tags/repository/tags.repository';
import { CreateTagDto } from '@modules/tags/dto/create-tag.dto';
import { UpdateTagDto } from '@modules/tags/dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly tagsRepository: TagsRepository) {}

  async create(dto: CreateTagDto) {
    return this.tagsRepository.create(dto);
  }

  async findById(id: string) {
    return this.tagsRepository.findById(id);
  }

  async findAll() {
    return this.tagsRepository.findAll();
  }

  async update(id: string, dto: UpdateTagDto) {
    return this.tagsRepository.update(id, dto);
  }

  async delete(id: string) {
    return this.tagsRepository.delete(id);
  }
}
