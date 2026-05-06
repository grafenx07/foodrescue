import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, MapPin, RefreshCw, X, Truck, User } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import StatusBadge from '../../components/StatusBadge';
import FoodCard from '../../components/FoodCard';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ReceiverDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [food, setFood] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);

  // Claim modal state
  const [claimTarget, setClaimTarget] = useState(null); // listing to claim
  const [pickupType, setPickupType] = useState('SELF');
  const [claiming, setClaiming] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [foodRes, claimsRes] = await Promise.all([
        api.get('/food'),
        api.get('/claim/my'),
      ]);
      setFood(foodRes.data);
      setClaims(claimsRes.data);
    } catch (e) {
      console.error('[ReceiverDashboard]', e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Open claim modal for a listing
  const handleClaimClick = (listing) => {
    if (listing.pickupArrangement === 'DONOR_DELIVERY') {
      // No pickup choice needed — go straight to claim
      doClaimFood(listing.id, 'SELF');
    } else {
      setPickupType('SELF');
      setClaimTarget(listing);
    }
  };

  // Actual API call
  const doClaimFood = async (foodId, type) => {
    setClaiming(true);
    try {
      const { data } = await api.post('/claim', { foodId, pickupType: type });
      toast.success('Food claimed successfully! 🎉');
      setClaimTarget(null);
      navigate(`/track/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to claim food');
    } finally {
      setClaiming(false);
    }
  };

  const handleConfirmClaim = () => {
    if (!claimTarget) return;
    doClaimFood(claimTarget.id, pickupType);
  };

  const activeClaims = claims.filter(c => !['DELIVERED', 'CANCELLED'].includes(c.status));
  const history = claims.filter(c => ['DELIVERED', 'CANCELLED'].includes(c.status));
  const deliveredCount = history.filter(c => c.status === 'DELIVERED').length;

  const stats = [
    { label: 'Available Nearby', value: food.length, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Claims', value: activeClaims.length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Meals Received', value: deliveredCount, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receiver Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Find and claim available food near you</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Map CTA */}
      <div className="bg-green-600 rounded-xl p-5 flex items-center justify-between mb-6">
        <div>
          <p className="text-white font-semibold">Looking for food?</p>
          <p className="text-green-100 text-sm mt-0.5">Browse available listings on the map</p>
        </div>
        <Link to="/" className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-50 transition-colors">
          <MapPin size={14} /> View Map
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'available', label: `Available Food (${food.length})` },
          { id: 'claims', label: `My Claims${activeClaims.length > 0 ? ` (${activeClaims.length})` : ''}` },
          { id: 'history', label: `History (${history.length})` },
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white h-64 rounded-xl animate-pulse" />)}
        </div>
      ) : tab === 'available' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {food.map(l => (
            <FoodCard key={l.id} listing={l} onClaim={handleClaimClick} />
          ))}
          {food.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">No food available right now</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {(tab === 'claims' ? activeClaims : history).map(claim => (
            <div key={claim.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={claim.food?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'}
                  className="w-full h-full object-cover"
                  alt={claim.food?.title}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{claim.food?.title}</h3>
                  <StatusBadge status={claim.status} size="sm" />
                </div>
                <p className="text-xs text-gray-500">From {claim.food?.donor?.name}</p>
                {claim.volunteerTask && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    🚴 {claim.volunteerTask.volunteer?.name} is on the way
                  </p>
                )}
                {claim.food?.pickupArrangement === 'DONOR_DELIVERY' && (
                  <p className="text-xs text-purple-600 mt-1 font-medium">🚗 Donor is delivering</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Claimed {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
              </div>
              {tab === 'claims' && (
                <Link
                  to={`/track/${claim.id}`}
                  className="bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                >
                  Track
                </Link>
              )}
            </div>
          ))}
          {(tab === 'claims' ? activeClaims : history).length === 0 && (
            <p className="text-center text-gray-400 py-12">No {tab === 'claims' ? 'active claims' : 'history'} yet</p>
          )}
        </div>
      )}

      {/* ── Claim Modal ── */}
      {claimTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Claim Food</h2>
                <p className="text-sm text-gray-500 mt-0.5">{claimTarget.title}</p>
              </div>
              <button
                onClick={() => setClaimTarget(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">How do you want to get this food?</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { value: 'SELF', label: '🚶 Self Pickup', desc: 'Go pick it up yourself' },
                { value: 'VOLUNTEER', label: '🚴 Request Volunteer', desc: 'A volunteer delivers to you' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPickupType(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    pickupType === opt.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmClaim}
              disabled={claiming}
              className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {claiming ? 'Claiming...' : '✅ Confirm Claim'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
