// TODO: implement — driven by users.controller.spec.ts
import { Controller } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { UpdateUserDto, UpdateUserRoleDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async getMe(_currentUser: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateMe(_currentUser: any, _dto: UpdateUserDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async listUsers(_query: PaginationQueryDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateUserRole(_id: string, _dto: UpdateUserRoleDto, _currentUser?: any): Promise<any> {
    throw new Error('Not implemented');
  }
}
