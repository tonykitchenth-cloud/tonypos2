import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  X,
  Navigation,
  Check,
  ZoomIn,
  ZoomOut,
  MapPin,
  Loader2,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  acquireAccurateGpsFix,
  formatGeolocationError,
  GpsFixResult,
  toLatLng,
} from '../../utils/geolocation';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  /** Optional pre-resolved Current GPS seed from parent component */
  initialGpsSeed?: { lat: number; lng: number; accuracy?: number } | null;
  /** Optional synchronously triggered GPS promise from parent click handler (preserves iOS user gesture) */
  pendingGpsPromise?: Promise<GpsFixResult> | null;
  onConfirmLocation?: (location: { latitude: number; longitude: number; mapsUrl: string }) => void;
  language?: 'th' | 'en';
  isViewOnly?: boolean;
  title?: string;
  addressText?: string;
}

// Default fallback location: Bangkok central coordinate (used ONLY while acquiring real GPS if no pin exists)
const DEFAULT_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
};

function isDefaultFallbackCenter(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - DEFAULT_CENTER.lat) < 0.00001 &&
    Math.abs(lng - DEFAULT_CENTER.lng) < 0.00001
  );
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialGpsSeed = null,
  pendingGpsPromise = null,
  onConfirmLocation,
  language = 'th',
  isViewOnly = false,
  title,
  addressText,
}) => {
  const isThai = language === 'th';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gpsDotLayerRef = useRef<L.CircleMarker | null>(null);
  const userInteractedRef = useRef<boolean>(false);

  // Keep latest props in refs so opening effect doesn't re-create the Leaflet map on parent state ticks
  const initialCoordsRef = useRef({ initialLat, initialLng, initialGpsSeed, pendingGpsPromise });
  initialCoordsRef.current = { initialLat, initialLng, initialGpsSeed, pendingGpsPromise };

  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>(() => {
    const valid = toLatLng(initialLat, initialLng);
    if (valid && !(!isViewOnly && isDefaultFallbackCenter(valid.lat, valid.lng))) {
      return valid;
    }
    if (initialGpsSeed) {
      return { lat: initialGpsSeed.lat, lng: initialGpsSeed.lng };
    }
    return DEFAULT_CENTER;
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [hasRealLocation, setHasRealLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);

  // Helper to update/draw the blue "Your Current GPS" indicator dot on the Leaflet map
  const updateLiveGpsDot = (map: L.Map | null, lat: number, lng: number) => {
    if (!map) return;
    if (gpsDotLayerRef.current) {
      gpsDotLayerRef.current.setLatLng([lat, lng]);
    } else {
      gpsDotLayerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2.5,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map);
    }
  };

  // Initialize or re-center map ONLY when modal opens/closes or view mode changes
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    userInteractedRef.current = false;

    const {
      initialLat: openLat,
      initialLng: openLng,
      initialGpsSeed: seed,
      pendingGpsPromise: parentPromise,
    } = initialCoordsRef.current;

    const parsedInitial = toLatLng(openLat, openLng);
    const validInitial =
      parsedInitial && (isViewOnly || !isDefaultFallbackCenter(parsedInitial.lat, parsedInitial.lng))
        ? parsedInitial
        : null;

    const validSeed = seed ? toLatLng(seed.lat, seed.lng) : null;
    const effectiveStart = validInitial || validSeed;

    let resolvedLatLng: { lat: number; lng: number } | null = effectiveStart;
    const startLat = effectiveStart ? effectiveStart.lat : DEFAULT_CENTER.lat;
    const startLng = effectiveStart ? effectiveStart.lng : DEFAULT_CENTER.lng;

    setCurrentCenter({ lat: startLat, lng: startLng });
    setHasRealLocation(Boolean(effectiveStart));
    setLocationError(null);
    setGpsAccuracyMeters(seed?.accuracy ?? null);

    // Start acquiring Current GPS IMMEDIATELY (without waiting for 150ms DOM timer) when no pin exists yet
    const needsAutoLocate = !validInitial && !isViewOnly;
    if (needsAutoLocate) {
      setIsLocating(true);

      const applyGpsFix = (fix: GpsFixResult, isFinal: boolean) => {
        if (cancelled) return;
        resolvedLatLng = { lat: fix.lat, lng: fix.lng };
        setGpsAccuracyMeters(fix.accuracy);
        setHasRealLocation(true);
        setLocationError(null);

        if (mapInstanceRef.current) {
          updateLiveGpsDot(mapInstanceRef.current, fix.lat, fix.lng);
          if (!userInteractedRef.current) {
            const targetZoom = fix.accuracy <= 150 ? 18 : 16;
            mapInstanceRef.current.setView([fix.lat, fix.lng], targetZoom, { animate: true });
            setCurrentCenter({ lat: fix.lat, lng: fix.lng });
          }
        } else {
          setCurrentCenter({ lat: fix.lat, lng: fix.lng });
        }

        if (isFinal) {
          setIsLocating(false);
          if (fix.accuracy > 300) {
            setLocationError(
              isThai
                ? `จับตำแหน่งคร่าวๆ (±${fix.accuracy} ม.) กรุณาเลื่อนหมุดให้ตรงหน้าบ้าน/อาคารของคุณ`
                : `Approximate location (±${fix.accuracy}m). Drag map to place pin at exact entrance.`
            );
          }
        }
      };

      const gpsTask =
        parentPromise ||
        acquireAccurateGpsFix({
          timeoutMs: 11000,
          refineWindowMs: 2800,
          targetAccuracyMeters: 25,
          allowCoarseFallback: true,
          onProgress: (fix) => applyGpsFix(fix, false),
        });

      gpsTask
        .then((best) => {
          applyGpsFix(best, true);
        })
        .catch((err) => {
          if (cancelled) return;
          setIsLocating(false);
          if (!resolvedLatLng) {
            setLocationError(formatGeolocationError(err, isThai));
          }
        });
    } else {
      setIsLocating(false);
    }

    // Small delay to ensure modal DOM is mounted and sized
    const timer = setTimeout(() => {
      if (cancelled || !mapContainerRef.current) return;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      gpsDotLayerRef.current = null;

      const mountCenter = resolvedLatLng || { lat: startLat, lng: startLng };
      const hasMountCoord = Boolean(resolvedLatLng);

      const map = L.map(mapContainerRef.current, {
        center: [mountCenter.lat, mountCenter.lng],
        zoom: hasMountCoord ? 18 : 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (validSeed) {
        updateLiveGpsDot(map, validSeed.lat, validSeed.lng);
      } else if (resolvedLatLng && !validInitial) {
        updateLiveGpsDot(map, resolvedLatLng.lat, resolvedLatLng.lng);
      }

      map.on('dragstart', () => {
        userInteractedRef.current = true;
        setHasRealLocation(true);
      });

      // Listen to map move events to update center pin
      map.on('movestart', () => {
        setIsMapMoving(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCurrentCenter({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCenter({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
        setIsMapMoving(false);
      });

      // Allow clicking on map to re-center smoothly (only if interactive, not view-only)
      if (!isViewOnly) {
        map.on('click', (e) => {
          userInteractedRef.current = true;
          setHasRealLocation(true);
          map.panTo(e.latlng, { animate: true });
        });
      }

      mapInstanceRef.current = map;
      setCurrentCenter({ lat: mountCenter.lat, lng: mountCenter.lng });

      // Force recalculation of container size
      map.invalidateSize();
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      gpsDotLayerRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, isViewOnly, isThai]);

  // React immediately to intermediate GPS seed progress updates from parent while modal is locating
  useEffect(() => {
    if (!isOpen || isViewOnly || !initialGpsSeed) return;
    const valid = toLatLng(initialGpsSeed.lat, initialGpsSeed.lng);
    if (!valid) return;

    setGpsAccuracyMeters(initialGpsSeed.accuracy ?? null);
    setHasRealLocation(true);
    setLocationError(null);

    if (mapInstanceRef.current) {
      updateLiveGpsDot(mapInstanceRef.current, valid.lat, valid.lng);
      if (!userInteractedRef.current && isLocating) {
        const targetZoom = (initialGpsSeed.accuracy ?? 999) <= 150 ? 18 : 16;
        mapInstanceRef.current.setView([valid.lat, valid.lng], targetZoom, { animate: true });
        setCurrentCenter({ lat: valid.lat, lng: valid.lng });
      }
    } else if (!userInteractedRef.current) {
      setCurrentCenter({ lat: valid.lat, lng: valid.lng });
    }
  }, [isOpen, isViewOnly, initialGpsSeed, isLocating]);

  // Handle Current Location GPS Click (with iOS watchPosition accuracy refinement + coarse fallback)
  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(isThai ? 'อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS' : 'Geolocation is not supported');
      return;
    }

    userInteractedRef.current = false;
    setIsLocating(true);
    setLocationError(null);

    acquireAccurateGpsFix({
      timeoutMs: 12000,
      refineWindowMs: 3200,
      targetAccuracyMeters: 20,
      allowCoarseFallback: true,
      onProgress: (fix) => {
        setGpsAccuracyMeters(fix.accuracy);
        setHasRealLocation(true);
        if (mapInstanceRef.current) {
          updateLiveGpsDot(mapInstanceRef.current, fix.lat, fix.lng);
          if (!userInteractedRef.current) {
            mapInstanceRef.current.setView([fix.lat, fix.lng], fix.accuracy <= 150 ? 18 : 16, { animate: true });
            setCurrentCenter({ lat: fix.lat, lng: fix.lng });
          }
        }
      },
    })
      .then((best) => {
        setIsLocating(false);
        setGpsAccuracyMeters(best.accuracy);
        setHasRealLocation(true);
        if (mapInstanceRef.current) {
          updateLiveGpsDot(mapInstanceRef.current, best.lat, best.lng);
          mapInstanceRef.current.setView([best.lat, best.lng], best.accuracy <= 150 ? 18 : 16, { animate: true });
        }
        setCurrentCenter({ lat: best.lat, lng: best.lng });
        if (best.accuracy > 250) {
          setLocationError(
            isThai
              ? `สัญญาณ GPS มีความคลาดเคลื่อนประมาณ ±${best.accuracy} ม. กรุณาเปิด "ตำแหน่งที่ตั้งจริง" หรือเลื่อนหมุดให้ตรงหน้าบ้าน`
              : `GPS accuracy is approx. ±${best.accuracy}m. Enable Precise Location or drag map to adjust.`
          );
        }
      })
      .catch((err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationError(formatGeolocationError(err, isThai));
      });
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleConfirm = () => {
    const lat = currentCenter.lat;
    const lng = currentCenter.lng;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (onConfirmLocation) {
      onConfirmLocation({
        latitude: lat,
        longitude: lng,
        mapsUrl,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const lat = isViewOnly ? (toLatLng(initialLat, initialLng)?.lat ?? currentCenter.lat) : currentCenter.lat;
  const lng = isViewOnly ? (toLatLng(initialLat, initialLng)?.lng ?? currentCenter.lng) : currentCenter.lng;
  const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const googlePinUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const isWaitingFirstFix = !isViewOnly && isLocating && !hasRealLocation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative border border-gray-100 max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#E65100] flex items-center justify-center">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A]">
                {title || (isViewOnly
                  ? (isThai ? 'หมุดตำแหน่งจัดส่งของลูกค้า (GPS Pin)' : 'Customer Delivery GPS Pin')
                  : (isThai ? 'ปักหมุดตำแหน่งจัดส่ง (GPS)' : 'Pin Delivery Location'))}
              </h3>
              <p className="text-[11px] text-gray-500">
                {addressText || (isViewOnly
                  ? (isThai ? 'พิกัดตรงจุดที่ลูกค้าปักหมุดไว้สำหรับส่งอาหาร' : 'Exact location pinned by customer')
                  : (isThai ? 'เลื่อนแผนที่หรือลากเพื่อวางหมุดตรงหน้าบ้าน/อาคาร' : 'Drag map to align pin at your location'))}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container Area */}
        <div className="relative w-full h-[55vh] min-h-[320px] max-h-[460px] bg-gray-100 overflow-hidden select-none">
          {/* Leaflet DOM container */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Center Pin Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
            style={{ marginTop: '-24px' }}
          >
            <div className="relative flex flex-col items-center">
              {/* Pin Tag for Rider view */}
              {isViewOnly && (
                <div className="mb-1 px-2.5 py-0.5 rounded-full bg-neutral-900/90 text-white text-[10px] font-bold shadow-lg border border-orange-500/40 whitespace-nowrap animate-bounce">
                  📍 {isThai ? 'จุดส่งอาหารของลูกค้า' : 'Delivery Destination'}
                </div>
              )}

              {/* Pin Icon */}
              <div
                className={`transition-transform duration-200 ${
                  isMapMoving && !isViewOnly ? '-translate-y-2 scale-110' : 'translate-y-0 scale-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#E65100] text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-orange-500/20">
                  <MapPin className="w-5 h-5 fill-white stroke-[2.5]" />
                </div>
                {/* Pointer beak below circle */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#E65100] mx-auto -mt-0.5" />
              </div>

              {/* Ground Shadow Dot */}
              <div
                className={`w-3 h-1.5 bg-black/40 rounded-full blur-[1px] transition-all duration-200 mt-0.5 ${
                  isMapMoving && !isViewOnly ? 'scale-75 opacity-40' : 'scale-100 opacity-80'
                }`}
              />
            </div>
          </div>

          {/* Floating Instructions / Locating Status Toast over Map */}
          <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200/80 text-[11px] font-bold text-gray-700 flex items-center gap-1.5 w-fit mx-auto">
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 text-[#E65100] animate-spin shrink-0" />
              ) : (
                <Info className="w-3.5 h-3.5 text-[#E65100] shrink-0" />
              )}
              <span>
                {isViewOnly
                  ? (isThai ? 'ตำแหน่งหมุด GPS แม่นยำตรงจุดจากลูกค้า' : 'Customer exact pinned GPS destination')
                  : isWaitingFirstFix
                  ? (isThai ? 'กำลังค้นหาตำแหน่ง GPS ปัจจุบันของคุณ...' : 'Finding your current GPS location...')
                  : isLocating
                  ? (isThai ? 'กำลังปรับตำแหน่ง GPS ให้แม่นยำขึ้น...' : 'Refining your GPS accuracy...')
                  : isMapMoving
                  ? (isThai ? 'กำลังเลื่อนหาตำแหน่ง...' : 'Moving pin location...')
                  : (isThai ? 'เลื่อนแผนที่ให้จุดตรงกลางตรงกับที่อยู่ของคุณ' : 'Move map to place pin at exact door/building')}
              </span>
            </div>
          </div>

          {/* Initial Locating Overlay (prevents disorientation before first real GPS fix lands) */}
          {isWaitingFirstFix && (
            <div className="absolute inset-0 z-15 bg-black/20 backdrop-blur-[1px] pointer-events-none flex items-end justify-center pb-16">
              <div className="bg-neutral-900/90 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 border border-white/15">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span>{isThai ? 'กำลังดึงพิกัดปัจจุบัน (Current GPS)...' : 'Acquiring Current GPS...'}</span>
              </div>
            </div>
          )}

          {/* Map Controls: Prominent Current GPS Button + Zoom */}
          <div className="absolute right-3 bottom-3 z-20 flex flex-col items-end gap-2">
            {!isViewOnly && (
              <button
                id="btn-map-locate-me"
                type="button"
                disabled={isLocating}
                onClick={handleLocateMe}
                className="h-11 px-3 rounded-2xl bg-white hover:bg-orange-50 active:scale-95 text-[#E65100] shadow-lg border border-orange-200 flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all cursor-pointer"
                title={isThai ? 'ตำแหน่งปัจจุบันของฉัน (Current GPS)' : 'Use Current GPS Location'}
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#E65100]" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>{isThai ? 'ตำแหน่งปัจจุบัน' : 'Current GPS'}</span>
              </button>
            )}

            {/* Zoom In/Out Buttons */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-11 h-10 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center border-b border-gray-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-11 h-10 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error notification if geolocation denied / timed out with Retry button */}
        {locationError && (
          <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <span className="leading-snug">{locationError}</span>
            {!isViewOnly && (
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isThai ? 'ลองใหม่' : 'Retry'}</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Area with Coordinates & Action Buttons */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-bold flex items-center gap-1.5">
              <span>{isThai ? 'พิกัด GPS:' : 'GPS Coordinates:'}</span>
              {gpsAccuracyMeters !== null && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${gpsAccuracyMeters <= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  ±{gpsAccuracyMeters} {isThai ? 'ม.' : 'm'}
                </span>
              )}
            </span>
            <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg text-[11px]">
              {isWaitingFirstFix ? (isThai ? 'กำลังค้นหา...' : 'Locating...') : `${lat.toFixed(6)}, ${lng.toFixed(6)}`}
            </span>
          </div>

          {isViewOnly ? (
            /* Rider / Viewer Action Buttons */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={googleNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>{isThai ? '🚀 นำทางทันที (Google Maps)' : 'Start GPS Navigation'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <a
                href={googlePinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>{isThai ? '📍 เปิดดูหมุดใน Google Maps' : 'View Pin on Google Maps'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          ) : (
            /* Customer Edit/Confirm Action Buttons */
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors"
              >
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-confirm-pin-location"
                disabled={isWaitingFirstFix}
                onClick={handleConfirm}
                className={`flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all ${
                  isWaitingFirstFix
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                    : 'bg-[#E65100] hover:bg-[#D84315] active:scale-[0.99] text-white shadow-orange-500/25 cursor-pointer'
                }`}
              >
                {isWaitingFirstFix ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isThai ? 'กำลังค้นหาตำแหน่งปัจจุบัน...' : 'Finding Current GPS...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isThai ? 'ยืนยันตำแหน่งหมุดนี้' : 'Confirm This Location'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
