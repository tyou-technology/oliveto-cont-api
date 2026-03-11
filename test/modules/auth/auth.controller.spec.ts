import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { Role } from '@common/types/enums';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const tokenPair = {
  type: 'Bearer' as const,
  accessToken: 'signed.access.token',
  refreshToken: 'signed.refresh.token',
  expiresIn: '15m',
};

const mockCurrentUser = {
  id: 'cuid_1',
  email: 'john@example.com',
  role: Role.USER,
};

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ── POST /auth/register ─────────────────────────────────────────────────────

  describe('register()', () => {
    const registerDto: RegisterDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    };

    it('should delegate to AuthService.register and return the token pair', async () => {
      mockAuthService.register.mockResolvedValue(tokenPair);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(tokenPair);
    });

    it('should propagate ConflictException when email is taken', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should propagate unexpected errors from the service', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Connection refused'));

      await expect(controller.register(registerDto)).rejects.toThrow('Connection refused');
    });
  });

  // ── POST /auth/login ────────────────────────────────────────────────────────

  describe('login()', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'correct-password',
    };

    it('should delegate to AuthService.login and return the token pair', async () => {
      mockAuthService.login.mockResolvedValue(tokenPair);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(tokenPair);
    });

    it('should propagate UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── POST /auth/refresh ──────────────────────────────────────────────────────

  describe('refresh()', () => {
    const refreshDto: RefreshTokenDto = { refreshToken: 'valid.refresh.token' };

    it('should delegate to AuthService.refresh and return a new token pair', async () => {
      const newTokens = {
        type: 'Bearer' as const,
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        expiresIn: '15m',
      };
      mockAuthService.refresh.mockResolvedValue(newTokens);

      const result = await controller.refresh(refreshDto);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(newTokens);
    });

    it('should propagate UnauthorizedException for expired refresh token', async () => {
      mockAuthService.refresh.mockRejectedValue(new UnauthorizedException('Refresh token expired'));

      await expect(controller.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refresh.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── POST /auth/logout ───────────────────────────────────────────────────────

  describe('logout()', () => {
    const logoutDto: RefreshTokenDto = { refreshToken: 'valid.refresh.token' };

    it('should delegate to AuthService.logout and return no content (204)', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(logoutDto, mockCurrentUser as any);

      expect(mockAuthService.logout).toHaveBeenCalledWith(logoutDto);
      expect(result).toBeUndefined();
    });

    it('should propagate UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.logout.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.logout(logoutDto, mockCurrentUser as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
