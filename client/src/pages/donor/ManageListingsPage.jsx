import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit, X, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ManageListingsPage() {
  const [data, setData] = useState({ listings: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const fetchListings = () => {
    setLoading(true);
    api.get('/donor/listings')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, []);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.patch(`/food/${id}`, { status: 'CANCELLED' });
      toast.success('Listing cancelled');
      fetchListings();
    } catch {
      toast.error('Failed to cancel listing');
    } finally {
      setCancelling(null);
    }
  };

  const { listings } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/donor" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-1">
            <ArrowLeft size={14} /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Manage Listings</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchListings} className="p-2 text-gray-400 hover:text-gray-600">
            <RefreshCw size={18} />
          </button>
          <Link to="/donor/add" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors text-sm">
            + Post Food
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white h-20 rounded-xl animate-pulse" />)}</div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <p className="font-medium">No listings yet</p>
          <Link to="/donor/add" className="mt-4 inline-block bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">Post Food</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(l => {
            const canCancel = ['AVAILABLE'].includes(l.status);
            return (
              <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-semibold text-gray-900">{l.title}</h3>
                      <StatusBadge status={l.status} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500">{l.quantity} servings · {l.location}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Posted {formatDistanceToNow(new Date(l.createdAt))} ago ·
                      Expires {formatDistanceToNow(new Date(l.expiryTime))} from now
                    </p>
                    {l.claims.length > 0 && (
                      <div className="mt-2 bg-green-50 rounded-lg p-2">
                        <p className="text-xs font-medium text-green-700">
                          ✅ Claimed by {l.claims[0].receiver?.name}
                          {l.claims[0].volunteerTask && ` · 🚴 ${l.claims[0].volunteerTask.volunteer?.name} delivering`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(l.id)}
                        disabled={cancelling === l.id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <X size={12} /> {cancelling === l.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
