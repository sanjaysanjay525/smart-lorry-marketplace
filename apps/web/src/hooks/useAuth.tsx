import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserDTO, RegisterInput, LoginInput } from "@smart-lorry/shared";
import { getAccessToken } from "../lib/api";
import { fetchMe, loginRequest, logoutRequest, registerRequest } from "../lib/auth";

interface AuthContextValue {
  user: UserDTO | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(input: LoginInput) {
    const me = await loginRequest(input);
    setUser(me);
  }

  async function register(input: RegisterInput) {
    const me = await registerRequest(input);
    setUser(me);
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
