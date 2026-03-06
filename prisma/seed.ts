import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oliveto.com.br' },
    update: {},
    create: {
      email: 'admin@oliveto.com.br',
      name: 'Admin Oliveto',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
