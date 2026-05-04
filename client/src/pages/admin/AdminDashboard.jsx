import React, { useState, useEffect, useCallback } from 'react';
import { Users, Package, CheckCircle, Trash2, Edit2, X, RefreshCw, ShieldAlert, BarChart2, List, LogOut } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  DONOR: 'bg-green-100 text-green-700',
  RECEIVER: 'bg-blue-100 text-blue-700',
  VOLUNTEER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-700',
  CLAIMED: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-teal-100 text-teal-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-600',
};

// ── Confirm dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e2a1e] rounded-2xl border border-white/10 p-6 max-w-sm w-full">
        <ShieldAlert className="text-red-400 mb-3" size={28} />
        <p className="text-white font-semibold mb-1">Are you sure?</p>
        <p className="text-gray-400 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 text-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit User dialog ────────────────────────────────────────────────────────
function EditUserDialog({ user, onSave, onClose }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, phone: user.phone || '', location: user.location || '' });
  const [saving, setSaving] = useState(false);
  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/users/${user.id}`, form);
      toast.success('User updated');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e2a1e] rounded-2xl border border-white/10 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Edit User</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {[['name','Name','text'],['phone','Phone','text'],['location','Location','text']].map(([k,l,t]) => (
            <div key={k}>
              <label className="text-xs text-gray-400 mb-1 block">{l}</label>
              <input name={k} type={t} value={form[k]} onChange={change}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Role</label>
            <select name="role" value={form.role} onChange={change}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
              {['DONOR','RECEIVER','VOLUNTEER','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ stats, loading }) {
  if (loading) return <div className="h-48 animate-pulse rounded-2xl bg-white/5" />;
  if (!stats) return null;
  const kpis = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { label: 'Total Listings', value: stats.totalListings, icon: Package, color: 'text-green-400' },
    { label: 'Total Claims', value: stats.totalClaims, icon: List, color: 'text-yellow-400' },
    { label: 'Meals Rescued', value: stats.mealsRescued, icon: CheckCircle, color: 'text-teal-400' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <k.icon size={20} className={`${k.color} mb-3`} />
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Role breakdown */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Users by Role</h3>
          <div className="space-y-2">
            {(stats.roleBreakdown || []).map(r => (
              <div key={r.role} className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[r.role]}`}>{r.role}</span>
                <span className="text-white font-bold">{r._count.id}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Listing status breakdown */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Listings by Status</h3>
          <div className="space-y-2">
            {(stats.statusBreakdown || []).map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                <span className="text-white font-bold">{s._count.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Signups</h3>
        <div className="space-y-3">
          {(stats.recentUsers || []).map(u => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-green-300 text-xs font-bold">{u.name[0]}</div>
                <div>
                  <p className="text-sm text-white font-medium">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                <p className="text-xs text-gray-500 mt-0.5">{formatDistanceToNow(new Date(u.createdAt))} ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { search, role: roleFilter } });
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteUser = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      setConfirmDelete(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      {confirmDelete && (
        <ConfirmDialog
          message={`Permanently delete "${confirmDelete.name}"? This will also delete all their listings, claims and tasks.`}
          onConfirm={() => deleteUser(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {editUser && <EditUserDialog user={editUser} onSave={() => { setEditUser(null); load(); }} onClose={() => setEditUser(null)} />}

      <div className="flex flex-wrap gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          {['ALL','DONOR','RECEIVER','VOLUNTEER','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                {['User','Email','Role','Location','Joined','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                ))
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-green-800 rounded-full flex items-center justify-center text-green-300 text-xs font-bold">{u.name[0]}</div>
                      <span className="text-sm text-white font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.location || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDistanceToNow(new Date(u.createdAt))} ago</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(u)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Listings Tab ─────────────────────────────────────────────────────────────
function ListingsTab() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/listings', { params: { search, status: statusFilter } });
      setListings(data);
    } catch { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteListing = async (id) => {
    try {
      await api.delete(`/admin/listings/${id}`);
      toast.success('Listing deleted');
      setConfirmDelete(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/admin/listings/${id}`, { status });
      toast.success('Status updated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete listing "${confirmDelete.title}"? All associated claims will be removed.`}
          onConfirm={() => deleteListing(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search food or location…"
          className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          {['ALL','AVAILABLE','CLAIMED','ASSIGNED','DELIVERED','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white"><RefreshCw size={14} /></button>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                {['Food','Donor','Qty','Status','Location','Posted','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                ))
              ) : listings.map(l => (
                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium max-w-[140px] truncate">{l.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{l.donor?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{l.quantity}</td>
                  <td className="px-4 py-3">
                    <select value={l.status} onChange={e => changeStatus(l.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[l.status]}`}>
                      {['AVAILABLE','CLAIMED','ASSIGNED','PICKED_UP','DELIVERED','EXPIRED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{l.location}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDistanceToNow(new Date(l.createdAt))} ago</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmDelete(l)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && listings.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">No listings found</div>}
        </div>
      </div>
    </div>
  );
}

// ── Claims Tab ───────────────────────────────────────────────────────────────
function ClaimsTab() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/claims', { params: { status: statusFilter } });
      setClaims(data);
    } catch { toast.error('Failed to load claims'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
          {['ALL','CLAIMED','ASSIGNED','PICKED_UP','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white"><RefreshCw size={14} /></button>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                {['Food','Receiver','Pickup','Volunteer','Status','Claimed'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
                ))
              ) : claims.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{c.food?.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.receiver?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.pickupType}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.volunteerTask?.volunteer?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDistanceToNow(new Date(c.createdAt))} ago</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && claims.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">No claims found</div>}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'users',    label: 'Users',    icon: Users },
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'claims',   label: 'Claims',   icon: List },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-[#0f1a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#141f14] border-r border-white/10 flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{user?.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">{TABS.find(t => t.id === tab)?.label}</h1>
            <p className="text-xs text-gray-500 mt-0.5">FoodRescue Control Panel · Admin only</p>
          </div>

          {tab === 'overview' && <OverviewTab stats={stats} loading={statsLoading} />}
          {tab === 'users'    && <UsersTab />}
          {tab === 'listings' && <ListingsTab />}
          {tab === 'claims'   && <ClaimsTab />}
        </div>
      </main>
    </div>
  );
}
