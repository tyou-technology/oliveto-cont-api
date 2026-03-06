import { Module } from '@nestjs/common';
import { UserMapper } from './mapper/user.mapper';
import { UsersRepository } from './repository/users.repository';
import { UsersController } from './resource/users.controller';
import { UsersService } from './service/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UserMapper],
  exports: [UsersService],
})
export class UsersModule {}
