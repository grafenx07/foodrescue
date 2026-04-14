import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Leaf, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import FoodCard from '../components/FoodCard';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState({ mealsRescued: 1284, totalDonations: 38, volunteersActive: 214 });
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

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

  const filtered = filter === 'ALL' ? listings
    : filter === 'VEG' ? listings.filter(l => l.foodType === 'VEG')
    : filter === 'NON_VEG' ? listings.filter(l => l.foodType === 'NON_VEG')
    : listings.filter(l => new Date(l.expiryTime) - new Date() < 2 * 60 * 60 * 1000);

  const handleClaim = (listing) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user?.role !== 'RECEIVER') { toast.error('Only receivers can claim food'); return; }
    navigate(`/food/${listing.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 leading-tight">
          Surplus food near you,{' '}
          <span className="text-green-600">ready to rescue</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl">
          Restaurants, individuals, and food banks share what's left. Pick it up or get it delivered — zero waste, zero cost.
        </p>

        {/* Search bar */}
        <div className="flex items-center gap-3 max-w-lg mb-10">
          <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <MapPin size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Your area, eg. Koramangala, Bangalore"
              className="flex-1 text-sm text-gray-700 outline-none"
              readOnly
            />
          </div>
          <button className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors flex items-center gap-2">
            <Search size={16} /> Search
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

        {/* Listings */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-700">
            <span className="font-bold text-gray-900">{filtered.length} listings</span> near{' '}
            <span className="text-green-600 font-bold">Koramangala</span>
          </h2>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
            ))}
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

        {/* CTA banner */}
        {!isAuthenticated && (
          <div className="mt-12 bg-green-600 rounded-2xl p-8 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Have surplus food?</h3>
              <p className="text-green-100 text-sm">List it for free and help your community.</p>
            </div>
            <Link
              to="/signup"
              className="bg-white text-green-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-green-50 transition-colors text-sm"
            >
              Start Donating <ArrowRight size={16} />
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
