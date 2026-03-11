import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AUTH_ERROR_MESSAGES } from '@modules/auth/constants/auth.constants';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { TokenPair } from '@modules/auth/types/token-pair.type';
import { JwtRawPayload } from '@modules/auth/types/jwt-raw-payload.type';
import { JwtPayload } from '@common/types/jwt-payload.type';
import { UsersService } from '@modules/users/service/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const user = await this.usersService.create(dto);
    return this.issueTokenPair(user);
  }

  async validateUser(email: string, password: string): Promise<JwtPayload> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.issueTokenPair(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: JwtRawPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtRawPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    return this.issueTokenPair({ id: payload.sub, email: payload.email, role: payload.role });
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    try {
      await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  private async issueTokenPair(user: JwtPayload): Promise<TokenPair> {
    const accessPayload: JwtRawPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = { sub: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      type: 'Bearer',
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
    };
  }
}
