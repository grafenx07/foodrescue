import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Users, MapPin, ArrowLeft, User, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
];

export default function FoodDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupType, setPickupType] = useState('SELF');
  const [claiming, setClaiming] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/food/${id}`)
      .then(r => setListing(r.data))
      .catch(() => toast.error('Food listing not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleClaim = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user?.role !== 'RECEIVER') { toast.error('Only receivers can claim food'); return; }
    setClaiming(true);
    try {
      const { data } = await api.post('/claim', { foodId: id, pickupType });
      toast.success('Food claimed successfully!');
      navigate(`/track/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to claim food');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl h-96 animate-pulse" />
    </div>
  );
  if (!listing) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Listing not found</div>
  );

  const imgIdx = parseInt(listing.id.replace(/-/g, '').slice(-4), 16) % PLACEHOLDER_IMAGES.length;
  const imgSrc = listing.imageUrl || PLACEHOLDER_IMAGES[imgIdx];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to listings
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-gray-100 h-72 mb-4">
            <img src={imgSrc} alt={listing.title} className="w-full h-full object-cover" onError={e => { e.target.src = PLACEHOLDER_IMAGES[0]; }} />
          </div>

          {/* Google Maps Iframe */}
          <div className="bg-gray-100 rounded-2xl h-40 overflow-hidden relative shadow-sm border border-gray-100">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(listing.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>

        {/* Right */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            <StatusBadge status={listing.status} />
          </div>

          <p className="text-gray-600 text-sm mb-4">{listing.description || 'No description provided.'}</p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Clock size={16} className="text-orange-500" />
              <span>Expires in <strong>{formatDistanceToNow(new Date(listing.expiryTime))}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users size={16} className="text-blue-500" />
              <span><strong>{listing.quantity}</strong> servings available</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-green-500" />
              <span>{listing.location}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-gray-400" />
              <span>Donated by <strong>{listing.donor?.name}</strong></span>
            </div>
            {listing.donor?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-gray-400" />
                <span>{listing.donor.phone}</span>
              </div>
            )}
          </div>

          {listing.status === 'AVAILABLE' && (
            <>
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Pickup option</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'SELF', label: '🚶 Self Pickup', desc: 'Go pick it up yourself' },
                    { value: 'VOLUNTEER', label: '🚴 Request Volunteer', desc: 'A volunteer delivers it to you' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPickupType(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        pickupType === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isAuthenticated && user?.role === 'RECEIVER' ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors text-base disabled:opacity-60"
                >
                  {claiming ? 'Claiming...' : '✅ Claim this food'}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors text-base text-center"
                >
                  Login to Claim
                </Link>
              )}
            </>
          )}

          {listing.status !== 'AVAILABLE' && (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm">
              This listing is no longer available for claiming.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
