import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from '@common/dto/pagination.dto';
import { Role } from '@common/types/enums';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto, UpdateUserRoleDto } from '@modules/users/dto/update-user.dto';
import { UsersService } from '@modules/users/users.service';

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

// Safe user shape — what the service should return (passwordHash stripped)
const safeUser = (overrides: Record<string, unknown> = {}) => {
  const user: Record<string, unknown> = { ...mockUser, ...overrides };
  delete user.passwordHash;
  return user;
};

const prismaP2002 = () =>
  Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: ['email'] } });

const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });

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

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── findByEmail ─────────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return the user when the email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when the email is not registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(dbError());

      await expect(service.findByEmail('john@example.com')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the user when the id exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('cuid_1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'cuid_1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(dbError());

      await expect(service.findById('cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto: CreateUserDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
    };

    it('should hash the password and never store plaintext', async () => {
      mockPrisma.user.create.mockResolvedValue(
        safeUser({ id: 'cuid_2', email: createDto.email, name: createDto.name }),
      );

      await service.create(createDto);

      const callArg = mockPrisma.user.create.mock.calls[0][0];
      expect(callArg.data.passwordHash).toBeDefined();
      expect(callArg.data.passwordHash).not.toBe(createDto.password);
      expect(callArg.data.password).toBeUndefined();

      const isValid = await bcrypt.compare(createDto.password, callArg.data.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should persist and return the created user', async () => {
      const created = safeUser({ id: 'cuid_2', email: createDto.email, name: createDto.name });
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.create(createDto);

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('should store avatarUrl when provided', async () => {
      const dtoWithAvatar: CreateUserDto = {
        ...createDto,
        avatarUrl: 'https://example.com/avatar.png',
      };
      mockPrisma.user.create.mockResolvedValue(safeUser({ avatarUrl: dtoWithAvatar.avatarUrl }));

      await service.create(dtoWithAvatar);

      const callArg = mockPrisma.user.create.mock.calls[0][0];
      expect(callArg.data.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should not expose passwordHash in the returned object', async () => {
      mockPrisma.user.create.mockResolvedValue(safeUser({ email: createDto.email }));

      const result = await service.create(createDto);

      expect(result.passwordHash).toBeUndefined();
    });

    it('should throw ConflictException when the email is already taken', async () => {
      mockPrisma.user.create.mockRejectedValue(prismaP2002());

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate non-P2002 database errors', async () => {
      mockPrisma.user.create.mockRejectedValue(dbError());

      await expect(service.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the user with the changed fields', async () => {
      const dto: UpdateUserDto = { name: 'John Updated' };
      const updated = safeUser({ name: 'John Updated' });
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update('cuid_1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cuid_1' } }),
      );
      expect(result).toEqual(updated);
    });

    it('should update avatarUrl when provided', async () => {
      const dto: UpdateUserDto = { avatarUrl: 'https://example.com/new.png' };
      mockPrisma.user.update.mockResolvedValue(safeUser({ avatarUrl: dto.avatarUrl }));

      await service.update('cuid_1', dto);

      const callArg = mockPrisma.user.update.mock.calls[0][0];
      expect(callArg.data.avatarUrl).toBe('https://example.com/new.png');
    });

    it('should hash the new password and not store plaintext', async () => {
      const dto: UpdateUserDto = { password: 'newpassword123' };
      mockPrisma.user.update.mockResolvedValue(safeUser());

      await service.update('cuid_1', dto);

      const callArg = mockPrisma.user.update.mock.calls[0][0];
      expect(callArg.data.passwordHash).toBeDefined();
      expect(callArg.data.password).toBeUndefined();

      const isValid = await bcrypt.compare(dto.password!, callArg.data.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should not include passwordHash in the update payload when no password is given', async () => {
      const dto: UpdateUserDto = { name: 'No password change' };
      mockPrisma.user.update.mockResolvedValue(safeUser({ name: dto.name }));

      await service.update('cuid_1', dto);

      const callArg = mockPrisma.user.update.mock.calls[0][0];
      expect(callArg.data.passwordHash).toBeUndefined();
    });

    it('should not expose passwordHash in the returned object', async () => {
      mockPrisma.user.update.mockResolvedValue(safeUser());

      const result = await service.update('cuid_1', { name: 'Test' });

      expect(result.passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.user.update.mockRejectedValue(dbError());

      await expect(service.update('cuid_1', { name: 'X' })).rejects.toThrow('Connection refused');
    });
  });

  // ── updateRole ──────────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('should promote a user to EDITOR and return the updated record', async () => {
      const dto: UpdateUserRoleDto = { role: Role.EDITOR };
      const updated = safeUser({ role: Role.EDITOR });
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateRole('cuid_1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cuid_1' },
        data: { role: Role.EDITOR },
        select: expect.any(Object),
      });
      expect(result.role).toBe(Role.EDITOR);
    });

    it('should promote a user to ADMIN', async () => {
      const dto: UpdateUserRoleDto = { role: Role.ADMIN };
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.ADMIN }));

      const result = await service.updateRole('cuid_1', dto);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should demote a user back to USER', async () => {
      const dto: UpdateUserRoleDto = { role: Role.USER };
      mockPrisma.user.update.mockResolvedValue(safeUser({ role: Role.USER }));

      const result = await service.updateRole('cuid_1', dto);

      expect(result.role).toBe(Role.USER);
    });

    it('should throw NotFoundException when the target user does not exist', async () => {
      mockPrisma.user.update.mockRejectedValue(prismaP2025());

      await expect(service.updateRole('nonexistent', { role: Role.ADMIN })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate non-P2025 database errors', async () => {
      mockPrisma.user.update.mockRejectedValue(dbError());

      await expect(service.updateRole('cuid_1', { role: Role.ADMIN })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list()', () => {
    const query: PaginationQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list of users with meta', async () => {
      const users = [safeUser(), safeUser({ id: 'cuid_2', email: 'jane@example.com' })];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.list(query);

      expect(result).toEqual({
        data: users,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('should return empty data and total 0 when no users exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.list(query);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for multi-page results', async () => {
      mockPrisma.user.findMany.mockResolvedValue([safeUser()]);
      mockPrisma.user.count.mockResolvedValue(25);

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should use skip: 0 for the first page', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.list({ page: 1, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should apply correct skip/take for page 2', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(20);

      await service.list({ page: 2, limit: 5 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should never return passwordHash for any user in the list', async () => {
      mockPrisma.user.findMany.mockResolvedValue([safeUser(), safeUser({ id: 'cuid_2' })]);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.list(query);

      result.data.forEach((user: any) => {
        expect(user.passwordHash).toBeUndefined();
      });
    });

    it('should propagate database errors', async () => {
      mockPrisma.user.findMany.mockRejectedValue(dbError());

      await expect(service.list(query)).rejects.toThrow('Connection refused');
    });
  });
});
