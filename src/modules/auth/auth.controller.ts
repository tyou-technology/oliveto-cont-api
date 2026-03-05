// TODO: implement — driven by auth.controller.spec.ts
import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(_dto: RegisterDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async login(_dto: LoginDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async refresh(_dto: RefreshTokenDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async logout(_dto: RefreshTokenDto, _user: any): Promise<any> {
    throw new Error('Not implemented');
  }
}
