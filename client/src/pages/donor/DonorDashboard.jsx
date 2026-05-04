import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, CheckCircle, Leaf, TrendingUp, Truck } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export default function DonorDashboard() {
  const [data, setData] = useState({ listings: [], stats: { active: 0, completed: 0, totalServings: 0 } });
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/donor/listings'),
      api.get('/donor/deliveries'),
    ])
      .then(([listingsRes, deliveriesRes]) => {
        setData(listingsRes.data);
        setDeliveries(deliveriesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { listings, stats } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your food donations</p>
        </div>
        <Link
          to="/donor/add"
          className="bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Post Food
        </Link>
      </div>

      {/* Pending deliveries alert banner */}
      {deliveries.length > 0 && (
        <Link
          to="/donor/listings"
          className="flex items-center justify-between gap-4 bg-purple-600 text-white rounded-xl px-5 py-4 mb-6 hover:bg-purple-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {deliveries.length} pending {deliveries.length === 1 ? 'delivery' : 'deliveries'} waiting for you
              </p>
              <p className="text-purple-200 text-xs mt-0.5">
                You committed to deliver these — tap to update status
              </p>
            </div>
          </div>
          <span className="text-purple-200 text-sm font-semibold whitespace-nowrap">View →</span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Listings', value: stats.active, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Completed Donations', value: stats.completed, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Servings Donated', value: stats.totalServings, icon: Leaf, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/donor/add" className="bg-green-600 text-white rounded-xl p-5 hover:bg-green-700 transition-colors">
          <Plus size={24} className="mb-2" />
          <h3 className="font-semibold text-lg">Post New Food</h3>
          <p className="text-green-100 text-sm mt-1">List surplus food quickly</p>
        </Link>
        <Link to="/donor/listings" className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
          <TrendingUp size={24} className="mb-2 text-blue-600" />
          <h3 className="font-semibold text-lg text-gray-900">Manage Listings</h3>
          <p className="text-gray-500 text-sm mt-1">Edit or cancel your donations</p>
        </Link>
        <Link to="/donor/listings" className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all relative">
          <Truck size={24} className="mb-2 text-purple-600" />
          <h3 className="font-semibold text-lg text-gray-900">My Deliveries</h3>
          <p className="text-gray-500 text-sm mt-1">Track food you're delivering</p>
          {deliveries.length > 0 && (
            <span className="absolute top-3 right-3 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {deliveries.length}
            </span>
          )}
        </Link>
      </div>

      {/* Recent listings */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Listings</h2>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white h-20 rounded-xl animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <Leaf size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm mt-1">Start by posting your first food donation</p>
          <Link to="/donor/add" className="mt-4 inline-block bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
            Post Food
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.slice(0, 5).map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{l.title}</h3>
                  <StatusBadge status={l.status} size="sm" />
                  {l.pickupArrangement === 'DONOR_DELIVERY' && (
                    <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">🚗 I deliver</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{l.quantity} portions · {l.location} · Posted {formatDistanceToNow(new Date(l.createdAt))} ago</p>
                {l.claims.length > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-1">✅ Claimed by {l.claims[0].receiver?.name}</p>
                )}
              </div>
            </div>
          ))}
          {listings.length > 5 && (
            <Link to="/donor/listings" className="block text-center text-sm text-green-600 font-medium hover:underline pt-2">
              View all {listings.length} listings →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
