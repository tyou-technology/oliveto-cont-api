import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresIn: string;
}
