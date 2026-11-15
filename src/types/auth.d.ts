import 'next-auth';
import type { Role } from '@prisma/client';
declare module 'next-auth' {
  interface User {
    role: Role;
    sessionVersion: number;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      sessionVersion: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
