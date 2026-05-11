import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, X, RefreshCw, Truck, Package,
  CheckCircle2, Phone, Navigation, KeyRound,
} from 'lucide-react';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ManageListingsPage() {
  const [data, setData] = useState({ listings: [], stats: {} });
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [updatingDelivery, setUpdatingDelivery] = useState(null);

  // OTP state
  const [otpInputs, setOtpInputs] = useState({});    // { [claimId]: string }
  const [awaitingOtp, setAwaitingOtp] = useState(null); // claimId in OTP mode

  // Live location sharing
  const [sharingClaimId, setSharingClaimId] = useState(null);
  const watchRef = useRef(null);

  const fetchAll = () => {
    setLoading(true);
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
  };

  useEffect(() => { fetchAll(); }, []);

  // Cleanup GPS watch on unmount
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.patch(`/food/${id}`, { status: 'CANCELLED' });
      toast.success('Listing cancelled');
      fetchAll();
    } catch {
      toast.error('Failed to cancel listing');
    } finally {
      setCancelling(null);
    }
  };

  // Step 1: Mark PICKED_UP (auto-generates OTP on backend)
  const handlePickedUp = async (claimId) => {
    setUpdatingDelivery(claimId);
    try {
      await api.patch(`/donor/deliver/${claimId}`, { status: 'PICKED_UP' });
      toast.success('Marked as picked up 📦 — OTP sent to receiver!');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingDelivery(null);
    }
  };

  // Step 2: Confirm delivery with OTP
  const handleConfirmDelivery = async (claimId) => {
    const otp = (otpInputs[claimId] || '').trim();
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit code from the receiver'); return; }
    setUpdatingDelivery(claimId);
    try {
      await api.patch(`/donor/deliver/${claimId}`, { status: 'DELIVERED', otp });
      toast.success('✅ Delivery confirmed! Thank you!');
      setAwaitingOtp(null);
      setOtpInputs(prev => { const n = { ...prev }; delete n[claimId]; return n; });
      // Stop location sharing for this claim
      if (sharingClaimId === claimId) stopSharing();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP — ask the receiver to check their tracking page');
    } finally {
      setUpdatingDelivery(null);
    }
  };

  // Toggle live location sharing for a delivery
  const toggleSharing = (claimId) => {
    if (sharingClaimId === claimId) { stopSharing(); return; }
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setSharingClaimId(claimId);
    toast.success('Sharing live location with receiver 📡');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        api.post('/donor/location', {
          claimId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      () => { toast.error('Location access denied'); setSharingClaimId(null); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopSharing = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharingClaimId(null);
    toast('Location sharing stopped.', { icon: '📍' });
  };

  const navigateToReceiver = (receiverLocation) => {
    if (!receiverLocation) { toast.error('No receiver address available'); return; }
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(receiverLocation)}`, '_blank');
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
          <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-gray-600">
            <RefreshCw size={18} />
          </button>
          <Link to="/donor/add" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors text-sm">
            + Post Food
          </Link>
        </div>
      </div>

      {/* ── My Deliveries Section ── */}
      {deliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Truck size={18} className="text-purple-600" /> My Pending Deliveries
            <span className="ml-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{deliveries.length}</span>
          </h2>
          <div className="space-y-3">
            {deliveries.map(claim => (
              <div key={claim.id} className="bg-white rounded-xl border-2 border-purple-100 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🚗</span>
                      <h3 className="font-semibold text-gray-900">{claim.food?.title}</h3>
                      <StatusBadge status={claim.status} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500">{claim.food?.quantity} servings · From {claim.food?.location}</p>
                    <div className="mt-2 bg-purple-50 rounded-lg p-2.5">
                      <p className="text-xs font-semibold text-purple-800">Receiver: {claim.receiver?.name}</p>
                      {claim.receiver?.location && (
                        <p className="text-xs text-purple-600 mt-0.5">📍 Deliver to: {claim.receiver.location}</p>
                      )}
                      {claim.receiver?.phone && (
                        <p className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                          <Phone size={10} /> {claim.receiver.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons row */}
                <div className="flex flex-wrap gap-2">

                  {/* PICKED_UP button */}
                  {claim.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handlePickedUp(claim.id)}
                      disabled={updatingDelivery === claim.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 border border-purple-300 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-60"
                    >
                      <Package size={12} /> {updatingDelivery === claim.id ? 'Updating...' : 'I picked it up'}
                    </button>
                  )}

                  {/* DELIVERED — OTP flow */}
                  {claim.status === 'PICKED_UP' && awaitingOtp !== claim.id && (
                    <button
                      onClick={() => setAwaitingOtp(claim.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-300 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 size={12} /> Mark Delivered
                    </button>
                  )}

                  {claim.status === 'PICKED_UP' && awaitingOtp === claim.id && (
                    <div className="flex gap-2 w-full">
                      <div className="relative flex-1">
                        <KeyRound size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit code from receiver"
                          value={otpInputs[claim.id] || ''}
                          onChange={e => setOtpInputs(prev => ({ ...prev, [claim.id]: e.target.value.replace(/\D/g, '') }))}
                          className="w-full pl-8 pr-3 py-2 border border-green-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <button
                        onClick={() => handleConfirmDelivery(claim.id)}
                        disabled={updatingDelivery === claim.id}
                        className="bg-green-600 text-white font-semibold px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs disabled:opacity-60"
                      >
                        {updatingDelivery === claim.id ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setAwaitingOtp(null)}
                        className="px-3 py-2 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Navigate to receiver */}
                  {(claim.status === 'ASSIGNED' || claim.status === 'PICKED_UP') && claim.receiver?.location && (
                    <button
                      onClick={() => navigateToReceiver(claim.receiver.location)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <Navigation size={12} /> Navigate to Receiver
                    </button>
                  )}

                  {/* Live location share */}
                  {(claim.status === 'ASSIGNED' || claim.status === 'PICKED_UP') && (
                    <button
                      onClick={() => toggleSharing(claim.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                        sharingClaimId === claim.id
                          ? 'bg-orange-100 text-orange-700 border-orange-300 animate-pulse'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Navigation size={12} />
                      {sharingClaimId === claim.id ? 'Sharing Location 📡' : 'Share My Location'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Listings ── */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">All Listings</h2>
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
            const canCancel = l.status === 'AVAILABLE';
            const isDonorDelivery = l.pickupArrangement === 'DONOR_DELIVERY';
            return (
              <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-semibold text-gray-900">{l.title}</h3>
                      <StatusBadge status={l.status} size="sm" />
                      {isDonorDelivery && (
                        <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">🚗 I deliver</span>
                      )}
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
                          {!isDonorDelivery && l.claims[0].volunteerTask && ` · 🚴 ${l.claims[0].volunteerTask.volunteer?.name} delivering`}
                          {isDonorDelivery && ' · 🚗 You are delivering'}
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
