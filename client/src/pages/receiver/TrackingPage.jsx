import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';

const TIMELINE_STEPS = [
  { status: 'CLAIMED', label: 'Claimed', desc: 'You claimed this food' },
  { status: 'ASSIGNED', label: 'Volunteer Assigned', desc: 'A volunteer accepted the task' },
  { status: 'PICKED_UP', label: 'Picked Up', desc: 'Food collected from donor' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Food delivered to you' },
];

const STATUS_ORDER = { CLAIMED: 0, ASSIGNED: 1, PICKED_UP: 2, DELIVERED: 3 };

export default function TrackingPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/claim/${claimId}`)
      .then(r => setClaim(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [claimId]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8"><div className="bg-white rounded-2xl h-64 animate-pulse" /></div>;
  if (!claim) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Claim not found</div>;

  const currentIdx = STATUS_ORDER[claim.status] ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/receiver" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Tracking Your Order</h1>
        <p className="text-sm text-gray-500 mb-6">Food: <strong>{claim.food?.title}</strong> from {claim.food?.donor?.name}</p>

        {/* Timeline */}
        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, i) => {
            const isCompleted = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={step.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-100'
                  }`}>
                    {isCompleted
                      ? <CheckCircle size={16} className="text-white" />
                      : <Circle size={16} className="text-gray-300" />
                    }
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`w-0.5 h-12 ${isCompleted ? 'bg-green-600' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-12 pt-1">
                  <p className={`text-sm font-semibold ${isCurrent ? 'text-green-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label} {isCurrent && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Current</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Volunteer info */}
        {claim.volunteerTask && (
          <div className="mt-4 bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-900 mb-0.5">🚴 {claim.volunteerTask.volunteer?.name}</p>
            <p className="text-xs text-blue-700">Your volunteer is {claim.status === 'PICKED_UP' ? 'on the way to you' : 'heading to pickup'}</p>
            {claim.volunteerTask.volunteer?.phone && (
              <p className="text-xs text-blue-600 mt-1">📞 {claim.volunteerTask.volunteer.phone}</p>
            )}
          </div>
        )}
      </div>

      {/* Food info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Food Details</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>From:</strong> {claim.food?.donor?.name} — {claim.food?.donor?.location}</p>
          <p><strong>Quantity:</strong> {claim.food?.quantity} servings</p>
          <p><strong>Pickup type:</strong> {claim.pickupType === 'SELF' ? '🚶 Self pickup' : '🚴 Volunteer delivery'}</p>
          <p><strong>Claimed:</strong> {formatDistanceToNow(new Date(claim.createdAt))} ago</p>
        </div>
      </div>
    </div>
  );
}
