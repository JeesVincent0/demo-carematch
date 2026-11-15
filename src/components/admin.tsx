'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './shared';
import { ActionButton, action } from './interactive';
import { date, label } from '@/lib/utils';
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  workerId?: string;
};
export function UsersTable({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <>
          <strong>{row.original.name}</strong>
          <small>{row.original.email}</small>
        </>
      ),
    },
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => label(getValue<string>()) },
    {
      accessorKey: 'status',
      header: 'Account status',
      cell: ({ getValue }) => <Badge status={getValue<string>()} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ getValue }) => date(getValue<string>()),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="row">
          <Link
            className="text-link"
            href={
              row.original.workerId
                ? `/admin/verifications/${row.original.workerId}`
                : `/admin/users/${row.original.id}`
            }
          >
            View
          </Link>
          {row.original.role !== 'ADMIN' && (
            <ActionButton
              name="account-status"
              variant="outline"
              data={{
                id: row.original.id,
                status: row.original.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
              }}
              confirm={`${row.original.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'} this account? Active sessions will be invalidated and public visibility will update.`}
            >
              {row.original.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </ActionButton>
          )}
        </div>
      ),
    },
  ];
  const table = useReactTable({
    data: users.filter((u) => (!role || u.role === role) && (!status || u.status === status)),
    columns,
    state: { globalFilter: search, sorting },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <>
      <div className="table-toolbar">
        <input
          aria-label="Search users"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option>CLIENT</option>
          <option>WORKER</option>
          <option>ADMIN</option>
        </select>
        <select
          aria-label="Filter by account status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All account statuses</option>
          <option>ACTIVE</option>
          <option>SUSPENDED</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id}>
                    {h.column.getCanSort() ? (
                      <button onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown size={11} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((c) => (
                  <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
            {!table.getRowModel().rows.length && (
              <tr>
                <td colSpan={5}>No users match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <Button
          variant="outline"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Previous
        </Button>
        <small>
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} ·{' '}
          {table.getFilteredRowModel().rows.length} users
        </small>
        <Button
          variant="outline"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Next
        </Button>
      </div>
    </>
  );
}
export function Analytics({
  registrations,
  statuses,
  requests,
}: {
  registrations: { name: string; users: number }[];
  statuses: { name: string; count: number }[];
  requests: { name: string; count: number }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="chart-grid">
        <div className="content-card">
          <h3>User registrations</h3>
          <p className="small muted">Actual account creation dates · last six months</p>
          <div
            className="chart-container"
            role="img"
            aria-label={`Registrations: ${registrations.map((d) => `${d.name}: ${d.users}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrations}>
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#087f8c" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#087f8c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf1f2" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={25}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#087f8c"
                  fill="url(#chart-fill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="content-card">
          <h3>Professional applications</h3>
          <p className="small muted">Current verification status</p>
          <div
            className="chart-container"
            role="img"
            aria-label={statuses.map((d) => `${d.name}: ${d.count}`).join(', ')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statuses} layout="vertical">
                <CartesianGrid horizontal={false} stroke="#edf1f2" />
                <XAxis type="number" allowDecimals={false} fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statuses.map((d, i) => (
                    <Cell
                      key={d.name}
                      fill={['#087f8c', '#d5aa5a', '#719cb7', '#bc8d8b', '#8f9aa6'][i % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="content-card" style={{ marginBottom: 24 }}>
        <h3>Care requests by status</h3>
        <div
          className="chart-container"
          style={{ height: 180 }}
          role="img"
          aria-label={requests.map((d) => `${d.name}: ${d.count}`).join(', ')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requests}>
              <CartesianGrid vertical={false} stroke="#edf1f2" />
              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={10} width={25} />
              <Tooltip />
              <Bar dataKey="count" fill="#71a99c" radius={[5, 5, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
export function ReviewActions({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const reject = status === 'APPROVED' ? 'SUSPENDED' : 'REJECTED';
  return (
    <div className="stack">
      {['PENDING', 'SUSPENDED'].includes(status) && (
        <ActionButton name="review" data={{ id, status: 'UNDER_REVIEW' }} message="Review started">
          Start review
        </ActionButton>
      )}
      {status === 'UNDER_REVIEW' && (
        <ActionButton
          name="review"
          data={{ id, status: 'APPROVED', confirmed: true }}
          confirm="Approve this demo application? Confirm you have inspected and marked each required document as reviewed. Approval is internal only; no authoritative external checks are claimed."
          message="Application approved. The active, listed profile is now searchable."
        >
          Approve application
        </ActionButton>
      )}
      {['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(status) && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              {status === 'APPROVED' ? 'Suspend professional' : 'Reject application'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="dialog-title">
              {status === 'APPROVED' ? 'Suspend professional' : 'Reject application'}
            </DialogTitle>
            <DialogDescription>
              Give a clear reason so the professional understands what needs to change. This action
              is recorded in the audit history.
            </DialogDescription>
            <label className="form-field" style={{ marginTop: 18 }}>
              Reason
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                minLength={10}
                maxLength={2000}
              />
            </label>
            {error && <p className="error-message">{error}</p>}
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep unchanged
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await action('review', { id, status: reject, notes });
                    toast.success('Review decision saved');
                    setOpen(false);
                    router.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirm decision
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {status === 'REJECTED' && (
        <ActionButton
          name="review"
          data={{ id, status: 'DRAFT', notes: 'Please update your application and resubmit.' }}
          message="Resubmission requested"
        >
          Request resubmission
        </ActionButton>
      )}
      <p className="small muted">All decisions are recorded with the reviewer and timestamp.</p>
    </div>
  );
}
