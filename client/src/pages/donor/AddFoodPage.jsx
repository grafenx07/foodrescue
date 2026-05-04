import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Eye, MapPin, Loader } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const FOOD_TYPES = [
  { value: 'VEG', label: '✅ Veg', color: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'NON_VEG', label: '🍗 Non-Veg', color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'PACKAGED', label: '📦 Packaged', color: 'border-blue-400 bg-blue-50 text-blue-700' },
];

const PICKUP_OPTIONS = [
  { value: "VOLUNTEER", label: "Volunteer delivers", desc: 'A volunteer picks up and delivers on your behalf', icon: '🚴' },
  { value: 'DONOR_DELIVERY', label: 'I will deliver', desc: 'You deliver the food directly to the receiver', icon: '🚗' },
  { value: 'RECEIVER_PICKUP', label: 'Receiver picks up', desc: 'The claimer comes to your location to collect', icon: '🚶' },
  { value: 'FLEXIBLE', label: 'Flexible / any', desc: 'Receiver decides how they get the food', icon: '🔄' },
];

// Reverse geocode using Nominatim
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    // Return a clean human-readable address
    const parts = data.display_name?.split(',') || [];
    return parts.slice(0, 3).join(', ').trim();
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function AddFoodPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', quantity: '', foodTypes: ['VEG'],
    expiryTime: '', location: user?.location || '',
    pickupArrangement: 'FLEXIBLE',
    lat: null, lng: null,
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const toggleFoodType = (value) => {
    setForm(prev => {
      const already = prev.foodTypes.includes(value);
      if (already && prev.foodTypes.length === 1) return prev;
      return {
        ...prev,
        foodTypes: already
          ? prev.foodTypes.filter(t => t !== value)
          : [...prev.foodTypes, value],
      };
    });
  };

  // Auto-detect location on mount if user has no saved location
  useEffect(() => {
    if (form.location) return; // Already have a location from profile
    detectCurrentLocation();
  }, []);

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        setForm(prev => ({ ...prev, location: name, lat, lng }));
        setDetectingLocation(false);
        toast.success('Location detected!');
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) toast.error('Location permission denied');
        else toast.error('Could not detect location');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImage = e => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.quantity || !form.expiryTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!form.location) {
      toast.error('Please enter or detect your location');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('quantity', form.quantity);
      formData.append('foodType', form.foodTypes[0]);
      formData.append('expiryTime', form.expiryTime);
      formData.append('location', form.location);
      formData.append('pickupArrangement', form.pickupArrangement);
      if (form.lat) formData.append('lat', form.lat);
      if (form.lng) formData.append('lng', form.lng);
      if (image) formData.append('image', image);

      await api.post('/food', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Food listing posted successfully!');
      navigate('/donor');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post listing');
    } finally {
      setLoading(false);
    }
  };

  const hasPreview = form.title || form.quantity;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/donor" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Post a food listing</h1>
      <p className="text-sm text-gray-500 mb-8">Share your surplus food with people who need it.</p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form — 3 cols */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Food name *</label>
              <input
                name="title" value={form.title} onChange={handleChange} required
                placeholder="e.g. Dal rice, Idly, etc."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity (servings) *</label>
              <input
                name="quantity" type="number" value={form.quantity} onChange={handleChange} required min="1"
                placeholder="e.g. 15"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food type * <span className="text-xs text-gray-400">(select all that apply)</span>
            </label>
            <div className="flex gap-2">
              {FOOD_TYPES.map(ft => {
                const selected = form.foodTypes.includes(ft.value);
                return (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => toggleFoodType(ft.value)}
                    className={`flex-1 text-sm font-semibold py-2.5 rounded-xl border-2 transition-all relative ${
                      selected ? ft.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {ft.label}
                    {selected && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Selected: {form.foodTypes.join(' + ')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery arrangement * <span className="text-xs text-gray-400">(how will the food reach the receiver?)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PICKUP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, pickupArrangement: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.pickupArrangement === opt.value
                      ? opt.value === 'DONOR_DELIVERY'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-lg mb-0.5">{opt.icon}</p>
                  <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  {opt.value === 'DONOR_DELIVERY' && (
                    <span className="inline-block mt-1 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">No volunteer needed</span>
                  )}
                </button>
              ))}
            </div>
            {form.pickupArrangement === 'DONOR_DELIVERY' && (
              <p className="text-xs text-purple-600 mt-2 flex items-center gap-1.5">
                🚗 <strong>You are committing to personally deliver</strong> the food once someone claims it.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Best before *</label>
            <input
              name="expiryTime" type="datetime-local" value={form.expiryTime} onChange={handleChange} required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Location field with detect button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup location *</label>
            <div className="flex gap-2">
              <input
                name="location" value={form.location} onChange={e => {
                  handleChange(e);
                  setForm(prev => ({ ...prev, lat: null, lng: null }));
                }}
                placeholder="e.g. Gold Star Mess, Koramangala, Bangalore"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
              <button
                type="button"
                onClick={detectCurrentLocation}
                disabled={detectingLocation}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {detectingLocation ? <Loader size={14} className="animate-spin" /> : <MapPin size={14} />}
                {detectingLocation ? 'Detecting…' : 'Detect'}
              </button>
            </div>
            {form.lat && form.lng && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <MapPin size={10} /> GPS coordinates captured — map pin will be accurate
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional notes</label>
            <textarea
              name="description" value={form.description} onChange={handleChange} rows={3}
              placeholder="Any allergies, packaging info, special instructions..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Food photo</label>
            <label className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-4 text-sm text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={16} />
              <span>{image ? image.name : 'Upload photo (recommended)'}</span>
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Posting...' : 'Post listing'}
            </button>
            <button type="button" onClick={() => navigate('/donor')} className="px-5 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>

        {/* Preview — 2 cols */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Eye size={14} /> PREVIEW LISTING
            </h3>
            {!hasPreview ? (
              <div className="text-center py-10 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <Upload size={20} className="text-gray-300" />
                </div>
                <p className="text-sm">Fill in the form to preview</p>
              </div>
            ) : (
              <div>
                <div className="bg-gray-100 rounded-xl h-40 mb-3 overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No photo yet</div>
                  )}
                </div>
                {form.title && <h4 className="font-semibold text-gray-900">{form.title}</h4>}
                {form.quantity && <p className="text-sm text-gray-500 mt-0.5">{form.quantity} servings</p>}
                {form.location && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={10} /> {form.location}</p>
                )}
              </div>
            )}

            {/* Donation guidelines */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">✅ Donation guidelines</p>
              <ul className="space-y-1 text-xs text-gray-500">
                <li>• Food must be safe to eat and prepared for consumption</li>
                <li>• Mention allergens clearly in notes</li>
                <li>• Package food in clean, covered containers</li>
                <li>• Be available during the pickup window</li>
                <li>• Listings expire automatically after the best before time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
