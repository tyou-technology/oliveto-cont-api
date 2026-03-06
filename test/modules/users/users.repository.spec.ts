import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ERROR_MESSAGES } from '@common/constants/error-messages';
import { Role } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateUserData, UpdateUserData, UsersRepository } from '@modules/users/repository/users.repository';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'cuid_1',
  email: 'john@example.com',
  name: 'John Doe',
  passwordHash: 'hashed_password',
  role: Role.USER,
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Mirrors what USER_SELECT returns — no passwordHash
const safeUser = (overrides: Record<string, unknown> = {}) => {
  const { passwordHash: _, ...base } = { ...mockUser, ...overrides };
  return base;
};

const prismaP2002 = () =>
  Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: ['email'] } });

const prismaP2025 = () =>
  Object.assign(new Error('Record not found'), { code: 'P2025' });

const dbError = () => new Error('Connection refused');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersRepository', () => {
  let repo: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repo = module.get<UsersRepository>(UsersRepository);
    jest.clearAllMocks();
  });

  // ── findByEmail ─────────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return the full user record including passwordHash when the email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repo.findByEmail('john@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockUser);
      expect(result?.passwordHash).toBe('hashed_password');
    });

    it('should return null when the email is not registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repo.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(dbError());

      await expect(repo.findByEmail('john@example.com')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the safe user record (no passwordHash) when the id exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser());

      const result = await repo.findById('cuid_1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cuid_1' } }),
      );
      expect(result).toEqual(safeUser());
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(repo.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should use the USER_NOT_FOUND error message in the NotFoundException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(repo.findById('nonexistent')).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(dbError());

      await expect(repo.findById('cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createData: CreateUserData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: 'bcrypt_hash',
    };

    it('should call prisma.user.create with the provided data', async () => {
      mockPrisma.user.create.mockResolvedValue(safeUser({ email: createData.email }));

      await repo.create(createData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createData }),
      );
    });

    it('should use a select that excludes passwordHash from the returned record', async () => {
      const created = safeUser({ email: createData.email, name: createData.name });
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await repo.create(createData);

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should persist avatarUrl when provided', async () => {
      const dataWithAvatar: CreateUserData = {
        ...createData,
        avatarUrl: 'https://example.com/avatar.png',
      };
      mockPrisma.user.create.mockResolvedValue(safeUser({ avatarUrl: dataWithAvatar.avatarUrl }));

      await repo.create(dataWithAvatar);

      const callArg = mockPrisma.user.create.mock.calls[0][0];
      expect(callArg.data.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should return the created user record', async () => {
      const created = safeUser({ id: 'cuid_2', email: createData.email });
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await repo.create(createData);

      expect(result).toEqual(created);
    });

    it('should throw ConflictException when the email is already taken (P2002)', async () => {
      mockPrisma.user.create.mockRejectedValue(prismaP2002());

      await expect(repo.create(createData)).rejects.toThrow(ConflictException);
    });

    it('should use the EMAIL_ALREADY_EXISTS message in the ConflictException', async () => {
      mockPrisma.user.create.mockRejectedValue(prismaP2002());

      await expect(repo.create(createData)).rejects.toThrow(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    });

    it('should propagate non-P2002 database errors', async () => {
      mockPrisma.user.create.mockRejectedValue(dbError());

      await expect(repo.create(createData)).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const updateData: UpdateUserData = { name: 'John Updated' };

    it('should call prisma.user.update with the correct where clause and data', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ name: updateData.name }));

      await repo.update('cuid_1', updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cuid_1' },
          data: updateData,
        }),
      );
    });

    it('should use a select that excludes passwordHash from the returned record', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ name: updateData.name }));

      const result = await repo.update('cuid_1', updateData);

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should return the updated user record', async () => {
      const updated = safeUser({ name: 'John Updated' });
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await repo.update('cuid_1', updateData);

      expect(result).toEqual(updated);
    });

    it('should update avatarUrl when provided', async () => {
      const data: UpdateUserData = { avatarUrl: 'https://example.com/new.png' };
      mockPrisma.user.update.mockResolvedValue(safeUser({ avatarUrl: data.avatarUrl }));

      await repo.update('cuid_1', data);

      const callArg = mockPrisma.user.update.mock.calls[0][0];
      expect(callArg.data.avatarUrl).toBe('https://example.com/new.png');
    });

    it('should update passwordHash when provided', async () => {
      const data: UpdateUserData = { passwordHash: 'new_bcrypt_hash' };
      mockPrisma.user.update.mockResolvedValue(safeUser());

      await repo.update('cuid_1', data);

      const callArg = mockPrisma.user.update.mock.calls[0][0];
      expect(callArg.data.passwordHash).toBe('new_bcrypt_hash');
    });

    it('should throw NotFoundException when the user does not exist (P2025)', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(repo.update('nonexistent', updateData)).rejects.toThrow(NotFoundException);
    });

    it('should use the USER_NOT_FOUND message in the NotFoundException', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(repo.update('nonexistent', updateData)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.user.update.mockRejectedValue(dbError());

      await expect(repo.update('cuid_1', updateData)).rejects.toThrow('Connection refused');
    });
  });

  // ── updateRole ──────────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('should call prisma.user.update with the correct id and role', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.EDITOR }));

      await repo.updateRole('cuid_1', Role.EDITOR);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cuid_1' },
          data: { role: Role.EDITOR },
        }),
      );
    });

    it('should use a select that excludes passwordHash from the returned record', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.EDITOR }));

      const result = await repo.updateRole('cuid_1', Role.EDITOR);

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should return the updated user with the new role', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.ADMIN }));

      const result = await repo.updateRole('cuid_1', Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should support promotion to EDITOR', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.EDITOR }));

      const result = await repo.updateRole('cuid_1', Role.EDITOR);

      expect(result.role).toBe(Role.EDITOR);
    });

    it('should support demotion back to USER', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.USER }));

      const result = await repo.updateRole('cuid_1', Role.USER);

      expect(result.role).toBe(Role.USER);
    });

    it('should throw NotFoundException when the user does not exist (P2025)', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(repo.updateRole('nonexistent', Role.ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('should use the USER_NOT_FOUND message in the NotFoundException', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(repo.updateRole('nonexistent', Role.ADMIN)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.user.update.mockRejectedValue(dbError());

      await expect(repo.updateRole('cuid_1', Role.ADMIN)).rejects.toThrow('Connection refused');
    });
  });

  // ── findMany ────────────────────────────────────────────────────────────────

  describe('findMany()', () => {
    it('should return users and total count', async () => {
      const users = [safeUser(), safeUser({ id: 'cuid_2', email: 'jane@example.com' })];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await repo.findMany(0, 10);

      expect(result).toEqual({ users, total: 2 });
    });

    it('should call findMany with the correct skip and take', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repo.findMany(10, 5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should use skip: 0 and take: 10 for the first page', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await repo.findMany(0, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should use a select that excludes passwordHash from each returned user', async () => {
      const users = [safeUser()];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await repo.findMany(0, 10);

      result.users.forEach((user: any) => {
        expect(user.passwordHash).toBeUndefined();
      });
    });

    it('should return empty users array and total 0 when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await repo.findMany(0, 10);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should run findMany and count in parallel', async () => {
      let findManyResolved = false;
      let countResolved = false;

      mockPrisma.user.findMany.mockImplementation(
        () => new Promise((res) => setTimeout(() => { findManyResolved = true; res([]); }, 0)),
      );
      mockPrisma.user.count.mockImplementation(
        () => new Promise((res) => setTimeout(() => { countResolved = true; res(0); }, 0)),
      );

      await repo.findMany(0, 10);

      expect(findManyResolved).toBe(true);
      expect(countResolved).toBe(true);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    });

    it('should propagate database errors from findMany', async () => {
      mockPrisma.user.findMany.mockRejectedValue(dbError());
      mockPrisma.user.count.mockResolvedValue(0);

      await expect(repo.findMany(0, 10)).rejects.toThrow('Connection refused');
    });

    it('should propagate database errors from count', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockRejectedValue(dbError());

      await expect(repo.findMany(0, 10)).rejects.toThrow('Connection refused');
    });
  });
});
