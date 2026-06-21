import { api, setTokens, clearTokens, getRefreshToken } from "./api";
import type { RegisterInput, LoginInput, UserDTO, AuthTokens } from "@smart-lorry/shared";

export async function registerRequest(input: RegisterInput): Promise<UserDTO> {
  const res = await api.post<{ user: UserDTO; tokens: AuthTokens }>("/auth/register", input);
  setTokens(res.data.tokens);
  return res.data.user;
}

export async function loginRequest(input: LoginInput): Promise<UserDTO> {
  const res = await api.post<{ user: UserDTO; tokens: AuthTokens }>("/auth/login", input);
  setTokens(res.data.tokens);
  return res.data.user;
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // best-effort — clear local tokens regardless
    }
  }
  clearTokens();
}

export async function fetchMe(): Promise<UserDTO> {
  const res = await api.get<UserDTO>("/users/me");
  return res.data;
}
