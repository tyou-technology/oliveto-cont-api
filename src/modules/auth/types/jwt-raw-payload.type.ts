import { Role } from '@common/types/enums';

export interface JwtRawPayload {
  sub: string;
  email: string;
  role: Role;
}
