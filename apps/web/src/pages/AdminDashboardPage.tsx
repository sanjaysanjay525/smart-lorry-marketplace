import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { formatDateTime } from "../lib/labels";
import {
  getAdminStats, getUsers, banUser,
  getKycDocs, reviewKycDoc,
  getDisputes, resolveDispute,
} from "../lib/admin";
import { extractErrorMessage } from "../lib/api";
import type { AdminStatsDTO } from "@smart-lorry/shared";
import {
  Users, Package, Truck, FileText, Shield, AlertTriangle,
} from "lucide-react";

type Tab = "overview" | "kyc" | "users" | "disputes";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "kyc",      label: "KYC Queue" },
  { key: "users",    label: "Users" },
  { key: "disputes", label: "Disputes" },
];

export function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <AppShell>
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold text-charcoal">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-charcoal/10">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-b-2 border-neem text-neem"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab />}
          {tab === "kyc" && <KycTab />}
          {tab === "users" && <UsersTab />}
          {tab === "disputes" && <DisputesTab />}
        </div>
      </div>
    </AppShell>
  );
}

// ─── Overview ───────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useQuery<AdminStatsDTO>({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
  });

  if (isLoading) return <p className="text-charcoal/50">Loading stats…</p>;
  if (!stats) return null;

  const cards = [
    { label: "Lorry Owners", value: stats.totalOwners, icon: Truck, color: "text-sky" },
    { label: "Mill Owners",  value: stats.totalMills,   icon: Package, color: "text-turmeric" },
    { label: "Open Loads",   value: stats.openLoads,    icon: FileText, color: "text-neem" },
    { label: "Active Trips", value: stats.activeTrips,  icon: Truck, color: "text-orange-500" },
    { label: "Pending KYC",  value: stats.pendingKyc,   icon: Shield, color: "text-vermilion" },
    { label: "Open Disputes",value: stats.openDisputes,  icon: AlertTriangle, color: "text-vermilion" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-charcoal/10 bg-white p-5">
          <div className="flex items-center gap-3">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <span className="text-sm text-charcoal/60">{c.label}</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-charcoal">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── KYC ────────────────────────────────────────────────────────────

function KycTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "kyc"],
    queryFn: () => getKycDocs({ status: "pending" }),
  });

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const approveMut = useMutation({
    mutationFn: (id: string) => reviewKycDoc(id, { status: "approved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      reviewKycDoc(id, { status: "rejected", reviewNote: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      setRejectId(null);
      setReviewNote("");
    },
  });

  if (isLoading) return <p className="text-charcoal/50">Loading KYC queue…</p>;

  const docs = data?.data ?? [];
  if (docs.length === 0) return <p className="text-charcoal/50">No pending KYC documents.</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-charcoal/10">
        <table className="min-w-full text-sm">
          <thead className="bg-charcoal/5">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">User</th>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Doc Type</th>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Submitted</th>
              <th className="px-4 py-2 text-right font-medium text-charcoal/70">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {docs.map((doc) => (
              <tr key={doc.id}>
                <td className="px-4 py-3 font-medium">{doc.userName}</td>
                <td className="px-4 py-3 capitalize">{doc.docType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-charcoal/60">{formatDateTime(doc.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => approveMut.mutate(doc.id)}
                      disabled={approveMut.isPending}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRejectId(doc.id)}
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectId && (
        <Modal title="Reject KYC Document" onClose={() => setRejectId(null)}>
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
              placeholder="Reason for rejection…"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button
                onClick={() => rejectMut.mutate({ id: rejectId, note: reviewNote })}
                disabled={rejectMut.isPending}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Users ──────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", roleFilter],
    queryFn: () => getUsers({ role: roleFilter || undefined }),
  });

  const banMut = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => banUser(id, { banned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="owner">Lorry Owners</option>
          <option value="mill">Mill Owners</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-charcoal/50">Loading users…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal/10">
          <table className="min-w-full text-sm">
            <thead className="bg-charcoal/5">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-charcoal/70">Name</th>
                <th className="px-4 py-2 text-left font-medium text-charcoal/70">Email</th>
                <th className="px-4 py-2 text-left font-medium text-charcoal/70">Phone</th>
                <th className="px-4 py-2 text-left font-medium text-charcoal/70">Role</th>
                <th className="px-4 py-2 text-right font-medium text-charcoal/70">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {(data?.data ?? []).map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-charcoal/70">{user.email}</td>
                  <td className="px-4 py-3 text-charcoal/70">{user.phone}</td>
                  <td className="px-4 py-3 capitalize">{user.role === "mill" ? "Mill Owner" : "Lorry Owner"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => banMut.mutate({ id: user.id, banned: !user.banned })}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        user.banned
                          ? "bg-vermilion/10 text-vermilion hover:bg-vermilion/20"
                          : "bg-neem/10 text-neem hover:bg-neem/20"
                      }`}
                    >
                      {user.banned ? "Banned — Unban" : "Active"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Disputes ───────────────────────────────────────────────────────

function DisputesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "disputes"],
    queryFn: () => getDisputes(),
  });

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resolveMut = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      resolveDispute(id, { resolution }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      setResolveId(null);
      setResolution("");
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  if (isLoading) return <p className="text-charcoal/50">Loading disputes…</p>;

  const disputes = data?.data ?? [];
  if (disputes.length === 0) return <p className="text-charcoal/50">No disputes.</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-charcoal/10">
        <table className="min-w-full text-sm">
          <thead className="bg-charcoal/5">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Trip</th>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Raised By</th>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Reason</th>
              <th className="px-4 py-2 text-left font-medium text-charcoal/70">Status</th>
              <th className="px-4 py-2 text-right font-medium text-charcoal/70">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {disputes.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-mono text-xs">{d.tripId.slice(0, 8)}…</td>
                <td className="px-4 py-3">{d.raisedByName}</td>
                <td className="max-w-xs truncate px-4 py-3 text-charcoal/70">{d.reason}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.status === "open" ? "bg-turmeric/10 text-turmeric" : "bg-neem/10 text-neem"
                  }`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {d.status === "open" && (
                    <Button variant="ghost" onClick={() => setResolveId(d.id)}>
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolveId && (
        <Modal title="Resolve Dispute" onClose={() => setResolveId(null)}>
          <div className="space-y-4">
            <textarea
              className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm"
              placeholder="Resolution details…"
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
            {error && <p className="text-sm text-vermilion">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResolveId(null)}>Cancel</Button>
              <Button
                onClick={() => resolveMut.mutate({ id: resolveId, resolution })}
                disabled={resolveMut.isPending || resolution.length < 5}
              >
                Confirm Resolution
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
