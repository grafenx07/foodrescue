import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle, Circle, ArrowLeft, Navigation, Truck,
  Shield, MapPin, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import MapView, {
  volunteerBikeIcon, donorCarIcon, receiverHomeIcon, donorStaticIcon,
  AnimatedPolyline, useOsrmRoute, userLocationIcon,
} from '../../components/MapView';
import toast from 'react-hot-toast';

// ── Timeline definitions ──────────────────────────────────
const SELF_STEPS = [
  { status: 'CLAIMED',   label: 'Claimed',      desc: 'You claimed this food' },
  { status: 'DELIVERED', label: 'Picked Up ✅', desc: 'You collected the food' },
];
const VOLUNTEER_STEPS = [
  { status: 'CLAIMED',   label: 'Claimed',           desc: 'You claimed this food' },
  { status: 'ASSIGNED',  label: 'Volunteer Assigned', desc: 'A volunteer accepted the task' },
  { status: 'PICKED_UP', label: 'Picked Up',          desc: 'Food collected from donor' },
  { status: 'DELIVERED', label: 'Delivered',           desc: 'Food delivered to you 🎉' },
];
const DONOR_STEPS = [
  { status: 'ASSIGNED',  label: 'Confirmed',  desc: 'Donor confirmed delivery' },
  { status: 'PICKED_UP', label: 'On the way', desc: 'Donor has the food' },
  { status: 'DELIVERED', label: 'Delivered',  desc: 'Food delivered to you 🎉' },
];
const SELF_ORDER      = { CLAIMED: 0, DELIVERED: 1 };
const VOLUNTEER_ORDER = { CLAIMED: 0, ASSIGNED: 1, PICKED_UP: 2, DELIVERED: 3 };
const DONOR_ORDER     = { ASSIGNED: 0, PICKED_UP: 1, DELIVERED: 2 };

// ── Geocode helper ────────────────────────────────────────
async function geocodeText(text) {
  if (!text) return null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    if (!d.length) return null;
    return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
  } catch { return null; }
}

function openGoogleMaps(from, to) {
  if (!to) return;
  const origin = from ? `${from[0]},${from[1]}` : '';
  window.open(`https://www.google.com/maps/dir/${origin}/${to[0]},${to[1]}`, '_blank');
}

// ── OTP card ─────────────────────────────────────────────
function OtpCard({ claimId }) {
  const [otp, setOtp]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden]  = useState(false);

  const fetchOtp = useCallback(async () => {
    try { const { data } = await api.get(`/claim/${claimId}/otp`); setOtp(data.otp); }
    catch { setOtp(null); }
    finally { setLoading(false); }
  }, [claimId]);

  useEffect(() => {
    fetchOtp();
    const t = setInterval(fetchOtp, 30000);
    return () => clearInterval(t);
  }, [fetchOtp]);

  if (loading) return <div className="bg-green-50 border border-green-200 rounded-2xl p-5 animate-pulse h-28" />;
  if (!otp) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
      <p className="text-sm text-amber-800 font-medium">⏳ Your delivery code will appear once food is picked up</p>
    </div>
  );
  return (
    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green-200" />
          <p className="text-sm font-semibold text-green-100">Your Delivery Code</p>
        </div>
        <button onClick={() => setHidden(h => !h)} className="text-green-200 hover:text-white transition-colors">
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      {hidden
        ? <p className="text-2xl font-mono font-bold tracking-widest text-center py-2 text-green-300">••••••</p>
        : <p className="text-4xl font-mono font-bold tracking-widest text-center py-1">{otp}</p>}
      <p className="text-xs text-green-200 text-center mt-2">📣 Read this code to the deliverer to confirm receipt</p>
    </div>
  );
}

// ── Legend dot helper ─────────────────────────────────────
function LegendDot({ color, emoji, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white" style={{ background: color, fontSize: 10 }}>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

// ── Inner map component (needs useOsrmRoute inside MapView context) ───────────
function RouteMap({ mapCenter, routeWaypoints, routeColor, activeDonorPos, liveDonorPos, activeVolunteerPos, activeReceiverPos, claim, livePositions, userCoords }) {
  const { route } = useOsrmRoute(routeWaypoints);

  return (
    <div style={{ height: 320 }}>
      <MapView center={mapCenter} zoom={13} height="320px">
        {route.length >= 2 && (
          <AnimatedPolyline positions={route} color={routeColor} weight={5} />
        )}

        {/* Donor static pin */}
        {activeDonorPos && !liveDonorPos && (
          <Marker position={activeDonorPos} icon={donorStaticIcon}>
            <Popup><span className="text-xs font-semibold">📦 {claim.food?.donor?.name} · Pickup</span></Popup>
          </Marker>
        )}
        {/* Donor live */}
        {liveDonorPos && (
          <Marker position={liveDonorPos} icon={donorCarIcon}>
            <Popup><span className="text-xs font-semibold">🚗 {claim.food?.donor?.name} · Live</span></Popup>
          </Marker>
        )}
        {/* Receiver */}
        {activeReceiverPos && (
          <Marker position={activeReceiverPos} icon={receiverHomeIcon}>
            <Popup><span className="text-xs font-semibold">🏠 You{livePositions.receiver ? ' · Live 📡' : ''}</span></Popup>
          </Marker>
        )}
        {/* Volunteer */}
        {activeVolunteerPos && (
          <Marker position={activeVolunteerPos} icon={volunteerBikeIcon}>
            <Popup><span className="text-xs font-semibold">🚴 {claim.volunteerTask?.volunteer?.name} · Live</span></Popup>
          </Marker>
        )}
        {/* Current user location — Google Maps-style pulsing blue dot */}
        {userCoords && (
          <Marker position={userCoords} icon={userLocationIcon}>
            <Popup><span className="text-xs font-semibold">📍 Your current location</span></Popup>
          </Marker>
        )}
      </MapView>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function TrackingPage() {
  const { claimId } = useParams();
  const [claim, setClaim]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [selfPickingUp, setSelfPickingUp] = useState(false);
  const [donorCoords, setDonorCoords]     = useState(null);
  const [receiverCoords, setReceiverCoords] = useState(null);
  const [userCoords, setUserCoords]       = useState(null);
  const [livePositions, setLivePositions] = useState({ donor: null, volunteer: null, receiver: null });
  const [sharingLocation, setSharingLocation] = useState(false);
  const receiverWatchRef = useRef(null);

  const fetchClaim = useCallback(async () => {
    try { const { data } = await api.get(`/claim/${claimId}`); setClaim(data); }
    catch { /* silent */ }
  }, [claimId]);

  // Get user's GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  // Initial load
  useEffect(() => {
    api.get(`/claim/${claimId}`)
      .then(r => setClaim(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [claimId]);

  // Geocode addresses
  useEffect(() => {
    if (!claim) return;
    const da = claim.food?.donor?.location || claim.food?.location;
    const ra = claim.receiver?.location;
    Promise.all([geocodeText(da), geocodeText(ra)]).then(([dc, rc]) => {
      if (dc) setDonorCoords(dc);
      if (rc) setReceiverCoords(rc);
    });
  }, [claim?.id]);

  // Poll live positions
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

  // Re-fetch status
  useEffect(() => {
    const t = setInterval(fetchClaim, 15000);
    return () => clearInterval(t);
  }, [fetchClaim]);

  // Location sharing
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
    toast.success('Sharing your location 📡');
    receiverWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        api.post(`/claim/${claimId}/location`, {
          lat: pos.coords.latitude, lng: pos.coords.longitude, role: 'receiver',
        }).catch(() => {});
      },
      () => { toast.error('Location access denied'); setSharingLocation(false); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };
  useEffect(() => () => {
    if (receiverWatchRef.current != null) navigator.geolocation.clearWatch(receiverWatchRef.current);
  }, []);

  const handleSelfPickup = async () => {
    setSelfPickingUp(true);
    try {
      await api.post(`/claim/${claimId}/self-pickup`);
      toast.success('🎉 Pickup confirmed!');
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
  const isDelivered     = claim.status === 'DELIVERED';

  const timelineSteps = isSelfPickup ? SELF_STEPS : isDonorDelivery ? DONOR_STEPS : VOLUNTEER_STEPS;
  const statusOrder   = isSelfPickup ? SELF_ORDER  : isDonorDelivery ? DONOR_ORDER  : VOLUNTEER_ORDER;
  const currentIdx    = statusOrder[claim.status] ?? 0;

  // Resolved positions
  const liveDonorPos     = livePositions.donor;
  const liveVolunteerPos = livePositions.volunteer;
  const activeDonorPos    = liveDonorPos    || donorCoords;
  const activeVolunteerPos = liveVolunteerPos;
  const activeReceiverPos = livePositions.receiver || receiverCoords;
  const mapCenter = userCoords || activeDonorPos || activeReceiverPos || [12.9352, 77.6245];

  // ── Route logic ───────────────────────────────────────
  let routeWaypoints = null;
  let routeColor     = '#16a34a';
  let phaseLabel     = null;

  if (isSelfPickup && !isDelivered) {
    // Receiver walks to donor
    const from = userCoords || activeReceiverPos;
    if (from && activeDonorPos) { routeWaypoints = [from, activeDonorPos]; }
    routeColor = '#3b82f6';
    phaseLabel = '🚶 Walk to pickup location';
  } else if (isDonorDelivery && !isDelivered) {
    // Donor drives to receiver
    const from = liveDonorPos || activeDonorPos;
    if (from && activeReceiverPos) { routeWaypoints = [from, activeReceiverPos]; }
    routeColor = '#9333ea';
    phaseLabel = claim.status === 'PICKED_UP' ? '🚗 Donor is on the way!' : '🚗 Donor preparing delivery';
  } else if (!isSelfPickup && !isDonorDelivery && !isDelivered) {
    // Volunteer: phase 1 → pickup, phase 2 → delivery
    if (claim.status === 'PICKED_UP' && liveVolunteerPos && activeReceiverPos) {
      routeWaypoints = [liveVolunteerPos, activeReceiverPos];
      phaseLabel = '🚴 Volunteer delivering to you';
    } else if (liveVolunteerPos && activeDonorPos) {
      routeWaypoints = [liveVolunteerPos, activeDonorPos];
      phaseLabel = '🚴 Volunteer heading to pickup';
    }
    routeColor = '#f97316';
  }

  // Navigate CTA only for self-pickup
  const navDestination = isSelfPickup ? activeDonorPos : null;

  // Accent colours
  const accent = isDonorDelivery
    ? { dot: 'bg-purple-600', line: 'bg-purple-600', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' }
    : isSelfPickup
    ? { dot: 'bg-blue-600',   line: 'bg-blue-600',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'   }
    : { dot: 'bg-green-600',  line: 'bg-green-600',  text: 'text-green-600',  badge: 'bg-green-100 text-green-700' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/receiver" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      {/* ── Hero card with map ── */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-5 border border-green-100" style={{ background: 'linear-gradient(160deg,#f0fdf4,#dcfce7)' }}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isSelfPickup ? '🚶 Self Pickup' : isDonorDelivery ? '🚗 Donor Delivery' : '🚴 Volunteer Delivery'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                <strong>{claim.food?.title}</strong> · from {claim.food?.donor?.name}
              </p>
            </div>
            <button onClick={fetchClaim} className="p-2 text-gray-400 hover:text-green-600 rounded-xl hover:bg-green-100 transition-colors">
              <RefreshCw size={15} />
            </button>
          </div>

          {phaseLabel && !isDelivered && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: routeColor + '18', color: routeColor, border: `1px solid ${routeColor}33` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: routeColor }} />
              {phaseLabel}
            </div>
          )}
        </div>

        {/* Map */}
        <RouteMap
          mapCenter={mapCenter}
          routeWaypoints={routeWaypoints}
          routeColor={routeColor}
          activeDonorPos={activeDonorPos}
          liveDonorPos={liveDonorPos}
          activeVolunteerPos={activeVolunteerPos}
          activeReceiverPos={activeReceiverPos}
          claim={claim}
          livePositions={livePositions}
          userCoords={userCoords}
        />

        {/* Legend row */}
        <div className="px-5 pt-3 pb-4 flex items-center justify-between gap-3 flex-wrap border-t border-green-100">
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <LegendDot color="#16a34a" emoji="📦" label="Food source" />
            {activeVolunteerPos && <LegendDot color="#f97316" emoji="🚴" label={livePositions.volunteer ? 'Volunteer · Live' : 'Volunteer'} />}
            {isDonorDelivery && liveDonorPos && <LegendDot color="#9333ea" emoji="🚗" label="Donor · Live" />}
            <LegendDot color="#2563eb" emoji="🏠" label={livePositions.receiver ? 'You · Live' : 'You'} />
            {userCoords && <LegendDot color="#1d4ed8" emoji="📍" label="My Location" />}
          </div>
          {navDestination && (
            <button
              onClick={() => openGoogleMaps(userCoords, navDestination)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Navigation size={12} /> Navigate
            </button>
          )}
        </div>
      </div>

      {/* ── Action card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">

        {/* Share location */}
        {!isSelfPickup && !isDelivered && (
          <button
            onClick={toggleShareLocation}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold mb-5 transition-colors border ${
              sharingLocation
                ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Navigation size={14} />
            {sharingLocation ? '📡 Sharing your location' : 'Share my location with deliverer'}
          </button>
        )}

        {/* Timeline */}
        <div className="space-y-0 mb-5">
          {timelineSteps.map((step, i) => {
            const done = i <= currentIdx;
            const cur  = i === currentIdx;
            return (
              <div key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${done ? accent.dot : 'bg-gray-100'}`}>
                    {done ? <CheckCircle size={16} className="text-white" /> : <Circle size={16} className="text-gray-300" />}
                  </div>
                  {i < timelineSteps.length - 1 && (
                    <div className={`w-0.5 h-12 ${done ? accent.line : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-12 pt-1">
                  <p className={`text-sm font-semibold ${cur ? accent.text : done ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                    {cur && <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${accent.badge}`}>Current</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Self-pickup confirm */}
        {isSelfPickup && claim.status === 'CLAIMED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <MapPin size={14} /> Ready to pick up your food?
            </p>
            <p className="text-xs text-blue-700 mb-4">
              Head to <strong>{claim.food?.donor?.location}</strong> and collect from {claim.food?.donor?.name}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSelfPickup}
                disabled={selfPickingUp}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {selfPickingUp ? 'Confirming…' : "✅ I've Picked Up"}
              </button>
              {activeDonorPos && (
                <button
                  onClick={() => openGoogleMaps(userCoords, activeDonorPos)}
                  className="px-4 py-3 bg-white border border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-sm flex items-center gap-1.5"
                >
                  <Navigation size={14} /> Navigate
                </button>
              )}
            </div>
          </div>
        )}

        {/* OTP */}
        {!isSelfPickup && claim.status === 'PICKED_UP' && <OtpCard claimId={claimId} />}

        {/* Delivered */}
        {isDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-green-800 text-lg">Food Delivered!</p>
            <p className="text-sm text-green-700 mt-1">Enjoy your meal. Thank you for using FoodRescue!</p>
          </div>
        )}

        {/* Donor delivery info */}
        {!isDelivered && isDonorDelivery && (
          <div className="mt-4 bg-purple-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-900 mb-0.5 flex items-center gap-2">
              <Truck size={14} /> {claim.food?.donor?.name} is delivering personally
            </p>
            <p className="text-xs text-purple-700">
              {claim.status === 'PICKED_UP' ? '🚗 On the way to you!' : '📦 Preparing your delivery…'}
            </p>
            {claim.food?.donor?.phone && <p className="text-xs text-purple-600 mt-1">📞 {claim.food.donor.phone}</p>}
            {liveDonorPos
              ? <p className="text-xs text-purple-500 mt-1 font-medium">📡 Live location active</p>
              : <p className="text-xs text-gray-400 mt-1 italic">Waiting for donor to share live location…</p>}
          </div>
        )}

        {/* Volunteer info */}
        {!isDelivered && !isSelfPickup && !isDonorDelivery && claim.volunteerTask && (
          <div className="mt-4 bg-orange-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-900 mb-0.5 flex items-center gap-2">
              <Navigation size={14} /> {claim.volunteerTask.volunteer?.name}
            </p>
            <p className="text-xs text-orange-700">
              {claim.status === 'PICKED_UP' ? '🚴 On the way to you!' : '📍 Heading to pickup location'}
            </p>
            {claim.volunteerTask.volunteer?.phone && (
              <p className="text-xs text-orange-600 mt-1">📞 {claim.volunteerTask.volunteer.phone}</p>
            )}
            {activeVolunteerPos
              ? <p className="text-xs text-orange-500 mt-1 font-medium">📡 Live location active</p>
              : <p className="text-xs text-gray-400 mt-1 italic">Waiting for volunteer to share live location…</p>}
          </div>
        )}
      </div>

      {/* Food details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Food Details</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>From:</strong> {claim.food?.donor?.name} — {claim.food?.donor?.location}</p>
          <p><strong>Quantity:</strong> {claim.food?.quantity} servings</p>
          <p><strong>Type:</strong> {isDonorDelivery ? '🚗 Donor delivery' : isSelfPickup ? '🚶 Self pickup' : '🚴 Volunteer delivery'}</p>
          <p><strong>Claimed:</strong> {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
          {claim.food?.donor?.phone && <p><strong>Donor contact:</strong> 📞 {claim.food.donor.phone}</p>}
        </div>
      </div>
    </div>
  );
}
