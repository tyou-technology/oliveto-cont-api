import { Injectable } from '@nestjs/common';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { Role } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { EmailAlreadyExistsException } from '@modules/users/exception/email-already-exists.exception';
import { UserNotFoundException } from '@modules/users/exception/user-not-found.exception';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
};

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  passwordHash?: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new UserNotFoundException();
    return user;
  }

  async create(data: CreateUserData) {
    try {
      return await this.prisma.user.create({ data, select: USER_SELECT });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT)
        throw new EmailAlreadyExistsException();
      throw err;
    }
  }

  async update(id: string, data: UpdateUserData) {
    try {
      return await this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new UserNotFoundException();
      throw err;
    }
  }

  async updateRole(id: string, role: Role) {
    try {
      return await this.prisma.user.update({ where: { id }, data: { role }, select: USER_SELECT });
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new UserNotFoundException();
      throw err;
    }
  }

  async findMany(skip: number, take: number) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take, select: USER_SELECT }),
      this.prisma.user.count(),
    ]);
    return { users, total };
  }
}
