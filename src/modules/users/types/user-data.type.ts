export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  passwordHash?: string;
}
