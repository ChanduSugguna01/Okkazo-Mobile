export type UserRole = "USER" | "ADMIN" | "VENDOR" | "MANAGER" | string;

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  authProvider: string;
  message: string;
  success: boolean;
}

export interface UserProfile {
  id?: string;
  _id?: string;
  authId?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  assignedRole?: string | null;
  department?: string | null;
  isActive?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  authProvider: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}
