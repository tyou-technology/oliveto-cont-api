import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Index signature lets TypeScript resolve model delegates (user, article, etc.)
  // injected at runtime by PrismaClient — will be fully typed once `prisma generate` runs.
  [key: string]: any;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
