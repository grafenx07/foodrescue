import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom coloured icons
const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:20px;height:20px;border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });

export const greenIcon   = makeIcon('#16a34a');
export const orangeIcon  = makeIcon('#f97316');
export const blueIcon    = makeIcon('#3b82f6');
export const redIcon     = makeIcon('#ef4444');

// Fly to a position when it changes
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? 13, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

/**
 * General-purpose map wrapper.
 *
 * Props:
 *  center        – [lat, lng]  (required)
 *  zoom          – number (default 13)
 *  height        – CSS string (default '100%')
 *  flyTo         – [lat, lng] | null  – animates camera
 *  children      – extra Marker / Polyline / etc.
 */
export default function MapView({ center, zoom = 13, height = '100%', flyTo, children }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height, borderRadius: 'inherit' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {flyTo && <FlyTo center={flyTo} zoom={zoom} />}
      {children}
    </MapContainer>
  );
}

export { MapView, FlyTo };
