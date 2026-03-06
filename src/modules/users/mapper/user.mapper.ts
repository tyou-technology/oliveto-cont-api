import { Injectable } from '@nestjs/common';
import { UserEntity } from '@modules/users/entity/user.entity';
import { RawUser } from '@modules/users/types/raw-user.type';

@Injectable()
export class UserMapper {
  toResponse(user: RawUser): UserEntity {
    const { passwordHash: _stripped, ...safe } = user;
    return safe as UserEntity;
  }
}
