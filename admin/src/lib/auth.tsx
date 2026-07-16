import { createContext, useContext, useState, type ReactNode } from "react";
import { getToken, setToken } from "./axios";

interface AuthCtx {
  authed: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(!!getToken());
  return (
    <Ctx.Provider
      value={{
        authed,
        login: (t) => {
          setToken(t);
          setAuthed(true);
        },
        logout: () => {
          setToken(null);
          setAuthed(false);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
