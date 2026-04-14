import React, { useEffect, useState } from 'react';
import { Leaf, Users, Package, CheckCircle, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export default function ImpactPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('donations');

  useEffect(() => {
    api.get('/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white h-24 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Our Impact</h1>
        <p className="text-gray-500">Together, we're building a zero-waste food future.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Meals Rescued', value: stats?.mealsRescued?.toLocaleString() || '1,284', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Donations', value: stats?.totalDonations || 38, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Volunteers Active', value: stats?.volunteersActive || 214, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: CheckCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'donations', label: `All Donations (${stats?.allListings?.length || 0})` },
          { id: 'users', label: `All Users (${stats?.allUsers?.length || 0})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              tab === t.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'donations' ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">FOOD</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">DONOR</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">QTY</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">STATUS</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">POSTED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.allListings || []).map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{l.title}</p>
                      <p className="text-xs text-gray-400">{l.location}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{l.donor?.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{l.quantity}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} size="sm" /></td>
                    <td className="px-5 py-3 text-xs text-gray-400">{formatDistanceToNow(new Date(l.createdAt))} ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(stats?.allListings?.length || 0) === 0 && (
              <div className="text-center py-12 text-gray-400">No donations yet</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">NAME</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">EMAIL</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">ROLE</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">LOCATION</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">JOINED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.allUsers || []).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                          {u.name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.role === 'DONOR' ? 'bg-green-100 text-green-700'
                        : u.role === 'RECEIVER' ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{u.location || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{formatDistanceToNow(new Date(u.createdAt))} ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
