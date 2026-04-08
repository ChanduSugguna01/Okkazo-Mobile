import { request } from "@/src/lib/api";
import { ApiEnvelope, LoginResponse, UserProfile } from "@/src/types/auth";

export const loginWithEmail = async (email: string, password: string) => {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
};

export const loginWithGoogle = async (accessToken: string) => {
  return request<LoginResponse>("/auth/google/login", {
    method: "POST",
    body: { accessToken },
  });
};

export const fetchMyProfile = async (token: string) => {
  const response = await request<ApiEnvelope<UserProfile>>("/api/users/me", {
    token,
  });

  return response.data;
};
