import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { Role } from '@common/types/enums';

export class UpdateUserRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class UpdateUserRoleRequest {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}
