import { Injectable } from '@nestjs/common';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { Role } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { EmailAlreadyExistsException } from '@modules/users/exception/email-already-exists.exception';
import { UserNotFoundException } from '@modules/users/exception/user-not-found.exception';
import { CreateUserData, UpdateUserData } from '@modules/users/types/user-data.type';
import { UserEntity } from '@modules/users/entity/user.entity';
import { RawUser } from '@modules/users/types/raw-user.type';

export type { CreateUserData, UpdateUserData };

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<RawUser | null> {
    return this.prisma.user.findUnique({ where: { email } }) as Promise<RawUser | null>;
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new UserNotFoundException();
    return user as UserEntity;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      return await this.prisma.user.create({ data, select: USER_SELECT }) as UserEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT)
        throw new EmailAlreadyExistsException();
      throw err;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    try {
      return await this.prisma.user.update({ where: { id }, data, select: USER_SELECT }) as UserEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new UserNotFoundException();
      throw err;
    }
  }

  async updateRole(id: string, role: Role): Promise<UserEntity> {
    try {
      return await this.prisma.user.update({ where: { id }, data: { role }, select: USER_SELECT }) as UserEntity;
    } catch (err) {
      if (err?.code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND) throw new UserNotFoundException();
      throw err;
    }
  }

  async findMany(skip: number, take: number): Promise<{ users: UserEntity[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take, select: USER_SELECT }),
      this.prisma.user.count(),
    ]);
    return { users: users as UserEntity[], total };
  }
}
