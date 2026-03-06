import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PaginationQueryRequest } from '@common/dto/pagination.dto';
import { Role } from '@common/types/enums';
import { CreateUserRequest } from '@modules/users/dto/create-user.request';
import { UpdateUserRequest, UpdateUserRoleRequest } from '@modules/users/dto/update-user.request';
import { UsersRepository } from '@modules/users/repository/users.repository';
import { UsersService } from '@modules/users/service/users.service';

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

// Safe user shape — what the repository returns (passwordHash stripped)
const safeUser = (overrides: Record<string, unknown> = {}) => {
  const user: Record<string, unknown> = { ...mockUser, ...overrides };
  delete user.passwordHash;
  return user;
};

const dbError = () => new Error('Connection refused');

const mockUsersRepo = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateRole: jest.fn(),
  findMany: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: mockUsersRepo }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ── findByEmail ─────────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return the user when the email exists', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(mockUsersRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when the email is not registered', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });

    it('should propagate unexpected database errors', async () => {
      mockUsersRepo.findByEmail.mockRejectedValue(dbError());

      await expect(service.findByEmail('john@example.com')).rejects.toThrow('Connection refused');
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the safe user (no passwordHash) when the id exists', async () => {
      mockUsersRepo.findById.mockResolvedValue(safeUser());

      const result = await service.findById('cuid_1');

      expect(mockUsersRepo.findById).toHaveBeenCalledWith('cuid_1');
      expect(result).toEqual(safeUser());
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when the id does not exist', async () => {
      mockUsersRepo.findById.mockRejectedValue(new NotFoundException());

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected database errors', async () => {
      mockUsersRepo.findById.mockRejectedValue(dbError());

      await expect(service.findById('cuid_1')).rejects.toThrow('Connection refused');
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const createDto: CreateUserRequest = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
    };

    it('should hash the password and never store plaintext', async () => {
      mockUsersRepo.create.mockResolvedValue(safeUser({ id: 'cuid_2', email: createDto.email }));

      await service.create(createDto);

      const callArg = mockUsersRepo.create.mock.calls[0][0];
      expect(callArg.passwordHash).toBeDefined();
      expect(callArg.passwordHash).not.toBe(createDto.password);
      expect(callArg.password).toBeUndefined();

      const isValid = await bcrypt.compare(createDto.password, callArg.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should persist and return the created user', async () => {
      const created = safeUser({ id: 'cuid_2', email: createDto.email, name: createDto.name });
      mockUsersRepo.create.mockResolvedValue(created);

      const result = await service.create(createDto);

      expect(mockUsersRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('should pass name, email, and avatarUrl to the repository', async () => {
      const dtoWithAvatar: CreateUserRequest = {
        ...createDto,
        avatarUrl: 'https://example.com/avatar.png',
      };
      mockUsersRepo.create.mockResolvedValue(safeUser({ avatarUrl: dtoWithAvatar.avatarUrl }));

      await service.create(dtoWithAvatar);

      const callArg = mockUsersRepo.create.mock.calls[0][0];
      expect(callArg.name).toBe(createDto.name);
      expect(callArg.email).toBe(createDto.email);
      expect(callArg.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should not expose passwordHash in the returned object', async () => {
      mockUsersRepo.create.mockResolvedValue(safeUser({ email: createDto.email }));

      const result = await service.create(createDto);

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException when the email is already taken', async () => {
      mockUsersRepo.create.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate non-conflict database errors', async () => {
      mockUsersRepo.create.mockRejectedValue(dbError());

      await expect(service.create(createDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update and return the user with the changed fields', async () => {
      const dto: UpdateUserRequest = { name: 'John Updated' };
      const updated = safeUser({ name: 'John Updated' });
      mockUsersRepo.update.mockResolvedValue(updated);

      const result = await service.update('cuid_1', dto);

      const [calledId] = mockUsersRepo.update.mock.calls[0];
      expect(calledId).toBe('cuid_1');
      expect(result).toEqual(updated);
    });

    it('should update avatarUrl when provided', async () => {
      const dto: UpdateUserRequest = { avatarUrl: 'https://example.com/new.png' };
      mockUsersRepo.update.mockResolvedValue(safeUser({ avatarUrl: dto.avatarUrl }));

      await service.update('cuid_1', dto);

      const [, calledData] = mockUsersRepo.update.mock.calls[0];
      expect(calledData.avatarUrl).toBe('https://example.com/new.png');
    });

    it('should hash the new password and not store plaintext', async () => {
      const dto: UpdateUserRequest = { password: 'newpassword123' };
      mockUsersRepo.update.mockResolvedValue(safeUser());

      await service.update('cuid_1', dto);

      const [, calledData] = mockUsersRepo.update.mock.calls[0];
      expect(calledData.passwordHash).toBeDefined();
      expect(calledData.password).toBeUndefined();

      const isValid = await bcrypt.compare(dto.password!, calledData.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should not include passwordHash in the update payload when no password is given', async () => {
      const dto: UpdateUserRequest = { name: 'No password change' };
      mockUsersRepo.update.mockResolvedValue(safeUser({ name: dto.name }));

      await service.update('cuid_1', dto);

      const [, calledData] = mockUsersRepo.update.mock.calls[0];
      expect(calledData.passwordHash).toBeUndefined();
    });

    it('should not expose passwordHash in the returned object', async () => {
      mockUsersRepo.update.mockResolvedValue(safeUser());

      const result = await service.update('cuid_1', { name: 'Test' });

      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      mockUsersRepo.update.mockRejectedValue(new NotFoundException());

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should propagate non-404 database errors', async () => {
      mockUsersRepo.update.mockRejectedValue(dbError());

      await expect(service.update('cuid_1', { name: 'X' })).rejects.toThrow('Connection refused');
    });
  });

  // ── updateRole ──────────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('should promote a user to EDITOR and return the updated record', async () => {
      const dto: UpdateUserRoleRequest = { role: Role.EDITOR };
      const updated = safeUser({ role: Role.EDITOR });
      mockUsersRepo.updateRole.mockResolvedValue(updated);

      const result = await service.updateRole('cuid_1', dto);

      expect(mockUsersRepo.updateRole).toHaveBeenCalledWith('cuid_1', Role.EDITOR);
      expect(result.role).toBe(Role.EDITOR);
    });

    it('should promote a user to ADMIN', async () => {
      const dto: UpdateUserRoleRequest = { role: Role.ADMIN };
      mockUsersRepo.updateRole.mockResolvedValue(safeUser({ role: Role.ADMIN }));

      const result = await service.updateRole('cuid_1', dto);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should demote a user back to USER', async () => {
      const dto: UpdateUserRoleRequest = { role: Role.USER };
      mockUsersRepo.updateRole.mockResolvedValue(safeUser({ role: Role.USER }));

      const result = await service.updateRole('cuid_1', dto);

      expect(result.role).toBe(Role.USER);
    });

    it('should throw NotFoundException when the target user does not exist', async () => {
      mockUsersRepo.updateRole.mockRejectedValue(new NotFoundException());

      await expect(service.updateRole('nonexistent', { role: Role.ADMIN })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate non-404 database errors', async () => {
      mockUsersRepo.updateRole.mockRejectedValue(dbError());

      await expect(service.updateRole('cuid_1', { role: Role.ADMIN })).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe('list()', () => {
    const query: PaginationQueryRequest = { page: 1, limit: 10 };

    it('should return a paginated list of users with meta', async () => {
      const users = [safeUser(), safeUser({ id: 'cuid_2', email: 'jane@example.com' })];
      mockUsersRepo.findMany.mockResolvedValue({ users, total: 2 });

      const result = await service.list(query);

      expect(result).toEqual({
        data: users,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });

    it('should return empty data and total 0 when no users exist', async () => {
      mockUsersRepo.findMany.mockResolvedValue({ users: [], total: 0 });

      const result = await service.list(query);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate correct totalPages for multi-page results', async () => {
      mockUsersRepo.findMany.mockResolvedValue({ users: [safeUser()], total: 25 });

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should use skip: 0 for the first page', async () => {
      mockUsersRepo.findMany.mockResolvedValue({ users: [], total: 0 });

      await service.list({ page: 1, limit: 10 });

      expect(mockUsersRepo.findMany).toHaveBeenCalledWith(0, 10);
    });

    it('should apply correct skip/take for page 2', async () => {
      mockUsersRepo.findMany.mockResolvedValue({ users: [], total: 20 });

      await service.list({ page: 2, limit: 5 });

      expect(mockUsersRepo.findMany).toHaveBeenCalledWith(5, 5);
    });

    it('should never return passwordHash for any user in the list', async () => {
      mockUsersRepo.findMany.mockResolvedValue({
        users: [safeUser(), safeUser({ id: 'cuid_2' })],
        total: 2,
      });

      const result = await service.list(query);

      result.data.forEach((user: any) => {
        expect(user.passwordHash).toBeUndefined();
      });
    });

    it('should propagate database errors', async () => {
      mockUsersRepo.findMany.mockRejectedValue(dbError());

      await expect(service.list(query)).rejects.toThrow('Connection refused');
    });
  });
});
