import { UserEntity } from '@modules/users/entity/user.entity';

export interface RawUser extends UserEntity {
  passwordHash: string;
}
