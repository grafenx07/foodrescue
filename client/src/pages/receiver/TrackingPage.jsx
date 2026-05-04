import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Circle, ArrowLeft, Navigation, Truck } from 'lucide-react';
import { Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import MapView, { greenIcon, blueIcon, orangeIcon } from '../../components/MapView';
import toast from 'react-hot-toast';

// Standard volunteer-delivery timeline
const VOLUNTEER_STEPS = [
  { status: 'CLAIMED',   label: 'Claimed',           desc: 'You claimed this food' },
  { status: 'ASSIGNED',  label: 'Volunteer Assigned', desc: 'A volunteer accepted the task' },
  { status: 'PICKED_UP', label: 'Picked Up',          desc: 'Food collected from donor' },
  { status: 'DELIVERED', label: 'Delivered',           desc: 'Food delivered to you' },
];

// Donor-delivery timeline (no volunteer step)
const DONOR_STEPS = [
  { status: 'ASSIGNED',  label: 'Confirmed',    desc: 'Donor confirmed they will deliver' },
  { status: 'PICKED_UP', label: 'On the way',   desc: 'Donor has picked up the food' },
  { status: 'DELIVERED', label: 'Delivered',     desc: 'Food delivered to you 🎉' },
];

const VOLUNTEER_ORDER = { CLAIMED: 0, ASSIGNED: 1, PICKED_UP: 2, DELIVERED: 3 };
const DONOR_ORDER     = { ASSIGNED: 0, PICKED_UP: 1, DELIVERED: 2 };

// Geocode helper
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

// Volunteer moving marker icon
const volunteerIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#f97316;width:26px;height:26px;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;font-size:13px;
  ">🚴</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

export default function TrackingPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map coords
  const [donorCoords, setDonorCoords]     = useState(null);
  const [receiverCoords, setReceiverCoords] = useState(null);
  const [volunteerPos, setVolunteerPos]   = useState(null);
  const pollRef = useRef(null);

  // Fetch claim once
  useEffect(() => {
    api.get(`/claim/${claimId}`)
      .then(r => setClaim(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [claimId]);

  // Geocode donor + receiver addresses once we have the claim
  useEffect(() => {
    if (!claim) return;
    const donorAddr    = claim.food?.donor?.location || claim.food?.location;
    const receiverAddr = claim.receiver?.location;
    Promise.all([geocodeText(donorAddr), geocodeText(receiverAddr)]).then(([dc, rc]) => {
      if (dc) setDonorCoords(dc);
      if (rc) setReceiverCoords(rc);
    });
  }, [claim]);

  // Poll volunteer location every 8 seconds when a volunteer is assigned
  useEffect(() => {
    if (!claim?.volunteerTask) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/tasks/location/${claim.volunteerTask.id}`);
        if (data.lat && data.lng) setVolunteerPos([data.lat, data.lng]);
      } catch { /* silent */ }
    };
    poll();
    pollRef.current = setInterval(poll, 8000);
    return () => clearInterval(pollRef.current);
  }, [claim?.volunteerTask?.id]);

  // Re-fetch claim status every 15 s for timeline updates
  useEffect(() => {
    const t = setInterval(() => {
      api.get(`/claim/${claimId}`).then(r => setClaim(r.data)).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [claimId]);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl h-64 animate-pulse" />
    </div>
  );
  if (!claim) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Claim not found</div>
  );

  const isDonorDelivery = claim.food?.pickupArrangement === 'DONOR_DELIVERY';
  const timelineSteps   = isDonorDelivery ? DONOR_STEPS : VOLUNTEER_STEPS;
  const statusOrder     = isDonorDelivery ? DONOR_ORDER : VOLUNTEER_ORDER;
  const currentIdx      = statusOrder[claim.status] ?? 0;
  const mapCenter       = donorCoords || receiverCoords || [12.9352, 77.6245];
  const routePoints     = [donorCoords, volunteerPos, receiverCoords].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/receiver" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Tracking Your Order</h1>
        <p className="text-sm text-gray-500 mb-5">
          Food: <strong>{claim.food?.title}</strong> from {claim.food?.donor?.name}
        </p>

        {/* Live Map */}
        <div className="rounded-2xl overflow-hidden mb-6 border border-gray-100 shadow-sm" style={{ height: 280 }}>
          <MapView center={mapCenter} zoom={13} height="280px">
            {/* Route line */}
            {routePoints.length >= 2 && (
              <Polyline positions={routePoints} color="#16a34a" weight={3} dashArray="8 6" />
            )}
            {/* Donor pin */}
            {donorCoords && (
              <Marker position={donorCoords} icon={greenIcon}>
                <Popup><span className="text-xs font-semibold">🏠 Donor: {claim.food?.donor?.name}</span></Popup>
              </Marker>
            )}
            {/* Receiver pin */}
            {receiverCoords && (
              <Marker position={receiverCoords} icon={blueIcon}>
                <Popup><span className="text-xs font-semibold">📍 You (Receiver)</span></Popup>
              </Marker>
            )}
            {/* Volunteer live pin */}
            {volunteerPos && (
              <Marker position={volunteerPos} icon={volunteerIcon}>
                <Popup>
                  <span className="text-xs font-semibold">🚴 {claim.volunteerTask?.volunteer?.name} · Live</span>
                </Popup>
              </Marker>
            )}
          </MapView>
        </div>

        {/* Map legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Donor</span>
          {volunteerPos && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Volunteer (live)</span>}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> You</span>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {timelineSteps.map((step, i) => {
            const isCompleted = i <= currentIdx;
            const isCurrent   = i === currentIdx;
            return (
              <div key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? isDonorDelivery ? 'bg-purple-600' : 'bg-green-600'
                      : 'bg-gray-100'
                  }`}>
                    {isCompleted
                      ? <CheckCircle size={16} className="text-white" />
                      : <Circle size={16} className="text-gray-300" />}
                  </div>
                  {i < timelineSteps.length - 1 && (
                    <div className={`w-0.5 h-12 ${
                      isCompleted
                        ? isDonorDelivery ? 'bg-purple-600' : 'bg-green-600'
                        : 'bg-gray-100'
                    }`} />
                  )}
                </div>
                <div className="pb-12 pt-1">
                  <p className={`text-sm font-semibold ${
                    isCurrent
                      ? isDonorDelivery ? 'text-purple-600' : 'text-green-600'
                      : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                    {isCurrent && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                        isDonorDelivery ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                      }`}>Current</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery info card */}
        {isDonorDelivery ? (
          <div className="mt-4 bg-purple-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-900 mb-0.5 flex items-center gap-2">
              <Truck size={14} /> {claim.food?.donor?.name} is delivering personally
            </p>
            <p className="text-xs text-purple-700">
              {claim.status === 'PICKED_UP'
                ? '🚗 Donor is on the way to you!'
                : '📦 Donor will deliver as soon as possible'}
            </p>
            {claim.food?.donor?.phone && (
              <p className="text-xs text-purple-600 mt-1">📞 {claim.food.donor.phone}</p>
            )}
          </div>
        ) : claim.volunteerTask ? (
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
            {!volunteerPos && (
              <p className="text-xs text-gray-400 mt-2 italic">Waiting for volunteer to share live location…</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Food info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Food Details</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>From:</strong> {claim.food?.donor?.name} — {claim.food?.donor?.location}</p>
          <p><strong>Quantity:</strong> {claim.food?.quantity} servings</p>
          <p><strong>Pickup type:</strong> {
            isDonorDelivery ? '🚗 Donor delivery'
            : claim.pickupType === 'SELF' ? '🚶 Self pickup'
            : '🚴 Volunteer delivery'
          }</p>
          <p><strong>Claimed:</strong> {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
        </div>
      </div>
    </div>
  );
}
