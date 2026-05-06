import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle, Circle, ArrowLeft, Navigation, Truck,
  Shield, MapPin, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import MapView, { greenIcon, blueIcon } from '../../components/MapView';
import toast from 'react-hot-toast';

// ── Timeline definitions ──────────────────────────────────
const SELF_STEPS = [
  { status: 'CLAIMED',   label: 'Claimed',      desc: 'You claimed this food' },
  { status: 'DELIVERED', label: 'Picked Up ✅', desc: 'You collected the food' },
];

const VOLUNTEER_STEPS = [
  { status: 'CLAIMED',   label: 'Claimed',            desc: 'You claimed this food' },
  { status: 'ASSIGNED',  label: 'Volunteer Assigned',  desc: 'A volunteer accepted the task' },
  { status: 'PICKED_UP', label: 'Picked Up',           desc: 'Food collected from donor' },
  { status: 'DELIVERED', label: 'Delivered',            desc: 'Food delivered to you 🎉' },
];

const DONOR_STEPS = [
  { status: 'ASSIGNED',  label: 'Confirmed',   desc: 'Donor confirmed delivery' },
  { status: 'PICKED_UP', label: 'On the way',  desc: 'Donor has picked up the food' },
  { status: 'DELIVERED', label: 'Delivered',   desc: 'Food delivered to you 🎉' },
];

const SELF_ORDER      = { CLAIMED: 0, DELIVERED: 1 };
const VOLUNTEER_ORDER = { CLAIMED: 0, ASSIGNED: 1, PICKED_UP: 2, DELIVERED: 3 };
const DONOR_ORDER     = { ASSIGNED: 0, PICKED_UP: 1, DELIVERED: 2 };

// ── Geocode helper ────────────────────────────────────────
async function geocodeText(text) {
  if (!text) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { return null; }
}

// ── Custom map icons ──────────────────────────────────────
const makeIcon = (emoji, color) => L.divIcon({
  className: '',
  html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
});

const volunteerIcon = makeIcon('🚴', '#f97316');
const donorMoveIcon = makeIcon('🚗', '#9333ea');
const receiverIcon  = makeIcon('🏠', '#2563eb');

// ── OTP Display card ──────────────────────────────────────
function OtpCard({ claimId }) {
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  const fetchOtp = useCallback(async () => {
    try {
      const { data } = await api.get(`/claim/${claimId}/otp`);
      setOtp(data.otp);
    } catch {
      setOtp(null);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchOtp();
    const t = setInterval(fetchOtp, 30000);
    return () => clearInterval(t);
  }, [fetchOtp]);

  if (loading) return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 animate-pulse h-28" />
  );

  if (!otp) return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
      <p className="text-sm text-yellow-800 font-medium">⏳ Your delivery code will appear here once the food is picked up</p>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green-200" />
          <p className="text-sm font-semibold text-green-100">Your Delivery Code</p>
        </div>
        <button
          onClick={() => setHidden(h => !h)}
          className="text-green-200 hover:text-white transition-colors"
        >
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      {hidden ? (
        <p className="text-2xl font-mono font-bold tracking-widest text-center py-2 text-green-300">••••••</p>
      ) : (
        <p className="text-4xl font-mono font-bold tracking-widest text-center py-1">{otp}</p>
      )}
      <p className="text-xs text-green-200 text-center mt-2">
        📣 Read this code to the deliverer to confirm you received the food
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selfPickingUp, setSelfPickingUp] = useState(false);

  // Map positions
  const [donorStaticCoords, setDonorStaticCoords] = useState(null); // geocoded address
  const [receiverStaticCoords, setReceiverStaticCoords] = useState(null);
  const [livePositions, setLivePositions] = useState({ donor: null, volunteer: null, receiver: null });

  // Receiver location sharing
  const [sharingLocation, setSharingLocation] = useState(false);
  const receiverWatchRef = useRef(null);

  // ── Initial fetch ─────────────────────────────────────
  const fetchClaim = useCallback(async () => {
    try {
      const { data } = await api.get(`/claim/${claimId}`);
      setClaim(data);
    } catch { /* silent */ }
  }, [claimId]);

  useEffect(() => {
    api.get(`/claim/${claimId}`)
      .then(r => setClaim(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [claimId]);

  // ── Geocode addresses for static pins ────────────────
  useEffect(() => {
    if (!claim) return;
    const donorAddr    = claim.food?.donor?.location || claim.food?.location;
    const receiverAddr = claim.receiver?.location;
    Promise.all([geocodeText(donorAddr), geocodeText(receiverAddr)]).then(([dc, rc]) => {
      if (dc) setDonorStaticCoords(dc);
      if (rc) setReceiverStaticCoords(rc);
    });
  }, [claim?.id]);

  // ── Poll all live positions every 8s ─────────────────
  useEffect(() => {
    if (!claim) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/claim/${claimId}/locations`);
        setLivePositions({
          donor:     data.donor     ? [data.donor.lat,     data.donor.lng]     : null,
          volunteer: data.volunteer ? [data.volunteer.lat, data.volunteer.lng] : null,
          receiver:  data.receiver  ? [data.receiver.lat,  data.receiver.lng]  : null,
        });
      } catch { /* silent */ }
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [claimId, claim?.status]);

  // ── Re-fetch claim status every 15s ──────────────────
  useEffect(() => {
    const t = setInterval(fetchClaim, 15000);
    return () => clearInterval(t);
  }, [fetchClaim]);

  // ── Receiver location sharing ─────────────────────────
  const toggleShareLocation = () => {
    if (sharingLocation) {
      if (receiverWatchRef.current != null) navigator.geolocation.clearWatch(receiverWatchRef.current);
      receiverWatchRef.current = null;
      setSharingLocation(false);
      toast('Location sharing stopped.', { icon: '📍' });
      return;
    }
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setSharingLocation(true);
    toast.success('Sharing your location with the deliverer 📡');
    receiverWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        api.post(`/claim/${claimId}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          role: 'receiver',
        }).catch(() => {});
      },
      () => { toast.error('Location access denied'); setSharingLocation(false); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  useEffect(() => () => {
    if (receiverWatchRef.current != null) navigator.geolocation.clearWatch(receiverWatchRef.current);
  }, []);

  // ── Self-pickup action ────────────────────────────────
  const handleSelfPickup = async () => {
    setSelfPickingUp(true);
    try {
      await api.post(`/claim/${claimId}/self-pickup`);
      toast.success('🎉 Pickup confirmed! Enjoy your food!');
      fetchClaim();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm pickup');
    } finally {
      setSelfPickingUp(false);
    }
  };

  // ── Loading / not found ───────────────────────────────
  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl h-64 animate-pulse mb-4" />
      <div className="bg-white rounded-2xl h-40 animate-pulse" />
    </div>
  );
  if (!claim) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Claim not found</div>
  );

  // ── Derived state ─────────────────────────────────────
  const isDonorDelivery = claim.food?.pickupArrangement === 'DONOR_DELIVERY';
  const isSelfPickup    = claim.pickupType === 'SELF' && !isDonorDelivery;

  const timelineSteps = isSelfPickup ? SELF_STEPS : isDonorDelivery ? DONOR_STEPS : VOLUNTEER_STEPS;
  const statusOrder   = isSelfPickup ? SELF_ORDER  : isDonorDelivery ? DONOR_ORDER  : VOLUNTEER_ORDER;
  const currentIdx    = statusOrder[claim.status] ?? 0;
  const isDelivered   = claim.status === 'DELIVERED';

  const accentColor = isDonorDelivery ? 'purple' : isSelfPickup ? 'blue' : 'green';
  const accentClasses = {
    purple: { dot: 'bg-purple-600', line: 'bg-purple-600', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    blue:   { dot: 'bg-blue-600',   line: 'bg-blue-600',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'   },
    green:  { dot: 'bg-green-600',  line: 'bg-green-600',  text: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
  }[accentColor];

  // Map
  const activeDonorPos    = livePositions.donor     || donorStaticCoords;
  const activeReceiverPos = livePositions.receiver   || receiverStaticCoords;
  const activeVolunteerPos = livePositions.volunteer;
  const mapCenter = activeDonorPos || activeReceiverPos || [12.9352, 77.6245];

  const routePoints = [activeDonorPos, activeVolunteerPos, activeReceiverPos].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/receiver" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      {/* ── Main card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isSelfPickup ? '🚶 Self Pickup' : isDonorDelivery ? '🚗 Donor Delivery' : '🚴 Volunteer Delivery'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <strong>{claim.food?.title}</strong> · from {claim.food?.donor?.name}
            </p>
          </div>
          <button onClick={fetchClaim} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* ── Live Map ── */}
        <div className="rounded-2xl overflow-hidden mb-5 border border-gray-100 shadow-sm" style={{ height: 280 }}>
          <MapView center={mapCenter} zoom={13} height="280px">
            {routePoints.length >= 2 && (
              <Polyline positions={routePoints} color={isDonorDelivery ? '#9333ea' : '#16a34a'} weight={3} dashArray="8 6" />
            )}

            {/* Donor — static pin (home) */}
            {activeDonorPos && !livePositions.donor && (
              <Marker position={activeDonorPos} icon={greenIcon}>
                <Popup><span className="text-xs font-semibold">🏠 Donor: {claim.food?.donor?.name}</span></Popup>
              </Marker>
            )}
            {/* Donor — live pin (moving car) */}
            {livePositions.donor && (
              <Marker position={livePositions.donor} icon={donorMoveIcon}>
                <Popup><span className="text-xs font-semibold">🚗 {claim.food?.donor?.name} · Live</span></Popup>
              </Marker>
            )}

            {/* Receiver — static or live */}
            {activeReceiverPos && (
              <Marker position={activeReceiverPos} icon={receiverIcon}>
                <Popup><span className="text-xs font-semibold">📍 You {livePositions.receiver ? '(Live)' : ''}</span></Popup>
              </Marker>
            )}

            {/* Volunteer — live */}
            {activeVolunteerPos && (
              <Marker position={activeVolunteerPos} icon={volunteerIcon}>
                <Popup>
                  <span className="text-xs font-semibold">🚴 {claim.volunteerTask?.volunteer?.name} · Live</span>
                </Popup>
              </Marker>
            )}
          </MapView>
        </div>

        {/* Map legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-5 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Donor</span>
          {activeVolunteerPos && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Volunteer {livePositions.volunteer ? '· Live' : ''}</span>}
          {isDonorDelivery && livePositions.donor && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> Donor Live</span>}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> You</span>
        </div>

        {/* ── Share your location button (not for self-pickup) ── */}
        {!isSelfPickup && !isDelivered && (
          <button
            onClick={toggleShareLocation}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mb-5 transition-colors ${
              sharingLocation
                ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <Navigation size={14} />
            {sharingLocation ? '📡 Sharing your location with deliverer' : 'Share my location with deliverer'}
          </button>
        )}

        {/* ── Timeline ── */}
        <div className="space-y-0 mb-5">
          {timelineSteps.map((step, i) => {
            const isCompleted = i <= currentIdx;
            const isCurrent   = i === currentIdx;
            return (
              <div key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? accentClasses.dot : 'bg-gray-100'
                  }`}>
                    {isCompleted
                      ? <CheckCircle size={16} className="text-white" />
                      : <Circle size={16} className="text-gray-300" />}
                  </div>
                  {i < timelineSteps.length - 1 && (
                    <div className={`w-0.5 h-12 ${isCompleted ? accentClasses.line : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-12 pt-1">
                  <p className={`text-sm font-semibold ${
                    isCurrent ? accentClasses.text : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                    {isCurrent && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${accentClasses.badge}`}>Current</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Self-pickup action ── */}
        {isSelfPickup && claim.status === 'CLAIMED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <MapPin size={14} /> Ready to pick up your food?
            </p>
            <p className="text-xs text-blue-700 mb-4">
              Head to <strong>{claim.food?.donor?.location}</strong> and collect your food from {claim.food?.donor?.name}.
              Once you have it, tap the button below.
            </p>
            <button
              onClick={handleSelfPickup}
              disabled={selfPickingUp}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {selfPickingUp ? 'Confirming...' : "✅ I've Picked Up the Food"}
            </button>
          </div>
        )}

        {/* ── OTP card (shown when PICKED_UP for non-self-pickup) ── */}
        {!isSelfPickup && claim.status === 'PICKED_UP' && (
          <OtpCard claimId={claimId} />
        )}

        {/* ── Delivered celebration ── */}
        {isDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-green-800 text-lg">Food Delivered!</p>
            <p className="text-sm text-green-700 mt-1">Enjoy your meal. Thank you for using FoodRescue!</p>
          </div>
        )}

        {/* ── Delivery info card (ASSIGNED/PICKED_UP) ── */}
        {!isDelivered && isDonorDelivery && (
          <div className="mt-4 bg-purple-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-900 mb-0.5 flex items-center gap-2">
              <Truck size={14} /> {claim.food?.donor?.name} is delivering personally
            </p>
            <p className="text-xs text-purple-700">
              {claim.status === 'PICKED_UP' ? '🚗 On the way to you!' : '📦 Preparing your delivery…'}
            </p>
            {claim.food?.donor?.phone && (
              <p className="text-xs text-purple-600 mt-1">📞 {claim.food.donor.phone}</p>
            )}
            {livePositions.donor
              ? <p className="text-xs text-purple-500 mt-1 font-medium">📡 Live location active</p>
              : <p className="text-xs text-gray-400 mt-1 italic">Waiting for donor to share live location…</p>
            }
          </div>
        )}

        {!isDelivered && !isSelfPickup && !isDonorDelivery && claim.volunteerTask && (
          <div className="mt-4 bg-orange-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-900 mb-0.5 flex items-center gap-2">
              <Navigation size={14} /> {claim.volunteerTask.volunteer?.name}
            </p>
            <p className="text-xs text-orange-700">
              {claim.status === 'PICKED_UP' ? 'On the way to you 🚴' : 'Heading to pickup location'}
            </p>
            {claim.volunteerTask.volunteer?.phone && (
              <p className="text-xs text-orange-600 mt-1">📞 {claim.volunteerTask.volunteer.phone}</p>
            )}
            {activeVolunteerPos
              ? <p className="text-xs text-orange-500 mt-1 font-medium">📡 Live location active</p>
              : <p className="text-xs text-gray-400 mt-1 italic">Waiting for volunteer to share live location…</p>
            }
          </div>
        )}
      </div>

      {/* ── Food details card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Food Details</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>From:</strong> {claim.food?.donor?.name} — {claim.food?.donor?.location}</p>
          <p><strong>Quantity:</strong> {claim.food?.quantity} servings</p>
          <p><strong>Pickup type:</strong> {
            isDonorDelivery ? '🚗 Donor delivery'
            : isSelfPickup  ? '🚶 Self pickup'
            : '🚴 Volunteer delivery'
          }</p>
          <p><strong>Claimed:</strong> {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
          {claim.food?.donor?.phone && (
            <p><strong>Donor contact:</strong> 📞 {claim.food.donor.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}
