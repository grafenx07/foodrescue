import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Eye } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const FOOD_TYPES = [
  { value: 'VEG', label: '✅ Veg', color: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'NON_VEG', label: '🍗 Non-Veg', color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'PACKAGED', label: '📦 Packaged', color: 'border-blue-400 bg-blue-50 text-blue-700' },
];

const PICKUP_OPTIONS = [
  { value: "I'LL_DELIVER", label: "I'll deliver it", desc: 'You bring the food to the receiver directly', icon: '🚗' },
  { value: 'RECEIVER_PICKUP', label: 'Receiver picks up', desc: 'The claimer comes to your location to collect', icon: '🚶' },
  { value: 'VOLUNTEER', label: 'Volunteer delivers', desc: 'A volunteer picks up and delivers on your behalf', icon: '🚴' },
  { value: 'FLEXIBLE', label: 'Flexible / any', desc: 'Receiver decides how they get the food', icon: '🔄' },
];

export default function AddFoodPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', quantity: '', foodTypes: ['VEG'],
    expiryTime: '', location: user?.location || 'Koramangala, Bangalore',
    pickupArrangement: 'FLEXIBLE',
  });

  const toggleFoodType = (value) => {
    setForm(prev => {
      const already = prev.foodTypes.includes(value);
      if (already && prev.foodTypes.length === 1) return prev; // keep at least one
      return {
        ...prev,
        foodTypes: already
          ? prev.foodTypes.filter(t => t !== value)
          : [...prev.foodTypes, value],
      };
    });
  };
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleImage = e => {
    const file = e.target.files[0];
    if (file) {
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
    setLoading(true);
    try {
      const formData = new FormData();
      // Spread form but send foodType as the PRIMARY type (first selected)
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'foodTypes') formData.append(k, v);
      });
      formData.append('foodType', form.foodTypes[0]); // primary type for DB
      formData.append('foodTypesAll', form.foodTypes.join(','));
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

  const hasPreview = form.title || form.quantity || form.foodType;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/donor" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Post a food listing</h1>
      <p className="text-sm text-gray-500 mb-8">I am donating as a</p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form — 3 cols */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
          {/* Donor type selector */}
          <div className="flex gap-2 flex-wrap">
            {['Donor PG', 'Restaurant / Mess', 'Individual', 'NGO / Organisation'].map(t => (
              <button key={t} type="button" className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                t === 'Donor PG' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}>{t}</button>
            ))}
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery arrangement * <span className="text-xs text-gray-400">(how will the food reach the receiver?)</span></label>
            <div className="grid grid-cols-2 gap-3">
              {PICKUP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, pickupArrangement: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.pickupArrangement === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-lg mb-0.5">{opt.icon}</p>
                  <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Best before *</label>
            <input
              name="expiryTime" type="datetime-local" value={form.expiryTime} onChange={handleChange} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
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
              Save as draft
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
                {form.pickupArrangement === 'FLEXIBLE' && (
                  <div className="mt-3 bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-800">🔄 Flexible / any</p>
                    <p className="text-xs text-green-600 mt-0.5">Receiver decides how they get the food</p>
                  </div>
                )}
              </div>
            )}

            {/* Donation guidelines */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">✅ Donation guidelines</p>
              <ul className="space-y-1 text-xs text-gray-500">
                <li>• Food needs to be safe to eat and prepared for consumption</li>
                <li>• Mention allergens clearly in notes</li>
                <li>• Package food in clean, covered containers</li>
                <li>• Be available during the pickup window</li>
                <li>• Listings expire automatically after the best before time</li>
              </ul>
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 flex items-center gap-1">📍 Location auto-detected from your profile</p>
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-medium">{form.location}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
