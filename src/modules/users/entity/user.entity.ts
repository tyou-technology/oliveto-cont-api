import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@common/types/enums';

export class UserEntity {
  @ApiProperty({ example: 'clx7abc123' })
  id: string;

  @ApiProperty({ example: 'joao@empresa.com.br' })
  email: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiPropertyOptional({ example: 'https://cdn.oliveto.com.br/avatars/joao.png' })
  avatarUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
