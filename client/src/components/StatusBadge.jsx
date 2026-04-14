import React from 'react';

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Available', classes: 'bg-green-100 text-green-700' },
  CLAIMED: { label: 'Claimed', classes: 'bg-orange-100 text-orange-700' },
  ASSIGNED: { label: 'Volunteer Assigned', classes: 'bg-blue-100 text-blue-700' },
  PICKED_UP: { label: 'In Transit', classes: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Delivered', classes: 'bg-gray-100 text-gray-600' },
  EXPIRED: { label: 'Expired', classes: 'bg-red-100 text-red-600' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500' },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || { label: status, classes: 'bg-gray-100 text-gray-600' };
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`font-semibold rounded-full whitespace-nowrap ${sizeClasses} ${config.classes}`}>
      {config.label}
    </span>
  );
}
