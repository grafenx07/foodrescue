import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Loader, X } from 'lucide-react';

/**
 * LocationInput — a text field with Nominatim-powered autocomplete suggestions.
 *
 * Props:
 *   value       – controlled string value
 *   onChange    – called with (locationName, lat, lng) when a suggestion is picked
 *                 or (locationName, null, null) when typing freely
 *   onDetect    – optional callback; if provided, shows a "Detect" GPS button
 *   placeholder – input placeholder text
 *   className   – extra classes for the wrapper div
 *   inputClass  – extra classes for the <input>
 *   required    – html required attribute
 *   name        – html name attribute
 */
export default function LocationInput({
  value = '',
  onChange,
  onDetect,
  placeholder = 'e.g. Koramangala, Bangalore',
  className = '',
  inputClass = '',
  required = false,
  name = 'location',
}) {
  const [query, setQuery]           = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [open, setOpen]             = useState(false);
  const debounceRef                 = useRef(null);
  const wrapperRef                  = useRef(null);

  // Keep local query in sync with parent value when it changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchNominatim = useCallback(async (text) => {
    if (!text || text.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoadingSugg(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSugg(false);
    }
  }, []);

  const handleInput = (e) => {
    const text = e.target.value;
    setQuery(text);
    onChange?.(text, null, null); // notify parent — coords unknown while typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(text), 420);
  };

  const pickSuggestion = (item) => {
    // Build a clean short name: first 3 comma-separated parts of display_name
    const parts = item.display_name.split(',').map(s => s.trim());
    const shortName = parts.slice(0, 3).join(', ');
    setQuery(shortName);
    setSuggestions([]);
    setOpen(false);
    onChange?.(shortName, parseFloat(item.lat), parseFloat(item.lon));
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) { return; }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const parts = data.display_name?.split(',') || [];
          const name = parts.slice(0, 3).join(', ').trim();
          setQuery(name);
          onChange?.(name, lat, lng);
          onDetect?.(name, lat, lng);
        } catch {
          const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(fallback);
          onChange?.(fallback, lat, lng);
          onDetect?.(fallback, lat, lng);
        } finally {
          setDetectingGps(false);
        }
      },
      () => setDetectingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onChange?.('', null, null);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* Input */}
        <div className="relative flex-1">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            name={name}
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className={`w-full pl-8 pr-8 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 ${inputClass}`}
          />
          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}
          {/* Loading spinner */}
          {loadingSugg && (
            <Loader size={13} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {/* GPS Detect button */}
        {onDetect !== undefined && (
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detectingGps}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {detectingGps ? <Loader size={14} className="animate-spin" /> : <MapPin size={14} />}
            {detectingGps ? 'Detecting…' : 'Detect'}
          </button>
        )}
      </div>

      {/* Suggestion dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((item) => {
            const parts = item.display_name.split(',').map(s => s.trim());
            const main  = parts.slice(0, 2).join(', ');
            const sub   = parts.slice(2, 4).join(', ');
            return (
              <li key={item.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(item); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors flex items-start gap-2.5"
                >
                  <MapPin size={13} className="mt-0.5 flex-shrink-0 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{main}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
