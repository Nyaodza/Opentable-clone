export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'viewer';
  googleId?: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}