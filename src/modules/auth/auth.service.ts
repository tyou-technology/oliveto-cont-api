// TODO: implement — driven by auth.service.spec.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(_dto: RegisterDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async login(_dto: LoginDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async validateUser(_email: string, _password: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async refresh(_dto: RefreshTokenDto): Promise<any> {
    throw new Error('Not implemented');
  }

  async logout(_dto: RefreshTokenDto): Promise<any> {
    throw new Error('Not implemented');
  }
}
