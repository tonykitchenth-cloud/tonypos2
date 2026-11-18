import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { RestaurantOrder } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  ArrowLeft,
  Navigation,
  MapPin,
  ZoomIn,
  ZoomOut,
  Loader2,
  Phone,
  ExternalLink,
  LocateFixed,
  Route,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
} from 'lucide-react';

interface RiderRouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: RestaurantOrder | null;
  language?: 'th' | 'en';
}

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface RouteStep {
  instruction: string;
  distanceMeters: number;
}

const DEFAULT_BANGKOK_CENTER: LatLngPoint = {
  lat: 13.7563,
  lng: 100.5018,
};

// Extract coordinates if embedded inside a Google Maps URL (e.g. ?query=13.75,100.50 or @13.75,100.50)
function extractCoordsFromMapsUrl(mapsUrl?: string): LatLngPoint | null {
  if (!mapsUrl) return null;
  const match = mapsUrl.match(/(?:@|query=|q=|destination=)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng };
  }
  return null;
}

// Haversine straight-line distance in meters (fallback when OSRM is unreachable)
function calculateHaversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDistance(meters: number, isThai: boolean): string {
  if (meters < 1000) {
    return `${Math.round(meters)} ${isThai ? 'ม.' : 'm'}`;
  }
  return `${(meters / 1000).toFixed(1)} ${isThai ? 'กม.' : 'km'}`;
}

function formatDuration(seconds: number, isThai: boolean): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} ${isThai ? 'นาที' : 'min'}`;
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return isThai
    ? `${hrs} ชม.${rem > 0 ? ` ${rem} นาที` : ''}`
    : `${hrs}h${rem > 0 ? ` ${rem}m` : ''}`;
}

function formatManeuverInstruction(
  step: { maneuver?: { type?: string; modifier?: string }; name?: string },
  isThai: boolean
): string {
  const type = step.maneuver?.type || '';
  const modifier = step.maneuver?.modifier || '';
  const road = step.name?.trim();

  if (type === 'arrive') {
    return isThai ? 'ถึงจุดหมายปลายทาง' : 'Arrive at destination';
  }
  if (type === 'depart') {
    return isThai
      ? `ออกเดินทาง${road ? ` ไปตาม ${road}` : ''}`
      : `Depart${road ? ` on ${road}` : ''}`;
  }

  let action = isThai ? 'ตรงไป' : 'Continue';
  if (modifier.includes('sharp left')) action = isThai ? 'เลี้ยวซ้ายหักศอก' : 'Sharp left';
  else if (modifier.includes('slight left')) action = isThai ? 'เบี่ยงซ้าย' : 'Slight left';
  else if (modifier.includes('left')) action = isThai ? 'เลี้ยวซ้าย' : 'Turn left';
  else if (modifier.includes('sharp right')) action = isThai ? 'เลี้ยวขวาหักศอก' : 'Sharp right';
  else if (modifier.includes('slight right')) action = isThai ? 'เบี่ยงขวา' : 'Slight right';
  else if (modifier.includes('right')) action = isThai ? 'เลี้ยวขวา' : 'Turn right';
  else if (modifier.includes('uturn')) action = isThai ? 'กลับรถ' : 'Make a U-turn';
  else if (type === 'roundabout' || type === 'rotary') action = isThai ? 'เข้าวงเวียน' : 'Enter roundabout';

  if (road) {
    return isThai ? `${action} เข้าสู่ ${road}` : `${action} onto ${road}`;
  }
  return action;
}

async function geocodeAddress(query: string, signal?: AbortSignal): Promise<LatLngPoint | null> {
  const cleaned = query.trim();
  if (!cleaned) return null;

  const candidates: string[] = [cleaned];

  // Candidate 2: strip leading house/unit numbers (e.g. "123/45 หมู่ 2 ...") which often confuse Nominatim in Thailand
  const withoutHouseNo = cleaned
    .replace(/^[\d/\-]+\s*(หมู่\s*\d+|ม\.\s*\d+)?\s*/i, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutHouseNo && withoutHouseNo !== cleaned) {
    candidates.push(withoutHouseNo);
  }

  // Candidate 3: take the broader last parts (district/province/landmark)
  const commaParts = cleaned
    .split(/[,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (commaParts.length >= 2) {
    candidates.push(commaParts.slice(-2).join(' '));
  }

  for (const candidate of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(
        candidate
      )}`;
      const res = await fetch(url, {
        signal,
        headers: {
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const results = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      if (Array.isArray(results) && results.length > 0 && results[0].lat && results[0].lon) {
        const lat = Number(results[0].lat);
        const lng = Number(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return null;
    }
  }

  return null;
}

function createRiderIcon(isThai: boolean): L.DivIcon {
  return L.divIcon({
    className: 'rider-custom-origin-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
        <div style="position:relative;width:22px;height:22px;border-radius:9999px;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 0 0 7px rgba(59,130,246,0.28), 0 4px 12px rgba(0,0,0,0.45);"></div>
        <div style="position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:#1E3A8A;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 7px;border-radius:9999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.4);">
          ${isThai ? 'ตำแหน่งของคุณ' : 'You'}
        </div>
      </div>
    `,
  });
}

function createDestinationIcon(isThai: boolean): L.DivIcon {
  return L.divIcon({
    className: 'rider-custom-dest-marker',
    iconSize: [40, 48],
    iconAnchor: [20, 44],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="margin-bottom:2px;background:#171717;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;white-space:nowrap;border:1px solid #F97316;box-shadow:0 3px 10px rgba(0,0,0,0.5);">
          🏁 ${isThai ? 'จุดส่งลูกค้า' : 'Destination'}
        </div>
        <div style="width:30px;height:30px;border-radius:9999px;background:#E65100;border:3px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
          <div style="width:10px;height:10px;border-radius:9999px;background:#FFFFFF;"></div>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #E65100;margin-top:-2px;"></div>
      </div>
    `,
  });
}

export const RiderRouteMapModal: React.FC<RiderRouteMapModalProps> = ({
  isOpen,
  onClose,
  order,
  language = 'th',
}) => {
  const isThai = language === 'th';
  const { settings } = useRestaurant();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [originPoint, setOriginPoint] = useState<LatLngPoint | null>(null);
  const [originSource, setOriginSource] = useState<'gps' | 'store' | 'default'>('default');
  const originSourceRef = useRef<'gps' | 'store' | 'default'>('default');
  const [destPoint, setDestPoint] = useState<LatLngPoint | null>(null);

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [isResolvingDest, setIsResolvingDest] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [geocodeFailed, setGeocodeFailed] = useState<boolean>(false);
  const [manualSearchText, setManualSearchText] = useState<string>('');

  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  const [isStraightLineFallback, setIsStraightLineFallback] = useState<boolean>(false);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);

  const deliveryAddress = order?.customer?.deliveryAddress || '';

  // Close cleanly on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 1. Initialize Fullscreen Leaflet Map + Auto Resize Listeners
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = order?.customer?.latitude || DEFAULT_BANGKOK_CENTER.lat;
      const initialLng = order?.customer?.longitude || DEFAULT_BANGKOK_CENTER.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      routeLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Immediately recalculate size for full-screen viewport
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 200);
    }, 80);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) resizeObserver.disconnect();

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      originMarkerRef.current = null;
      destMarkerRef.current = null;
      routeLayerRef.current = null;
      setIsMapReady(false);
    };
  }, [isOpen, order?.id]);

  // 2. Resolve Destination Coordinates (exact pin -> mapsUrl coords -> Nominatim geocode)
  useEffect(() => {
    if (!isOpen || !order) return;

    const controller = new AbortController();
    setManualSearchText(order.customer?.deliveryAddress || '');
    setGeocodeFailed(false);
    setRouteSteps([]);
    setShowStepsDrawer(false);
    setRouteDistanceMeters(null);
    setRouteDurationSeconds(null);

    const resolveDestination = async () => {
      if (order.customer?.latitude && order.customer?.longitude) {
        setDestPoint({
          lat: order.customer.latitude,
          lng: order.customer.longitude,
        });
        setIsResolvingDest(false);
        return;
      }

      const urlCoords = extractCoordsFromMapsUrl(order.customer?.mapsUrl);
      if (urlCoords) {
        setDestPoint(urlCoords);
        setIsResolvingDest(false);
        return;
      }

      const addr = order.customer?.deliveryAddress?.trim() || '';
      if (!addr) {
        setDestPoint(null);
        setGeocodeFailed(true);
        setIsResolvingDest(false);
        return;
      }

      setDestPoint(null);
      setIsResolvingDest(true);
      const found = await geocodeAddress(addr, controller.signal);
      if (controller.signal.aborted) return;

      setIsResolvingDest(false);
      if (found) {
        setDestPoint(found);
        setGeocodeFailed(false);
      } else {
        setGeocodeFailed(true);
      }
    };

    resolveDestination();

    return () => controller.abort();
  }, [isOpen, order]);

  // 3. Track Rider Current GPS (with fallback to Store Address or Bangkok Center)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setOriginPoint(DEFAULT_BANGKOK_CENTER);
    originSourceRef.current = 'default';
    setOriginSource('default');

    // Also try store address fallback silently in case geolocation is unavailable
    if (settings?.address) {
      geocodeAddress(settings.address).then((storeCoords) => {
        if (!cancelled && storeCoords && originSourceRef.current !== 'gps') {
          originSourceRef.current = 'store';
          setOriginPoint(storeCoords);
          setOriginSource('store');
        }
      });
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          originSourceRef.current = 'gps';
          setOriginPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setOriginSource('gps');
        },
        () => {
          // Keep store/default fallback silently
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          originSourceRef.current = 'gps';
          setOriginPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setOriginSource('gps');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    }

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, settings?.address]);

  // Fit map bounds helper to show both Rider and Destination cleanly
  const fitMapToRoute = useCallback(
    (origin: LatLngPoint | null, dest: LatLngPoint | null, routeCoords?: [number, number][]) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (routeCoords && routeCoords.length > 1) {
        const bounds = L.latLngBounds(routeCoords);
        if (origin) bounds.extend([origin.lat, origin.lng]);
        if (dest) bounds.extend([dest.lat, dest.lng]);
        map.fitBounds(bounds, { padding: [64, 64], maxZoom: 17, animate: true });
        return;
      }

      if (origin && dest) {
        const bounds = L.latLngBounds([
          [origin.lat, origin.lng],
          [dest.lat, dest.lng],
        ]);
        map.fitBounds(bounds, { padding: [64, 64], maxZoom: 17, animate: true });
      } else if (dest) {
        map.setView([dest.lat, dest.lng], 16, { animate: true });
      } else if (origin) {
        map.setView([origin.lat, origin.lng], 15, { animate: true });
      }
    },
    []
  );

  // 4. Update Markers & Fetch OSRM Driving Route whenever Origin or Destination updates
  useEffect(() => {
    if (!isOpen || !isMapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update Origin (Rider) marker
    if (originPoint) {
      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([originPoint.lat, originPoint.lng]);
      } else {
        originMarkerRef.current = L.marker([originPoint.lat, originPoint.lng], {
          icon: createRiderIcon(isThai),
          zIndexOffset: 500,
        }).addTo(map);
      }
    }

    // Update Destination (Customer) marker
    if (destPoint) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destPoint.lat, destPoint.lng]);
      } else {
        destMarkerRef.current = L.marker([destPoint.lat, destPoint.lng], {
          icon: createDestinationIcon(isThai),
          zIndexOffset: 600,
        }).addTo(map);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (!originPoint || !destPoint) {
      if (originPoint && !destPoint) {
        map.setView([originPoint.lat, originPoint.lng], 14);
      }
      return;
    }

    const controller = new AbortController();

    const computeAndDrawRoute = async () => {
      setIsRouting(true);
      setIsStraightLineFallback(false);

      const group = routeLayerRef.current;
      if (group) group.clearLayers();

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originPoint.lng},${originPoint.lat};${destPoint.lng},${destPoint.lat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(osrmUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

        const data = await res.json();
        const route = data?.routes?.[0];
        const coords: [number, number][] | undefined = route?.geometry?.coordinates?.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );

        if (!coords || coords.length === 0) {
          throw new Error('No route geometry');
        }

        if (controller.signal.aborted || !routeLayerRef.current) return;

        // Draw outer glow + solid blue route line
        L.polyline(coords, {
          color: '#1D4ED8',
          weight: 9,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        L.polyline(coords, {
          color: '#3B82F6',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        setRouteDistanceMeters(typeof route.distance === 'number' ? route.distance : null);
        setRouteDurationSeconds(typeof route.duration === 'number' ? route.duration : null);

        // Extract readable turn-by-turn steps
        const rawSteps = route?.legs?.[0]?.steps;
        if (Array.isArray(rawSteps)) {
          const formattedSteps: RouteStep[] = rawSteps
            .filter((s: { distance?: number }) => (s.distance || 0) >= 0)
            .map((s: { maneuver?: { type?: string; modifier?: string }; name?: string; distance?: number }) => ({
              instruction: formatManeuverInstruction(s, isThai),
              distanceMeters: Math.round(s.distance || 0),
            }));
          setRouteSteps(formattedSteps);
        }

        fitMapToRoute(originPoint, destPoint, coords);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Fallback: straight dashed direction line + Haversine distance
        if (routeLayerRef.current) {
          const lineCoords: [number, number][] = [
            [originPoint.lat, originPoint.lng],
            [destPoint.lat, destPoint.lng],
          ];
          L.polyline(lineCoords, {
            color: '#F97316',
            weight: 4,
            opacity: 0.85,
            dashArray: '8, 8',
          }).addTo(routeLayerRef.current);
          fitMapToRoute(originPoint, destPoint, lineCoords);
        }
        const straightDist = calculateHaversineMeters(originPoint, destPoint);
        setRouteDistanceMeters(straightDist);
        setRouteDurationSeconds(Math.max(60, Math.round((straightDist / 1000 / 30) * 3600)));
        setIsStraightLineFallback(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsRouting(false);
        }
      }
    };

    computeAndDrawRoute();

    return () => controller.abort();
  }, [isOpen, isMapReady, originPoint, destPoint, isThai, fitMapToRoute]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchText.trim()) return;
    setIsResolvingDest(true);
    setGeocodeFailed(false);
    const found = await geocodeAddress(manualSearchText);
    setIsResolvingDest(false);
    if (found) {
      setDestPoint(found);
      setGeocodeFailed(false);
    } else {
      setGeocodeFailed(true);
    }
  };

  const handleLocateRider = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginPoint(pt);
        setOriginSource('gps');
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pt.lat, pt.lng], 16, { duration: 0.8 });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!isOpen || !order) return null;

  const externalGoogleMapsUrl = destPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${destPoint.lat},${destPoint.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddress)}`;

  return (
    <div
      id="rider-fullscreen-route-modal"
      className="fixed inset-0 z-60 w-screen h-[100dvh] bg-neutral-950 text-white flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* 1. Fullscreen Top Bar with Back Button */}
      <header className="bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2.5 shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            id="btn-rider-map-back"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 border border-neutral-700 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{isThai ? 'ย้อนกลับ' : 'Back'}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-sm text-orange-400">
                {order.orderNumberFormatted}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {order.customer?.name || 'Customer'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              {deliveryAddress || (isThai ? 'ไม่ระบุที่อยู่' : 'No address')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {order.customer?.phone && order.customer.phone !== '-' && (
            <a
              href={`tel:${order.customer.phone}`}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              title={isThai ? 'โทรหาลูกค้า' : 'Call Customer'}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{isThai ? 'โทร' : 'Call'}</span>
            </a>
          )}
        </div>
      </header>

      {/* 2. Fullscreen Auto-Sized Map Container */}
      <div className="relative flex-1 w-full min-h-0 bg-neutral-900 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status Pill Overlay (Top Center) */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {(isResolvingDest || isRouting) && (
            <div className="bg-neutral-900/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-orange-500/40 shadow-xl flex items-center gap-2 text-xs font-bold text-orange-300 pointer-events-auto">
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              <span>
                {isResolvingDest
                  ? isThai
                    ? 'กำลังค้นหาพิกัดที่อยู่ลูกค้า...'
                    : 'Locating delivery address...'
                  : isThai
                  ? 'กำลังคำนวณเส้นทาง...'
                  : 'Calculating route...'}
              </span>
            </div>
          )}

          {/* Origin source hint when GPS not active */}
          {!isResolvingDest && !isRouting && destPoint && originSource !== 'gps' && (
            <div className="bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 shadow-lg text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5 pointer-events-auto">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                {originSource === 'store'
                  ? isThai
                    ? 'แสดงเส้นทางเริ่มต้นจากที่อยู่ร้าน (เปิด GPS เพื่อเริ่มจากจุดของคุณ)'
                    : 'Routing from store address (enable GPS for live start)'
                  : isThai
                  ? 'แสดงเส้นทางเบื้องต้น (เปิด GPS เพื่อนำทางจากตำแหน่งจริง)'
                  : 'Preview route (enable GPS for your live position)'}
              </span>
            </div>
          )}

          {/* Geocode Not Found Manual Search Bar */}
          {geocodeFailed && !isResolvingDest && (
            <div className="w-full max-w-md bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-amber-500/50 shadow-2xl space-y-2 pointer-events-auto">
              <div className="flex items-start gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  {isThai
                    ? 'ไม่พบพิกัดอัตโนมัติจากที่อยู่เต็ม ลองค้นหาชื่อถนน/ซอย/สถานที่ใกล้เคียง หรือเปิด Google Maps ด้านล่าง'
                    : 'Could not auto-locate exact address. Try searching street/landmark or open Google Maps.'}
                </span>
              </div>
              <form onSubmit={handleManualSearch} className="flex gap-1.5">
                <input
                  type="text"
                  value={manualSearchText}
                  onChange={(e) => setManualSearchText(e.target.value)}
                  placeholder={isThai ? 'พิมพ์ชื่อถนน / ซอย / สถานที่ใกล้เคียง...' : 'Search street / landmark...'}
                  className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isThai ? 'ค้นหา' : 'Search'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Floating Map Controls (Bottom Right above bottom panel) */}
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
          {/* Fit Full Route Button */}
          <button
            type="button"
            onClick={() => fitMapToRoute(originPoint, destPoint)}
            className="w-11 h-11 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800 active:scale-95 text-orange-400 shadow-xl border border-neutral-700 flex items-center justify-center transition-all cursor-pointer"
            title={isThai ? 'แสดงเส้นทางทั้งหมด' : 'Fit Full Route'}
          >
            <Route className="w-5 h-5" />
          </button>

          {/* Center on Rider GPS */}
          <button
            type="button"
            onClick={handleLocateRider}
            className="w-11 h-11 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800 active:scale-95 text-blue-400 shadow-xl border border-neutral-700 flex items-center justify-center transition-all cursor-pointer"
            title={isThai ? 'ตำแหน่งปัจจุบันของฉัน' : 'My Location'}
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          {/* Zoom Controls */}
          <div className="bg-neutral-900/95 rounded-2xl shadow-xl border border-neutral-700 overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="w-11 h-10 hover:bg-neutral-800 active:bg-neutral-700 text-white flex items-center justify-center border-b border-neutral-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="w-11 h-10 hover:bg-neutral-800 active:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Bottom Route Summary, Turn-by-Turn Steps & Actions */}
      <footer className="bg-neutral-900 border-t border-neutral-800 px-3 sm:px-4 py-3 space-y-2.5 shrink-0 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        {/* Distance + ETA + Toggle Steps */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {routeDistanceMeters !== null ? (
                  <>
                    <span className="text-sm sm:text-base font-black text-white">
                      {formatDistance(routeDistanceMeters, isThai)}
                    </span>
                    {routeDurationSeconds !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                        ~{formatDuration(routeDurationSeconds, isThai)}
                      </span>
                    )}
                    {isStraightLineFallback && (
                      <span className="text-[10px] text-amber-400 font-semibold">
                        ({isThai ? 'ระยะทางตรง' : 'Direct line'})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-bold text-neutral-300">
                    {isResolvingDest
                      ? isThai
                        ? 'กำลังค้นหาปลายทาง...'
                        : 'Finding destination...'
                      : isThai
                      ? 'ดูข้อมูลที่อยู่จัดส่ง'
                      : 'Delivery Address Info'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {destPoint
                  ? `${destPoint.lat.toFixed(5)}, ${destPoint.lng.toFixed(5)}`
                  : deliveryAddress}
              </p>
            </div>
          </div>

          {routeSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStepsDrawer((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-orange-300 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{isThai ? 'ขั้นตอนเส้นทาง' : 'Steps'}</span>
              {showStepsDrawer ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Collapsible Turn-by-Turn Route Directions */}
        {showStepsDrawer && routeSteps.length > 0 && (
          <div className="max-h-36 overflow-y-auto bg-neutral-950 rounded-2xl border border-neutral-800 p-2.5 space-y-1.5 text-xs">
            {routeSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 py-1 border-b border-neutral-800/60 last:border-0"
              >
                <span className="text-neutral-200 font-medium">
                  <span className="text-orange-400 font-mono font-bold mr-1.5">{idx + 1}.</span>
                  {step.instruction}
                </span>
                {step.distanceMeters > 0 && (
                  <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                    {formatDistance(step.distanceMeters, isThai)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Action Buttons: Back + Open External Google Maps */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-[0.99] border border-neutral-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isThai ? 'ย้อนกลับหน้ารายการ' : 'Back to Orders'}</span>
          </button>

          <a
            href={externalGoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>{isThai ? 'เปิดในแอป Google Maps' : 'Open Google Maps'}</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </footer>
    </div>
  );
};
