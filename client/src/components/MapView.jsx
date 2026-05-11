import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix default Leaflet icons in Vite/Webpack ──────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Inject CSS animations (idempotent) ────────────────────
const ANIM_STYLE_ID = 'fr-map-animations';
if (!document.getElementById(ANIM_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    @keyframes fr-bike-bounce {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-5px); }
    }
    @keyframes fr-pulse-ring {
      0%   { transform: scale(0.8); opacity: 0.9; }
      100% { transform: scale(1.9); opacity: 0; }
    }
    @keyframes fr-pulse-ring2 {
      0%   { transform: scale(0.8); opacity: 0.7; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes fr-car-sway {
      0%, 100% { transform: rotate(-3deg); }
      50%       { transform: rotate(3deg); }
    }
    @keyframes fr-home-glow {
      0%, 100% { box-shadow: 0 2px 10px rgba(37,99,235,0.45); }
      50%       { box-shadow: 0 2px 22px rgba(37,99,235,0.85); }
    }
    @keyframes fr-arrow-slide {
      0%   { opacity: 0.4; transform: translateX(-3px); }
      100% { opacity: 1;   transform: translateX(3px); }
    }
    @keyframes fr-dash-move {
      to { stroke-dashoffset: -30; }
    }
    .fr-bike  { animation: fr-bike-bounce 1s ease-in-out infinite; }
    .fr-car   { animation: fr-car-sway 1.2s ease-in-out infinite; }
    .fr-arrow { animation: fr-arrow-slide 0.7s ease-in-out infinite alternate; }
  `;
  document.head.appendChild(style);
}

// ── Simple dot icons (used on HomePage) ───────────────────
const makeSimpleIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${color};width:18px;height:18px;border-radius:50%;
      border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -11],
  });

export const greenIcon  = makeSimpleIcon('#16a34a');
export const orangeIcon = makeSimpleIcon('#f97316');
export const blueIcon   = makeSimpleIcon('#3b82f6');
export const redIcon    = makeSimpleIcon('#ef4444');

// ── Role-based animated tracking icons ────────────────────

const pinHtml = ({ bg, emoji, ringColor, anim, size = 36 }) => `
  <div style="position:relative;width:${size + 12}px;height:${size + 16}px;">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${ringColor};animation:fr-pulse-ring 1.5s ease-out infinite;"></div>
    </div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      <div style="width:${size}px;height:${size}px;border-radius:50%;border:1.5px solid ${ringColor};animation:fr-pulse-ring 1.5s ease-out 0.55s infinite;"></div>
    </div>
    <div class="${anim}" style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:${bg};width:${size - 4}px;height:${size - 4}px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px ${ringColor}66;display:flex;align-items:center;justify-content:center;font-size:${Math.round((size - 4) * 0.48)}px;">
      ${emoji}
    </div>
    <div class="fr-arrow" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:11px;color:${ringColor};font-weight:900;line-height:1;">▶</div>
  </div>
`;

export const volunteerBikeIcon = L.divIcon({
  className: '',
  html: pinHtml({ bg: 'linear-gradient(135deg,#f97316,#ea580c)', emoji: '🚴', ringColor: '#f97316', anim: 'fr-bike' }),
  iconSize: [48, 52], iconAnchor: [24, 50], popupAnchor: [0, -52],
});

export const donorCarIcon = L.divIcon({
  className: '',
  html: pinHtml({ bg: 'linear-gradient(135deg,#9333ea,#7e22ce)', emoji: '🚗', ringColor: '#9333ea', anim: 'fr-car' }),
  iconSize: [48, 52], iconAnchor: [24, 50], popupAnchor: [0, -52],
});

export const receiverHomeIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:42px;height:48px;">
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:38px;height:38px;border-radius:50%;border:2px solid #2563eb;animation:fr-pulse-ring2 2.2s ease-out infinite;"></div>
      </div>
      <div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#2563eb,#1d4ed8);width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px #2563eb66;display:flex;align-items:center;justify-content:center;font-size:17px;animation:fr-home-glow 2s ease-in-out infinite;">
        🏠
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:8px;height:8px;border-radius:50%;background:#2563eb;box-shadow:0 0 8px #2563eb;"></div>
    </div>
  `,
  iconSize: [42, 48], iconAnchor: [21, 48], popupAnchor: [0, -50],
});

export const donorStaticIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:34px;height:44px;">
      <div style="position:absolute;top:0;left:50%;width:30px;height:30px;border-radius:50% 50% 50% 0%;transform:translateX(-50%) rotate(-45deg);background:linear-gradient(135deg,#16a34a,#15803d);border:3px solid white;box-shadow:0 3px 10px #16a34a55;"></div>
      <div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;">📦</div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #15803d;"></div>
    </div>
  `,
  iconSize: [34, 44], iconAnchor: [17, 44], popupAnchor: [0, -46],
});

export const walkerIcon = L.divIcon({
  className: '',
  html: pinHtml({ bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', emoji: '🚶', ringColor: '#3b82f6', anim: 'fr-bike', size: 32 }),
  iconSize: [44, 48], iconAnchor: [22, 46], popupAnchor: [0, -48],
});

/** 🟦 Current user location — Google Maps-style pulsing blue dot */
export const userLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <!-- outer radar ring -->
      <div style="position:absolute;inset:-10px;border-radius:50%;background:rgba(37,99,235,0.15);animation:fr-pulse-ring2 2s ease-out infinite;"></div>
      <!-- white halo -->
      <div style="position:absolute;inset:-3px;border-radius:50%;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>
      <!-- blue core dot -->
      <div style="position:absolute;inset:3px;border-radius:50%;background:#2563eb;"></div>
      <!-- inner shine -->
      <div style="position:absolute;top:5px;left:6px;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.5);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

/**
 * Fetches a road-following route from the OSRM public demo server.
 *
 * @param {Array<[lat,lng]>} waypoints  — ordered list (min 2).  Pass null/empty to skip.
 * @returns {{ route: Array<[lat,lng]>, distance: number|null, duration: number|null, loading: boolean }}
 */
export function useOsrmRoute(waypoints) {
  const [state, setState] = useState({ route: [], distance: null, duration: null, loading: false });
  const abortRef = useRef(null);

  useEffect(() => {
    const valid = Array.isArray(waypoints) && waypoints.length >= 2 && waypoints.every(Boolean);
    if (!valid) { setState({ route: [], distance: null, duration: null, loading: false }); return; }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(s => ({ ...s, loading: true }));

    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.code !== 'Ok' || !data.routes?.length) {
          // Fall back to straight-line waypoints
          setState({ route: waypoints, distance: null, duration: null, loading: false });
          return;
        }
        const leg = data.routes[0];
        const coords = leg.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setState({ route: coords, distance: leg.distance, duration: leg.duration, loading: false });
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setState({ route: waypoints, distance: null, duration: null, loading: false });
        }
      });

    return () => controller.abort();
  }, [JSON.stringify(waypoints)]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

// ── Format duration from OSRM (seconds → "X min" / "Xh Ym") ──
export function formatDuration(seconds) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Format distance from OSRM (meters → "X.X km" / "XXX m") ──
export function formatDistance(meters) {
  if (!meters) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

// ── Animated directional polyline ─────────────────────────
/**
 * Renders a Leaflet Polyline with a moving dash animation (simulates direction of travel).
 * Uses a custom SVG-based approach by injecting a <style> into the Leaflet path element.
 */
export function AnimatedPolyline({ positions, color, weight = 4 }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!positions?.length || !map) return;

    if (layerRef.current) { layerRef.current.remove(); }

    const id = `fr-route-${Math.random().toString(36).slice(2)}`;

    const line = L.polyline(positions, {
      color,
      weight,
      opacity: 0.85,
      className: id,
      // SVG trick: will be animated via injected CSS
    }).addTo(map);

    // Arrow decoration every ~2% of the path
    const arrows = L.polyline(positions, {
      color,
      weight: weight + 2,
      opacity: 0,
      className: `${id}-arrows`,
    }).addTo(map);

    // Inject dash animation CSS for this specific path
    const animStyle = document.createElement('style');
    animStyle.id = `style-${id}`;
    animStyle.textContent = `
      .${id} { stroke-dasharray: 12 8; animation: fr-dash-move 0.6s linear infinite; }
      .${id}-arrows { display: none; }
    `;
    document.head.appendChild(animStyle);

    layerRef.current = L.layerGroup([line, arrows]);

    return () => {
      line.remove();
      arrows.remove();
      const el = document.getElementById(`style-${id}`);
      if (el) el.remove();
    };
  }, [positions, color, weight, map]);

  return null;
}

// ── Fly to center ──────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? 14, { duration: 1.2 });
  }, [center?.[0], center?.[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── MapView (main export) ──────────────────────────────────
/**
 * Props:
 *  center  – [lat, lng]
 *  zoom    – number (default 14)
 *  height  – CSS string (default '100%')
 *  flyTo   – [lat, lng] | null
 *  children – Marker / Polyline / AnimatedPolyline / etc.
 */
export default function MapView({ center, zoom = 14, height = '100%', flyTo, children }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height, borderRadius: 'inherit' }}
      scrollWheelZoom
      zoomControl={false}
    >
      {/* Modern Carto Voyager tiles — light, modern, matches green palette */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">Carto</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {flyTo && <FlyTo center={flyTo} zoom={zoom} />}
      {children}
    </MapContainer>
  );
}

export { MapView, FlyTo };
