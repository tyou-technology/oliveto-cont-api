import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@common/types/jwt-payload.type';
import {
  AUTH_ACTIONS,
  AUTH_ERROR_MESSAGES,
  AUTH_ROUTES,
  REFRESH_TOKEN_COOKIE,
} from '@modules/auth/constants/auth.constants';
import { enrichEvent } from '@common/utils/enrich-event.util';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { TokenResponseDto } from '@modules/auth/dto/token-response.dto';
import { AccessTokenResponse } from '@modules/auth/types/access-token-response.type';
import { AuthService } from '@modules/auth/service/auth.service';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

@ApiTags('auth')
@Throttle({ strict: { ttl: 60000, limit: 10 } })
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ type: TokenResponseDto, description: 'Access token issued; refresh token set as HttpOnly cookie' })
  @Public()
  @Post(AUTH_ROUTES.REGISTER)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    enrichEvent(req, { auth: { action: AUTH_ACTIONS.REGISTER } });
    return { type: tokens.type, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ type: TokenResponseDto, description: 'Access token issued; refresh token set as HttpOnly cookie' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.LOGIN)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    enrichEvent(req, { auth: { action: AUTH_ACTIONS.LOGIN } });
    return { type: tokens.type, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @ApiOperation({ summary: 'Refresh access token using the HttpOnly refresh token cookie' })
  @ApiOkResponse({ type: TokenResponseDto, description: 'New access token issued; new refresh token cookie set' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid refresh token cookie' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.REFRESH)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.MISSING_REFRESH_TOKEN);
    }

    const tokens = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    enrichEvent(req, { auth: { action: AUTH_ACTIONS.REFRESH } });
    return { type: tokens.type, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @ApiOperation({ summary: 'Logout and clear the refresh token cookie' })
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  @ApiBearerAuth()
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(AUTH_ROUTES.LOGOUT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(process.env.NODE_ENV === 'production'));
    enrichEvent(req, { auth: { action: AUTH_ACTIONS.LOGOUT, user_id: currentUser?.id } });
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...refreshCookieOptions(process.env.NODE_ENV === 'production'),
      maxAge: SEVEN_DAYS_MS,
    });
  }
}
