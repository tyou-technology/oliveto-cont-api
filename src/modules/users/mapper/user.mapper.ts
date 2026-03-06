import { Injectable } from '@nestjs/common';
import { UserEntity } from '@modules/users/entity/user.entity';

@Injectable()
export class UserMapper {
  toResponse(user: Record<string, any>): UserEntity {
    const { passwordHash: _stripped, ...safe } = user;
    return safe as UserEntity;
  }
}
