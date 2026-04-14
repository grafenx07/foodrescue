import React, { useEffect, useState, useRef } from 'react';
import { Package, CheckCircle, Star, Users, RefreshCw, MapPin, Award, Navigation } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import StatusBadge from '../../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TOP_VOLUNTEERS = [
  { name: 'Harsh Patel', rating: 5.0, deliveries: 28, badge: '🥇' },
  { name: 'Preethi L.', rating: 4.9, deliveries: 24, badge: '🥈' },
  { name: 'Aroshi G.', rating: 4.8, deliveries: 20, badge: '🥉' },
  { name: 'Suresh M.', rating: 4.7, deliveries: 18, badge: '' },
];

export default function VolunteerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState({ openClaims: [], myTasks: [], completedTasks: [] });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sharingTaskId, setSharingTaskId] = useState(null); // currently broadcasting task
  const watchRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/tasks');
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAccept = async (claimId) => {
    setAccepting(claimId);
    try {
      await api.post('/tasks/accept', { claimId });
      toast.success('Task accepted! Go pick it up.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept task');
    } finally {
      setAccepting(null);
    }
  };

  const handleStatusUpdate = async (taskId, status) => {
    setUpdating(taskId);
    try {
      await api.post('/tasks/update-status', { taskId, status });
      toast.success(status === 'PICKED_UP' ? 'Marked as picked up!' : '🎉 Delivery complete!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const toggleLiveTracking = (taskId) => {
    if (sharingTaskId === taskId) {
      // Stop sharing
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setSharingTaskId(null);
      toast('Location sharing stopped.', { icon: '📍' });
      return;
    }
    if (!navigator.geolocation) { toast.error('Geolocation not supported by your browser'); return; }
    setSharingTaskId(taskId);
    toast.success('Sharing live location 📡');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        api.post('/tasks/location', {
          taskId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      () => toast.error('Location access denied'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  // Clean up on unmount
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const { openClaims, myTasks, completedTasks } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — tasks */}
        <div className="lg:col-span-2 space-y-5">
          {/* My active deliveries */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📦 My active deliveries
              {myTasks.length > 0 && <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{myTasks.length}</span>}
            </h2>
            {myTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">No active deliveries</div>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl border border-gray-100 p-5 mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{task.claim.food.title}</h3>
                      <p className="text-sm text-gray-500">{task.claim.food.donor.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="text-green-600">{task.claim.food.donor.location}</span>
                        {' → '}
                        <span>{task.claim.receiver.location || task.claim.receiver.name}</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">Deliver to: <strong>{task.claim.receiver.name}</strong></p>
                    </div>
                    <StatusBadge status={task.status === 'ASSIGNED' ? 'ASSIGNED' : 'PICKED_UP'} />
                  </div>
                  <div className="flex gap-3">
                    {task.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleStatusUpdate(task.id, 'PICKED_UP')}
                        disabled={updating === task.id}
                        className="flex-1 bg-orange-500 text-white font-semibold py-2.5 rounded-xl hover:bg-orange-600 transition-colors text-sm disabled:opacity-60"
                      >
                        {updating === task.id ? 'Updating...' : '📦 Mark Picked Up'}
                      </button>
                    )}
                    {task.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleStatusUpdate(task.id, 'DELIVERED')}
                        disabled={updating === task.id}
                        className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-60"
                      >
                        {updating === task.id ? 'Completing...' : '✅ Mark Delivered'}
                      </button>
                    )}
                    <button
                      onClick={() => toggleLiveTracking(task.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                        sharingTaskId === task.id
                          ? 'bg-orange-100 text-orange-700 border border-orange-300 animate-pulse'
                          : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Navigation size={14} /> {sharingTaskId === task.id ? 'Sharing 📡' : 'Share Location'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Open requests */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🔔 Open delivery requests
              {openClaims.length > 0 && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{openClaims.length} open</span>}
            </h2>
            {loading ? (
              <div className="bg-white h-24 rounded-xl animate-pulse" />
            ) : openClaims.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">No open requests right now</div>
            ) : (
              openClaims.map(claim => (
                <div key={claim.id} className="bg-white rounded-xl border border-gray-100 p-5 mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{claim.food.title}</h3>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">New</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        <span className="text-green-600">{claim.food.donor.location}</span>
                        {' → '}
                        <span>{claim.receiver.location || claim.receiver.name}</span>
                      </p>
                      <p className="text-sm text-gray-500">For: {claim.receiver.name} · Claimed {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">Pickup ASAP</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${claim.food.foodType === 'VEG' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {claim.food.foodType === 'VEG' ? 'Vegetarian' : 'Non-Vegetarian'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleAccept(claim.id)}
                      disabled={accepting === claim.id}
                      className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-60"
                    >
                      {accepting === claim.id ? 'Accepting...' : 'Accept delivery'}
                    </button>
                    <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Skip</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — stats + leaderboard */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">MY STATS THIS MONTH</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Deliveries', value: completedTasks.length || 24 },
                { label: 'Items delivered', value: completedTasks.length * 10 || 156 },
                { label: 'Avg rating', value: '4.9 ⭐' },
                { label: 'Recipients', value: completedTasks.length || 62 },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Task summary</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Open requests', value: openClaims.length, color: 'text-orange-600' },
                  { label: 'My active', value: myTasks.length, color: 'text-blue-600' },
                  { label: 'Completed today', value: 0, color: 'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">TOP VOLUNTEERS</h3>
              <span className="text-xs text-green-600 font-medium">Community</span>
            </div>
            <div className="space-y-3">
              {TOP_VOLUNTEERS.map(v => (
                <div key={v.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                    {v.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                    <p className="text-xs text-yellow-500">{'⭐'.repeat(Math.floor(v.rating))} {v.rating}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{v.deliveries}</span>
                  <span>{v.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer of the week */}
          <div className="bg-green-600 rounded-xl p-5">
            <p className="text-xs text-green-100 font-semibold mb-2">🏆 VOLUNTEER OF THE WEEK</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">H</div>
              <div>
                <p className="text-white font-semibold">Harshika</p>
                <p className="text-green-100 text-xs">⭐⭐⭐⭐⭐</p>
              </div>
            </div>
            <p className="text-green-100 text-xs mb-3">Completed 9 deliveries to earn the badge</p>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full" style={{ width: '75%' }} />
            </div>
            <p className="text-green-100 text-xs mt-1">9 / 12 deliveries · 75%</p>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                <MapPin size={14} /> View map
              </button>
              <button className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                <Award size={14} /> My badges
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
