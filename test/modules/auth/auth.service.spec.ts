import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '@common/types/enums';
import { UsersService } from '@modules/users/users.service';
import { AuthService } from '@modules/auth/auth.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'cuid_1',
  email: 'john@example.com',
  name: 'John Doe',
  passwordHash: '$2b$10$hashedpassword',
  role: Role.USER,
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const safeUser = (overrides: Record<string, unknown> = {}) => {
  const user: Record<string, unknown> = { ...mockUser, ...overrides };
  delete user.passwordHash;
  return user;
};

const tokenPair = {
  accessToken: 'signed.access.token',
  refreshToken: 'signed.refresh.token',
};

const dbError = () => new Error('Connection refused');

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-access-secret-32chars-long!',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret-32chars-long',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key];
  }),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register()', () => {
    const registerDto: RegisterDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    };

    it('should create a new user via UsersService and return a token pair', async () => {
      const created = safeUser({
        id: 'cuid_2',
        email: registerDto.email,
        name: registerDto.name,
      });
      mockUsersService.create.mockResolvedValue(created);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokenPair.accessToken)
        .mockResolvedValueOnce(tokenPair.refreshToken);

      const result = await service.register(registerDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
          password: registerDto.password,
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should sign the access token with the user id, email, and role', async () => {
      const created = safeUser({
        id: 'cuid_2',
        email: registerDto.email,
        role: Role.USER,
      });
      mockUsersService.create.mockResolvedValue(created);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokenPair.accessToken)
        .mockResolvedValueOnce(tokenPair.refreshToken);

      await service.register(registerDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'cuid_2',
          email: registerDto.email,
          role: Role.USER,
        }),
        expect.objectContaining({
          secret: 'test-access-secret-32chars-long!',
          expiresIn: '15m',
        }),
      );
    });

    it('should sign the refresh token with a different secret', async () => {
      const created = safeUser({ id: 'cuid_2', email: registerDto.email });
      mockUsersService.create.mockResolvedValue(created);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokenPair.accessToken)
        .mockResolvedValueOnce(tokenPair.refreshToken);

      await service.register(registerDto);

      // Second signAsync call is the refresh token
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: 'cuid_2' }),
        expect.objectContaining({
          secret: 'test-refresh-secret-32chars-long',
          expiresIn: '7d',
        }),
      );
    });

    it('should throw ConflictException when the email is already registered', async () => {
      mockUsersService.create.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate unexpected errors from UsersService', async () => {
      mockUsersService.create.mockRejectedValue(dbError());

      await expect(service.register(registerDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── validateUser ────────────────────────────────────────────────────────────

  describe('validateUser()', () => {
    it('should return the user (without passwordHash) when credentials are valid', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      const userWithHash = { ...mockUser, passwordHash: hash };
      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      const result = await service.validateUser('john@example.com', 'correct-password');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException when the email is not registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('nobody@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when the password is wrong', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(service.validateUser('john@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should propagate unexpected database errors', async () => {
      mockUsersService.findByEmail.mockRejectedValue(dbError());

      await expect(service.validateUser('john@example.com', 'password')).rejects.toThrow(
        'Connection refused',
      );
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'correct-password',
    };

    it('should validate credentials and return a token pair', async () => {
      const hash = await bcrypt.hash(loginDto.password, 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokenPair.accessToken)
        .mockResolvedValueOnce(tokenPair.refreshToken);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('other-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should not leak whether the email or password was wrong', async () => {
      // Both cases must produce the same UnauthorizedException to prevent enumeration
      mockUsersService.findByEmail.mockResolvedValue(null);
      const errNoEmail = await service.login(loginDto).catch((e) => e);

      const hash = await bcrypt.hash('other-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });
      const errBadPwd = await service.login(loginDto).catch((e) => e);

      expect(errNoEmail).toBeInstanceOf(UnauthorizedException);
      expect(errBadPwd).toBeInstanceOf(UnauthorizedException);
      expect(errNoEmail.message).toBe(errBadPwd.message);
    });

    it('should include the user role in the access token payload', async () => {
      const hash = await bcrypt.hash(loginDto.password, 10);
      const adminUser = { ...mockUser, role: Role.ADMIN, passwordHash: hash };
      mockUsersService.findByEmail.mockResolvedValue(adminUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokenPair.accessToken)
        .mockResolvedValueOnce(tokenPair.refreshToken);

      await service.login(loginDto);

      // First signAsync call is the access token
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ role: Role.ADMIN }),
        expect.any(Object),
      );
    });

    it('should propagate unexpected errors', async () => {
      mockUsersService.findByEmail.mockRejectedValue(dbError());

      await expect(service.login(loginDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    const refreshDto: RefreshTokenDto = { refreshToken: 'valid.refresh.token' };

    it('should verify the refresh token and return a new token pair', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new.access.token')
        .mockResolvedValueOnce('new.refresh.token');

      const result = await service.refresh(refreshDto);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        expect.objectContaining({ secret: 'test-refresh-secret-32chars-long' }),
      );
      expect(result).toHaveProperty('accessToken', 'new.access.token');
      expect(result).toHaveProperty('refreshToken', 'new.refresh.token');
    });

    it('should sign the new access token with the payload from the old refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: Role.EDITOR,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new.access.token')
        .mockResolvedValueOnce('new.refresh.token');

      await service.refresh(refreshDto);

      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          role: Role.EDITOR,
        }),
        expect.objectContaining({ secret: 'test-access-secret-32chars-long!' }),
      );
    });

    it('should throw UnauthorizedException when the refresh token is expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the refresh token signature is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(service.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the refresh token is malformed', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(service.refresh({ refreshToken: 'garbage' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    const logoutDto: RefreshTokenDto = { refreshToken: 'valid.refresh.token' };

    it('should accept a valid refresh token and return successfully', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        jti: 'token-unique-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(service.logout(logoutDto)).resolves.not.toThrow();
    });

    it('should verify the refresh token before invalidating it', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        jti: 'token-unique-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await service.logout(logoutDto);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        logoutDto.refreshToken,
        expect.objectContaining({ secret: 'test-refresh-secret-32chars-long' }),
      );
    });

    it('should throw UnauthorizedException when the refresh token is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(service.logout(logoutDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the refresh token is expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.logout(logoutDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
