import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginationQueryDto } from '@common/dto/pagination.dto';
import { Role } from '@common/types/enums';
import { UpdateUserDto, UpdateUserRoleDto } from '@modules/users/dto/update-user.dto';
import { UsersController } from '@modules/users/users.controller';
import { UsersService } from '@modules/users/users.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'cuid_1',
  email: 'john@example.com',
  name: 'John Doe',
  role: Role.USER,
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockAdminUser = { ...mockUser, id: 'cuid_admin', role: Role.ADMIN };

const mockUsersService = {
  findById: jest.fn(),
  update: jest.fn(),
  updateRole: jest.fn(),
  list: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  // ── GET /users/me ───────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('should return the current authenticated user profile', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockUser as any);

      expect(mockUsersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should propagate NotFoundException if user no longer exists', async () => {
      mockUsersService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.getMe(mockUser as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── PATCH /users/me ─────────────────────────────────────────────────────────

  describe('updateMe()', () => {
    const dto: UpdateUserDto = { name: 'John Updated' };

    it('should update and return the current user profile', async () => {
      const updated = { ...mockUser, name: 'John Updated' };
      mockUsersService.update.mockResolvedValue(updated);

      const result = await controller.updateMe(mockUser as any, dto);

      expect(mockUsersService.update).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(updated);
    });

    it('should only update the authenticated user own profile — not another user', async () => {
      const anotherUserId = 'cuid_other';
      mockUsersService.update.mockResolvedValue({ ...mockUser, id: anotherUserId });

      // Controller must pass currentUser.id, never an id from a route param
      await controller.updateMe(mockUser as any, dto);

      const calledId = mockUsersService.update.mock.calls[0][0];
      expect(calledId).toBe(mockUser.id);
      expect(calledId).not.toBe(anotherUserId);
    });
  });

  // ── GET /users ──────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    const query: PaginationQueryDto = { page: 1, limit: 10 };

    it('should return a paginated list when called by an admin', async () => {
      const paginatedResult = {
        data: [mockUser, mockAdminUser],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };
      mockUsersService.list.mockResolvedValue(paginatedResult);

      const result = await controller.listUsers(query);

      expect(mockUsersService.list).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass pagination query to the service', async () => {
      const bigQuery: PaginationQueryDto = { page: 3, limit: 20 };
      mockUsersService.list.mockResolvedValue({ data: [], meta: {} });

      await controller.listUsers(bigQuery);

      expect(mockUsersService.list).toHaveBeenCalledWith(bigQuery);
    });
  });

  // ── PATCH /users/:id/role ───────────────────────────────────────────────────

  describe('updateUserRole()', () => {
    const dto: UpdateUserRoleDto = { role: Role.EDITOR };

    it('should update and return the user with the new role', async () => {
      const updated = { ...mockUser, role: Role.EDITOR };
      mockUsersService.updateRole.mockResolvedValue(updated);

      const result = await controller.updateUserRole('cuid_1', dto);

      expect(mockUsersService.updateRole).toHaveBeenCalledWith('cuid_1', dto);
      expect(result.role).toBe(Role.EDITOR);
    });

    it('should throw NotFoundException when the target user does not exist', async () => {
      mockUsersService.updateRole.mockRejectedValue(new NotFoundException());

      await expect(controller.updateUserRole('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent an admin from demoting themselves', async () => {
      // The controller must guard against self-role-change
      mockUsersService.updateRole.mockResolvedValue(mockAdminUser);

      await expect(
        controller.updateUserRole(mockAdminUser.id, { role: Role.USER }, mockAdminUser as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
