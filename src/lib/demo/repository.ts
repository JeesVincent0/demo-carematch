import { getDemoData } from './store';
import type { DemoData, User, Worker, RequestWithPeople } from './types';
export type Where = Record<string, unknown>;
type Query = {
  where?: Where;
  orderBy?: Record<string, string> | Record<string, string>[];
  skip?: number;
  take?: number;
  select?: unknown;
  include?: unknown;
};
export function userView(data: DemoData, id: string): User {
  const u = data.users.find((u) => u.id === id);
  if (!u) throw new Error('Demo account not found.');
  return {
    ...u,
    client: data.clients.find((c) => c.userId === id) || null,
    worker: data.workers.find((w) => w.userId === id) || null,
  };
}
export function workerView(data: DemoData, id: string): Worker {
  const w = data.workers.find((w) => w.id === id);
  if (!w) throw new Error('Demo professional not found.');
  return {
    ...w,
    user: userView(data, w.userId),
    documents: data.documents.filter((d) => d.workerId === id),
    reviews: data.reviews
      .filter((r) => r.workerId === id)
      .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime())
      .map((r) => ({ ...r, reviewer: userView(data, r.reviewedBy) })),
  };
}
export function requestView(data: DemoData, id: string): RequestWithPeople {
  const r = data.requests.find((r) => r.id === id);
  if (!r) throw new Error('Demo request not found.');
  const c = data.clients.find((c) => c.id === r.clientId)!;
  return {
    ...r,
    client: { ...c, user: userView(data, c.userId) },
    worker: workerView(data, r.workerId),
  };
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
export function matches(row: unknown, where: Where = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'OR') return (expected as Where[]).some((condition) => matches(row, condition));
    if (key === 'AND') return (expected as Where[]).every((condition) => matches(row, condition));
    const actual = record(row)[key];
    if (expected === undefined) return true;
    if (expected === null || typeof expected !== 'object' || expected instanceof Date)
      return actual instanceof Date && expected instanceof Date
        ? +actual === +expected
        : actual === expected;
    const rule = record(expected);
    if ('some' in rule)
      return Array.isArray(actual) && actual.some((item) => matches(item, rule.some as Where));
    if ('has' in rule) return Array.isArray(actual) && actual.includes(rule.has);
    if ('in' in rule) return (rule.in as unknown[]).includes(actual);
    if ('contains' in rule || 'startsWith' in rule || 'equals' in rule) {
      const a = String(actual ?? '').toLowerCase();
      return 'contains' in rule
        ? a.includes(String(rule.contains).toLowerCase())
        : 'startsWith' in rule
          ? a.startsWith(String(rule.startsWith).toLowerCase())
          : a === String(rule.equals).toLowerCase();
    }
    if ('gte' in rule || 'lte' in rule)
      return (
        (!('gte' in rule) || Number(actual) >= Number(rule.gte)) &&
        (!('lte' in rule) || Number(actual) <= Number(rule.lte))
      );
    return matches(actual, rule);
  });
}
function reader<T>(rows: (data: DemoData) => T[]) {
  const all = (q: Query = {}) => {
    let results = rows(getDemoData()).filter((r) => matches(r, q.where));
    const orders = q.orderBy ? (Array.isArray(q.orderBy) ? q.orderBy : [q.orderBy]) : [];
    if (orders.length)
      results.sort((a, b) => {
        for (const order of orders) {
          for (const [key, dir] of Object.entries(order)) {
            const x = record(a)[key],
              y = record(b)[key];
            const numeric = key === 'hourlyRate' || typeof x === 'number' || x instanceof Date;
            const compared = numeric
              ? Number(x) - Number(y)
              : String(x ?? '').localeCompare(String(y ?? ''));
            if (compared) return dir === 'desc' ? -compared : compared;
          }
        }
        return 0;
      });
    return results.slice(q.skip || 0, q.take === undefined ? undefined : (q.skip || 0) + q.take);
  };
  return {
    findMany: async (q: Query = {}) => all(q),
    findFirst: async (q: Query = {}) => all(q)[0] || null,
    findUnique: async (q: Query) => all(q)[0] || null,
    findFirstOrThrow: async (q: Query = {}) => {
      const row = all(q)[0];
      if (!row) throw new Error('Demo record not found.');
      return row;
    },
    findUniqueOrThrow: async (q: Query) => {
      const row = all(q)[0];
      if (!row) throw new Error('Demo record not found.');
      return row;
    },
    count: async (q: Query = {}) => all(q).length,
    groupBy: async (q: { by: string[]; _count: boolean }) => {
      const groups = new Map<string, T & { _count: number }>();
      for (const row of rows(getDemoData())) {
        const key = q.by.map((k) => record(row)[k]).join('|');
        const existing = groups.get(key);
        if (existing) existing._count++;
        else groups.set(key, { ...row, _count: 1 });
      }
      return [...groups.values()];
    },
  };
}
export const demoRepository = {
  user: reader((data) => data.users.map((u) => userView(data, u.id))),
  clientProfile: reader((data) =>
    data.clients.map((c) => ({ ...c, user: userView(data, c.userId) })),
  ),
  workerProfile: reader((data) => data.workers.map((w) => workerView(data, w.id))),
  careRequest: reader((data) => data.requests.map((r) => requestView(data, r.id))),
  favourite: reader((data) =>
    data.favourites.map((f) => ({
      ...f,
      worker: workerView(data, f.workerId),
      client: data.clients.find((c) => c.id === f.clientId)!,
    })),
  ),
  notification: reader((data) => data.notifications),
  auditLog: reader((data) =>
    data.auditLogs.map((a) => ({ ...a, actor: userView(data, a.actorId) })),
  ),
  verificationDocument: reader((data) =>
    data.documents.map((d) => ({ ...d, worker: workerView(data, d.workerId) })),
  ),
};
