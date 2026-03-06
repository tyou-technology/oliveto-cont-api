import { Injectable } from '@nestjs/common';
import { TagEntity } from '@modules/tags/entity/tag.entity';

@Injectable()
export class TagMapper {
  toResponse(tag: Record<string, any>): TagEntity {
    return tag as TagEntity;
  }
}
