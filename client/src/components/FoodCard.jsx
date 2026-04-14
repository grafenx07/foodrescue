import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, MapPin, Leaf } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from './StatusBadge';

const FOOD_TYPE_COLORS = {
  VEG: 'bg-green-100 text-green-700',
  NON_VEG: 'bg-red-100 text-red-700',
  PACKAGED: 'bg-blue-100 text-blue-700',
};

const FOOD_TYPE_LABELS = { VEG: 'Veg', NON_VEG: 'Non-Veg', PACKAGED: 'Packaged' };

// Placeholder food images if no image uploaded
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
];

export default function FoodCard({ listing, onClaim, showClaim = true }) {
  const expiry = new Date(listing.expiryTime);
  const isExpiringSoon = expiry - new Date() < 2 * 60 * 60 * 1000;
  const imageIdx = listing.id ? parseInt(listing.id.replace(/-/g, '').slice(-4), 16) % PLACEHOLDER_IMAGES.length : 0;
  const imgSrc = listing.imageUrl ? listing.imageUrl : PLACEHOLDER_IMAGES[imageIdx];

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
            {isExpiringSoon && (
              <span className="bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Expiring</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FOOD_TYPE_COLORS[listing.foodType]}`}>
              {FOOD_TYPE_LABELS[listing.foodType]}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <StatusBadge status={listing.status} size="sm" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-base mb-0.5 line-clamp-1">{listing.title}</h3>
          <p className="text-sm text-gray-500 mb-3">{listing.donor?.name || 'Unknown donor'}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>in {formatDistanceToNow(expiry)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{listing.quantity} portions</span>
            </div>
          </div>
        </div>
      </Link>
      {showClaim && listing.status === 'AVAILABLE' && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onClaim?.(listing)}
            className="w-full bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Claim
          </button>
        </div>
      )}
    </div>
  );
}
