import { Role } from '@common/types/enums';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}
