import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, MapPin, Bike, User, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';
import { resolveImageUrl } from '../lib/imageUrl';

const FOOD_TYPE_COLORS = {
  VEG: 'bg-green-100 text-green-700',
  NON_VEG: 'bg-red-100 text-red-700',
  PACKAGED: 'bg-blue-100 text-blue-700',
};

const FOOD_TYPE_LABELS = { VEG: 'Veg', NON_VEG: 'Non-Veg', PACKAGED: 'Packaged' };

const PICKUP_LABELS = {
  VOLUNTEER:      { label: 'Volunteer delivery', icon: Bike,  color: 'text-blue-600 bg-blue-50' },
  RECEIVER_PICKUP:{ label: 'Self pickup',        icon: User,  color: 'text-amber-700 bg-amber-50' },
  SELF:           { label: 'Self pickup',        icon: User,  color: 'text-amber-700 bg-amber-50' },
  DONOR_DELIVERY: { label: 'Donor delivers',     icon: Truck, color: 'text-purple-700 bg-purple-50' },
  "I'LL_DELIVER": { label: 'Donor delivers',     icon: Truck, color: 'text-purple-700 bg-purple-50' },
  FLEXIBLE:       { label: 'Flexible',           icon: Truck, color: 'text-gray-600 bg-gray-100' },
};

/** Geocode a location string → [lat, lng] via Nominatim */
async function geocodeLocation(location) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

/** Haversine distance in km between two [lat,lng] pairs */
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Placeholder food images if no image uploaded
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
];

/**
 * FoodCard
 * @param {object}        listing      - food listing object
 * @param {function}      onClaim      - if provided, show Claim button and call this fn with listing
 * @param {boolean}       showClaim    - set false to hide claim button entirely (default true)
 * @param {[lat,lng]|null} userLocation - current user coords for distance display
 */
export default function FoodCard({ listing, onClaim, showClaim = true, userLocation = null }) {
  const expiry = new Date(listing.expiryTime);
  const isExpiringSoon = expiry - new Date() < 2 * 60 * 60 * 1000;
  const isExpired = expiry < new Date();
  const imageIdx = listing.id ? parseInt(listing.id.replace(/-/g, '').slice(-4), 16) % PLACEHOLDER_IMAGES.length : 0;
  const imgSrc = resolveImageUrl(listing.imageUrl) || PLACEHOLDER_IMAGES[imageIdx];

  // Geocoded coords fallback when listing.lat/lng are missing
  const [geocodedCoords, setGeocodedCoords] = useState(null);
  useEffect(() => {
    if (!userLocation) return;
    if (listing.lat && listing.lng) return; // already have real coords
    if (!listing.location) return;
    let cancelled = false;
    geocodeLocation(listing.location).then(coords => {
      if (!cancelled && coords) setGeocodedCoords(coords);
    });
    return () => { cancelled = true; };
  }, [listing.id, listing.lat, listing.lng, listing.location, userLocation]);

  // Distance from user — use real DB coords first, then geocoded fallback
  const listingCoords = (listing.lat && listing.lng)
    ? [listing.lat, listing.lng]
    : geocodedCoords;
  const distKm = (userLocation && listingCoords)
    ? haversineKm(userLocation, listingCoords)
    : null;
  const distLabel = distKm !== null
    ? (distKm < 1 ? `${Math.round(distKm * 1000)} m away` : `${distKm.toFixed(1)} km away`)
    : null;

  // Pickup / delivery type
  const pickupKey = listing.pickupArrangement || listing.pickupType || 'FLEXIBLE';
  const pickup = PICKUP_LABELS[pickupKey] || PICKUP_LABELS.FLEXIBLE;
  const PickupIcon = pickup.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <Link to={`/food/${listing.id}`} className="block">
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          <img
            src={imgSrc}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.src = PLACEHOLDER_IMAGES[0]; }}
          />
          <div className="absolute top-2 left-2 flex gap-1.5">
            {isExpiringSoon && !isExpired && (
              <span className="bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Expiring</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FOOD_TYPE_COLORS[listing.foodType] || 'bg-gray-100 text-gray-600'}`}>
              {FOOD_TYPE_LABELS[listing.foodType] || listing.foodType}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <StatusBadge status={listing.status} size="sm" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-base mb-0.5 line-clamp-1">{listing.title}</h3>
          <p className="text-xs text-gray-500 mb-2">{listing.donor?.name || 'Unknown donor'}</p>

          {/* Delivery type badge */}
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${pickup.color}`}>
            <PickupIcon size={10} />
            {pickup.label}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{isExpired ? 'Expired' : `in ${formatDistanceToNow(expiry)}`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{listing.quantity} portions</span>
            </div>
          </div>

          {/* Distance from user */}
          {distLabel && (
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1.5 font-medium">
              <MapPin size={11} />
              {distLabel}
            </div>
          )}
        </div>
      </Link>

      {/* Claim button — only if the listing is available AND onClaim is provided */}
      {showClaim && listing.status === 'AVAILABLE' && onClaim && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClaim(listing);
            }}
            className="w-full bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Claim
          </button>
        </div>
      )}

      {/* Fallback: show View Details when no onClaim handler */}
      {showClaim && listing.status === 'AVAILABLE' && !onClaim && (
        <div className="px-4 pb-4">
          <Link
            to={`/food/${listing.id}`}
            className="block w-full bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors text-center"
          >
            View & Claim
          </Link>
        </div>
      )}
    </div>
  );
}
