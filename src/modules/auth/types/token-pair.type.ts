export interface TokenPair {
  type: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
