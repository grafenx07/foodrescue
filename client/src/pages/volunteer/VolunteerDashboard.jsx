import React, { useEffect, useState, useRef } from 'react';
import { Package, CheckCircle, RefreshCw, Award, Navigation, Trophy, History, KeyRound } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import StatusBadge from '../../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function VolunteerDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState({ openClaims: [], myTasks: [], completedTasks: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sharingTaskId, setSharingTaskId] = useState(null);
  const [tab, setTab] = useState('active'); // 'active' | 'open' | 'completed'
  // OTP state: { [taskId]: string }
  const [otpInputs, setOtpInputs] = useState({});
  // Which taskId is in OTP-entry mode
  const [awaitingOtp, setAwaitingOtp] = useState(null);
  const watchRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, boardRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/leaderboard'),
      ]);
      setData(tasksRes.data);
      setLeaderboard(boardRes.data);
    } catch (e) {
      console.error('[VolunteerDashboard]', e);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAccept = async (claimId) => {
    setAccepting(claimId);
    try {
      await api.post('/tasks/accept', { claimId });
      toast.success('Task accepted! Go pick it up. 🚴');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept task');
    } finally {
      setAccepting(null);
    }
  };

  const handleStatusUpdate = async (taskId, status) => {
    // For DELIVERED, require OTP
    if (status === 'DELIVERED') {
      setAwaitingOtp(taskId);
      return;
    }
    setUpdating(taskId);
    try {
      await api.post('/tasks/update-status', { taskId, status });
      toast.success('Marked as picked up! 📦 OTP sent to receiver.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmDelivery = async (taskId) => {
    const otp = (otpInputs[taskId] || '').trim();
    if (!otp || otp.length !== 6) { toast.error('Enter the 6-digit code from the receiver'); return; }
    setUpdating(taskId);
    try {
      await api.post('/tasks/update-status', { taskId, status: 'DELIVERED', otp });
      toast.success('🎉 Delivery complete!');
      setAwaitingOtp(null);
      setOtpInputs(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP — ask the receiver to check their screen');
    } finally {
      setUpdating(null);
    }
  };

  const toggleLiveTracking = (taskId) => {
    if (sharingTaskId === taskId) {
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

  const navigateForTask = (task) => {
    const dest = task.status === 'ASSIGNED'
      ? task.claim.food.donor.location   // go pick up
      : task.claim.receiver.location;    // go deliver
    if (!dest) { toast.error('No address available'); return; }
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(dest)}`, '_blank');
  };

  // Clean up on unmount
  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const { openClaims, myTasks, completedTasks } = data;

  const statsCards = [
    { label: 'Completed', value: completedTasks.length },
    { label: 'Active tasks', value: myTasks.length },
    { label: 'Open requests', value: openClaims.length },
  ];

  const topVolunteer = leaderboard[0] || null;
  const votWProgress = topVolunteer ? Math.min(100, Math.round((topVolunteer.deliveries / 20) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — tasks */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tab navigation */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'active', label: `My Active (${myTasks.length})` },
              { id: 'open', label: `Open Requests (${openClaims.length})` },
              { id: 'completed', label: `Completed (${completedTasks.length})` },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                  tab === t.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Active Deliveries ── */}
          {tab === 'active' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                📦 My active deliveries
                {myTasks.length > 0 && <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{myTasks.length}</span>}
              </h2>
              {loading ? (
                <div className="bg-white h-24 rounded-xl animate-pulse" />
              ) : myTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                  <Package size={32} className="mx-auto mb-3 text-gray-200" />
                  No active deliveries — check open requests to accept one!
                </div>
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
                        {task.claim.receiver.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">📞 {task.claim.receiver.phone}</p>
                        )}
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
                      {task.status === 'PICKED_UP' && awaitingOtp !== task.id && (
                        <button
                          onClick={() => handleStatusUpdate(task.id, 'DELIVERED')}
                          disabled={updating === task.id}
                          className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-60"
                        >
                          ✅ Mark Delivered
                        </button>
                      )}
                      {task.status === 'PICKED_UP' && awaitingOtp === task.id && (
                        <div className="flex-1 flex gap-2">
                          <div className="relative flex-1">
                            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="6-digit code from receiver"
                              value={otpInputs[task.id] || ''}
                              onChange={e => setOtpInputs(prev => ({ ...prev, [task.id]: e.target.value.replace(/\D/g, '') }))}
                              className="w-full pl-8 pr-3 py-2.5 border border-green-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <button
                            onClick={() => handleConfirmDelivery(task.id)}
                            disabled={updating === task.id}
                            className="bg-green-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors text-sm disabled:opacity-60 whitespace-nowrap"
                          >
                            {updating === task.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setAwaitingOtp(null)}
                            className="px-3 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => navigateForTask(task)}
                        className="px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        title={task.status === 'ASSIGNED' ? 'Navigate to pickup' : 'Navigate to receiver'}
                      >
                        <Navigation size={14} /> {task.status === 'ASSIGNED' ? 'To Pickup' : 'To Receiver'}
                      </button>
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
          )}

          {/* ── Open Requests ── */}
          {tab === 'open' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🔔 Open delivery requests
                {openClaims.length > 0 && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{openClaims.length} open</span>}
              </h2>
              {loading ? (
                <div className="bg-white h-24 rounded-xl animate-pulse" />
              ) : openClaims.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                  No open requests right now — check back soon!
                </div>
              ) : (
                openClaims.map(claim => (
                  <div key={claim.id} className="bg-white rounded-xl border border-gray-100 p-5 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
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
                        {claim.receiver.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">📞 {claim.receiver.phone}</p>
                        )}
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
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Completed Deliveries ── */}
          {tab === 'completed' && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" /> Completed deliveries
              </h2>
              {loading ? (
                <div className="bg-white h-24 rounded-xl animate-pulse" />
              ) : completedTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                  <History size={32} className="mx-auto mb-3 text-gray-200" />
                  No completed deliveries yet — accept a task to get started!
                </div>
              ) : (
                completedTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-3 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{task.claim.food.title}</h3>
                      <p className="text-xs text-gray-500">
                        {task.claim.food.donor.location} → {task.claim.receiver.location || task.claim.receiver.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Delivered {formatDistanceToNow(new Date(task.createdAt))} ago
                      </p>
                    </div>
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-lg flex-shrink-0">✅ Done</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right — stats + leaderboard */}
        <div className="space-y-4">
          {/* Real stats */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">MY STATS</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {statsCards.map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live leaderboard */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Trophy size={14} className="text-yellow-500" /> TOP VOLUNTEERS</h3>
              <span className="text-xs text-green-600 font-medium">Community</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No deliveries yet — be the first!</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((v, idx) => (
                  <div key={v.volunteerId} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {RANK_BADGES[idx] || v.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.deliveries} deliveries</p>
                    </div>
                    <span className="text-sm font-bold text-gray-700">#{v.rank}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Volunteer of the week */}
          {topVolunteer && (
            <div className="bg-green-600 rounded-xl p-5">
              <p className="text-xs text-green-100 font-semibold mb-2">🏆 TOP VOLUNTEER</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                  {topVolunteer.name[0]}
                </div>
                <div>
                  <p className="text-white font-semibold">{topVolunteer.name}</p>
                  <p className="text-green-100 text-xs">{topVolunteer.deliveries} deliveries total</p>
                </div>
              </div>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all" style={{ width: `${votWProgress}%` }} />
              </div>
              <p className="text-green-100 text-xs mt-1">{topVolunteer.deliveries} / 20 milestone · {votWProgress}%</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick actions</h3>
            <div className="space-y-2">
              <button
                onClick={fetchData}
                className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
              >
                <RefreshCw size={14} /> Refresh tasks
              </button>
              <button
                onClick={() => setTab('completed')}
                className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
              >
                <Award size={14} /> My deliveries ({completedTasks.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
