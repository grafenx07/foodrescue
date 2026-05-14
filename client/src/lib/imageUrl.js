/**
 * Resolves a food listing imageUrl to a full URL.
 *
 * The server saves images as relative paths like `/uploads/filename.jpg`.
 * In development the frontend is on :5174 and the backend is on :4000,
 * so we must prefix relative paths with the backend base URL.
 * In production (Vercel + Render) VITE_API_URL points to the Render URL
 * e.g. https://foodrescue-api.onrender.com/api — we strip "/api" to get the root.
 */
export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  // Already an absolute URL (http/https) — return as-is
  if (imageUrl.startsWith('http')) return imageUrl;
  // Relative path (e.g. /uploads/...) — prefix with backend origin
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${backendOrigin}${imageUrl}`;
}
