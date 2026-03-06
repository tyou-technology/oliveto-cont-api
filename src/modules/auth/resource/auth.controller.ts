import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AUTH_ACTIONS, AUTH_ROUTES } from '@modules/auth/constants/auth.constants';
import { enrichEvent } from '@common/utils/enrich-event.util';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { AuthService } from '@modules/auth/service/auth.service';

@ApiTags('auth')
@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({ description: 'Token pair issued' })
  @Public()
  @Post(AUTH_ROUTES.REGISTER)
  async register(@Body() dto: RegisterDto, @Req() req?: Request) {
    const tokens = await this.authService.register(dto);

    enrichEvent(req, { auth: { action: AUTH_ACTIONS.REGISTER } });

    return tokens;
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Token pair issued' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.LOGIN)
  async login(@Body() dto: LoginDto, @Req() req?: Request) {
    const tokens = await this.authService.login(dto);

    enrichEvent(req, { auth: { action: AUTH_ACTIONS.LOGIN } });

    return tokens;
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({ description: 'New token pair issued' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.REFRESH)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req?: Request) {
    const tokens = await this.authService.refresh(dto);

    enrichEvent(req, { auth: { action: AUTH_ACTIONS.REFRESH } });

    return tokens;
  }

  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiOkResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post(AUTH_ROUTES.LOGOUT)
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() currentUser: any,
    @Req() req?: Request,
  ) {
    await this.authService.logout(dto);

    enrichEvent(req, { auth: { action: AUTH_ACTIONS.LOGOUT, user_id: currentUser?.id } });
  }
}
