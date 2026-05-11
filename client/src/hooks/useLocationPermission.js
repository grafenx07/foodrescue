import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * Requests geolocation access once when the user is authenticated.
 * Fires the browser's native permission dialog and shows a friendly
 * toast if access is denied or unavailable.
 *
 * @param {boolean} isAuthenticated - only prompt when the user is logged in
 */
export default function useLocationPermission(isAuthenticated) {
  const asked = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || asked.current) return;
    if (!navigator.geolocation) return; // unsupported browser

    asked.current = true;

    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted — nothing extra needed
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast('📍 Location access denied. Some tracking features may be limited.', {
            duration: 5000,
            style: { background: '#1f2937', color: '#fff' },
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isAuthenticated]);
}
