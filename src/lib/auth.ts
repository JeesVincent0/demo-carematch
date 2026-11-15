import { compare } from 'bcryptjs';
import { DEMO_EVENT, DEMO_SESSION_KEY, getDemoData } from './demo/store';
import { userView } from './demo/repository';
import type { Role } from './demo/types';
export async function currentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const session = JSON.parse(window.sessionStorage.getItem(DEMO_SESSION_KEY) || 'null') as {
      id: string;
      version: number;
    } | null;
    if (!session) return null;
    const data = getDemoData();
    const u = data.users.find(
      (u) => u.id === session.id && u.status === 'ACTIVE' && u.sessionVersion === session.version,
    );
    return u ? userView(data, u.id) : null;
  } catch {
    return null;
  }
}
export async function requireUser(role?: Role) {
  const u = await currentUser();
  if (!u) throw new Error('Please sign in to this demo tab.');
  if (role && u.role !== role) throw new Error('This action requires a different demo role.');
  return u;
}
export async function signIn(
  _provider: string,
  options: { email: string; password: string; redirect?: boolean },
) {
  const data = getDemoData();
  const u = data.users.find((u) => u.email === options.email.trim().toLowerCase());
  if (!u || u.status !== 'ACTIVE' || !(await compare(options.password, u.passwordHash)))
    return { error: 'Invalid demo sign-in' };
  window.sessionStorage.setItem(
    DEMO_SESSION_KEY,
    JSON.stringify({ id: u.id, version: u.sessionVersion }),
  );
  window.dispatchEvent(new Event(DEMO_EVENT));
  return { ok: true };
}
export function signOut(options: { callbackUrl: string }) {
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  window.dispatchEvent(new Event(DEMO_EVENT));
  window.location.assign(options.callbackUrl);
}
