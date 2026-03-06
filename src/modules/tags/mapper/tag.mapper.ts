import { Injectable } from '@nestjs/common';
import { TagEntity } from '@modules/tags/entity/tag.entity';

@Injectable()
export class TagMapper {
  toResponse(tag: TagEntity): TagEntity {
    return tag;
  }
}
