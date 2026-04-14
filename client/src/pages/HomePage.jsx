import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Leaf, ArrowRight, List, Map as MapIcon } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import api from '../lib/api';
import FoodCard from '../components/FoodCard';
import MapView, { greenIcon } from '../components/MapView';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

// Fallback coords (Koramangala, Bangalore)
const DEFAULT_CENTER = [12.9352, 77.6245];

// Geocode a text query via Nominatim (free, no key)
async function geocodeQuery(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (data.length === 0) return null;
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Reverse geocode coords → display name
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  return data.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({ mealsRescued: 1284, totalDonations: 38, volunteersActive: 214 });
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Location state
  const [userLocation, setUserLocation] = useState(null); // [lat,lng]
  const [locationName, setLocationName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [locating, setLocating] = useState(false);

  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Fetch listings + stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [foodRes, statsRes] = await Promise.all([api.get('/food'), api.get('/stats')]);
        setListings(foodRes.data);
        setStats(statsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          const name = await reverseGeocode(coords[0], coords[1]);
          setLocationName(name);
          setSearchInput(name);
          setLocating(false);
        },
        () => {
          setLocationName('Koramangala, Bangalore');
          setSearchInput('Koramangala, Bangalore');
          setLocating(false);
        }
      );
    } else {
      setLocationName('Koramangala, Bangalore');
      setSearchInput('Koramangala, Bangalore');
    }
  }, []);

  // Search button handler
  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) return;
    setLocating(true);
    const coords = await geocodeQuery(searchInput);
    if (coords) {
      setUserLocation(coords);
      setLocationName(searchInput);
      toast.success('Location updated!');
    } else {
      toast.error('Location not found. Try a different area name.');
    }
    setLocating(false);
  }, [searchInput]);

  // Filter listings by food type
  const filtered =
    filter === 'ALL'    ? listings
    : filter === 'VEG'    ? listings.filter(l => l.foodType === 'VEG')
    : filter === 'NON_VEG'? listings.filter(l => l.foodType === 'NON_VEG')
    : listings.filter(l => new Date(l.expiryTime) - new Date() < 2 * 60 * 60 * 1000);

  const handleClaim = (listing) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user?.role !== 'RECEIVER') { toast.error('Only receivers can claim food'); return; }
    navigate(`/food/${listing.id}`);
  };

  const center = userLocation || DEFAULT_CENTER;
  const areaLabel = locationName || 'your area';

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">

        {/* Hero — shown to everyone but CTA text changes */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 leading-tight">
          Surplus food near you,{' '}
          <span className="text-green-600">ready to rescue</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl">
          {isAuthenticated
            ? `Welcome back, ${user?.name?.split(' ')[0]}! Listings near you are shown below.`
            : 'Restaurants, individuals, and food banks share what\'s left. Pick it up or get it delivered — zero waste, zero cost.'}
        </p>

        {/* Search bar */}
        <div className="flex items-center gap-3 max-w-lg mb-10">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <MapPin size={16} className={locating ? 'text-green-500 animate-pulse' : 'text-gray-400'} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Your area, eg. Koramangala, Bangalore"
              className="flex-1 text-sm text-gray-700 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={locating}
            className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Search size={16} /> {locating ? 'Finding...' : 'Search'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-12">
          {[
            { value: stats.mealsRescued?.toLocaleString() || '1,284', label: 'meals rescued' },
            { value: stats.totalDonations || '38', label: 'donations' },
            { value: stats.volunteersActive || '214', label: 'volunteers active' },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{s.value}</span>
              <span className="text-sm text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Listings header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-700">
            <span className="font-bold text-gray-900">{filtered.length} listings</span> near{' '}
            <span className="text-green-600 font-bold">{areaLabel}</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {['ALL', 'VEG', 'NON_VEG', 'URGENT'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filter === f
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'NON_VEG' ? 'Non-Veg' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
            {/* List / Map toggle */}
            <div className="flex items-center bg-white border border-gray-200 rounded-full overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List size={12} /> List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'map' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MapIcon size={12} /> Map
              </button>
            </div>
          </div>
        </div>

        {/* Content — list or map */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 520 }}>
            <MapView center={center} zoom={13} height="520px" flyTo={center}>
              {filtered.map(listing => {
                // Use a deterministic pseudo-offset so pins don't stack on the same city.
                // In a real app each listing would have real lat/lng stored in DB.
                const seed = parseInt(listing.id.replace(/-/g, '').slice(-6), 16);
                const latOff = ((seed % 200) - 100) * 0.0001;
                const lngOff = ((seed % 150) - 75)  * 0.0001;
                const pos = [center[0] + latOff, center[1] + lngOff];
                return (
                  <Marker key={listing.id} position={pos} icon={greenIcon}>
                    <Popup>
                      <div className="text-sm max-w-[160px]">
                        <p className="font-bold text-gray-900 mb-0.5">{listing.title}</p>
                        <p className="text-gray-500 text-xs mb-1">{listing.quantity} servings · {listing.foodType}</p>
                        <p className="text-xs text-gray-400 mb-2">{listing.location}</p>
                        <a
                          href={`/food/${listing.id}`}
                          className="text-xs font-semibold text-green-600 hover:underline"
                        >
                          View listing →
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapView>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Leaf size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No food listings available right now.</p>
            <p className="text-sm mt-1">Check back soon or be the first to donate!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(listing => (
              <FoodCard key={listing.id} listing={listing} onClaim={handleClaim} />
            ))}
          </div>
        )}

        {/* CTA banner — only for non-authenticated users */}
        {!isAuthenticated && (
          <div className="mt-12 bg-green-600 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Have surplus food?</h3>
              <p className="text-green-100 text-sm">List it for free and help your community.</p>
            </div>
            <Link
              to="/signup"
              className="bg-white text-green-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-green-50 transition-colors text-sm whitespace-nowrap"
            >
              Start Donating <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* Role-specific CTAs for logged-in users */}
        {isAuthenticated && user?.role === 'DONOR' && (
          <div className="mt-12 bg-green-600 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Ready to donate?</h3>
              <p className="text-green-100 text-sm">Post your surplus food listing in under a minute.</p>
            </div>
            <Link
              to="/donor/add"
              className="bg-white text-green-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-green-50 transition-colors text-sm whitespace-nowrap"
            >
              Post Food <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {isAuthenticated && user?.role === 'VOLUNTEER' && (
          <div className="mt-12 bg-blue-600 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Open delivery requests</h3>
              <p className="text-blue-100 text-sm">Check your dashboard for new pickup assignments.</p>
            </div>
            <Link
              to="/volunteer"
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-colors text-sm whitespace-nowrap"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1"><Leaf size={12} className="text-green-500" /> {stats.totalDonations || 44} missions today</span>
              <span>+ Find a listing</span>
            </div>
            <span>© 2024 FoodRescue · Zero waste, zero cost</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
