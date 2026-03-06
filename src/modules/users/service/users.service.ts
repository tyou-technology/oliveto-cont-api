import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginationQueryRequest } from '@common/dto/pagination.dto';
import { BCRYPT_SALT_ROUNDS } from '@modules/users/constants/users.constants';
import { CreateUserRequest } from '@modules/users/dto/create-user.request';
import { UpdateUserRequest, UpdateUserRoleRequest } from '@modules/users/dto/update-user.request';
import { UsersRepository } from '@modules/users/repository/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async findByEmail(email: string) {
    return this.usersRepo.findByEmail(email);
  }

  async findById(id: string) {
    return this.usersRepo.findById(id);
  }

  async create(dto: CreateUserRequest) {
    const { password, name, email, avatarUrl } = dto;
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    return this.usersRepo.create({ name, email, passwordHash, avatarUrl });
  }

  async update(id: string, dto: UpdateUserRequest) {
    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }
    return this.usersRepo.update(id, data);
  }

  async updateRole(id: string, dto: UpdateUserRoleRequest) {
    return this.usersRepo.updateRole(id, dto.role);
  }

  async list(query: PaginationQueryRequest) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const { users, total } = await this.usersRepo.findMany(skip, limit);
    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }
}
