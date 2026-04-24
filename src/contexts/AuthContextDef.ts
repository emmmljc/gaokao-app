import { createContext } from 'react'
import type { AuthResponse } from '@/types'

export interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  wechatLogin: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null)
