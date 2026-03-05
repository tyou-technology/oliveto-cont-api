// TODO: implement — driven by users.service.spec.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(_email: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async findById(_id: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async create(_dto: CreateUserDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async update(_id: string, _dto: UpdateUserDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async updateRole(_id: string, _dto: any): Promise<any> {
    throw new Error('Not implemented');
  }

  async list(_query: PaginationQueryDto): Promise<any> {
    throw new Error('Not implemented');
  }
}
