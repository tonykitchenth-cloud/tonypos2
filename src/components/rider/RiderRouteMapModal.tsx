import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { RestaurantOrder } from '../../types';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  ArrowLeft,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
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
  Volume2,
  VolumeX,
  Compass,
  Crosshair,
  RefreshCw,
} from 'lucide-react';
import {
  LatLngPoint,
  toLatLng,
  extractCoordsFromMapsUrl,
  shouldAcceptGpsUpdate,
  formatGeolocationError,
  acquireAccurateGpsFix,
  buildGoogleMapsNavigationUrl,
  shouldUseTopLevelMapsHandoff,
} from '../../utils/geolocation';

interface RiderRouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: RestaurantOrder | null;
  language?: 'th' | 'en';
}

interface RouteStep {
  instruction: string;
  distanceMeters: number;
  maneuverType: string;
  modifier: string;
  location?: LatLngPoint;
}

const DEFAULT_BANGKOK_CENTER: LatLngPoint = {
  lat: 13.7563,
  lng: 100.5018,
};

// Haversine distance in meters
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

// Forward azimuth bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateBearingDegrees(from: LatLngPoint, to: LatLngPoint): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
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

function formatEtaClock(seconds: number, isThai: boolean): string {
  const arrival = new Date(Date.now() + Math.max(60, seconds) * 1000);
  return arrival.toLocaleTimeString(isThai ? 'th-TH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
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

function renderManeuverIcon(maneuverType: string, modifier: string) {
  if (maneuverType === 'arrive') {
    return <Flag className="w-6 h-6 text-white stroke-[2.5]" />;
  }
  if (modifier.includes('uturn')) {
    return <RotateCcw className="w-6 h-6 text-white stroke-[2.5]" />;
  }
  if (modifier.includes('left')) {
    return <CornerUpLeft className="w-6 h-6 text-white stroke-[2.5]" />;
  }
  if (modifier.includes('right')) {
    return <CornerUpRight className="w-6 h-6 text-white stroke-[2.5]" />;
  }
  return <ArrowUp className="w-6 h-6 text-white stroke-[2.5]" />;
}

function normalizeThaiAddressForSearch(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, ' ')
    .replace(/(?:^|\s)ต\.\s*/g, ' ตำบล ')
    .replace(/(?:^|\s)อ\.\s*/g, ' อำเภอ ')
    .replace(/(?:^|\s)จ\.\s*/g, ' จังหวัด ')
    .replace(/(?:^|\s)ถ\.\s*/g, ' ถนน ')
    .replace(/(?:^|\s)ซ\.\s*/g, ' ซอย ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildViewboxParams(biasPoint?: LatLngPoint | null): string {
  if (!biasPoint) return '';
  const delta = 0.45; // ~50km soft bias around rider/store without strict bounding
  const left = (biasPoint.lng - delta).toFixed(4);
  const top = (biasPoint.lat + delta).toFixed(4);
  const right = (biasPoint.lng + delta).toFixed(4);
  const bottom = (biasPoint.lat - delta).toFixed(4);
  return `&viewbox=${left},${top},${right},${bottom}&bounded=0`;
}

async function geocodeAddress(
  query: string,
  options?: { biasPoint?: LatLngPoint | null; signal?: AbortSignal }
): Promise<LatLngPoint | null> {
  const signal = options?.signal;
  const biasPoint = options?.biasPoint;
  const cleaned = query.trim();
  if (!cleaned) return null;

  const normalized = normalizeThaiAddressForSearch(cleaned);
  const candidates: string[] = Array.from(new Set([cleaned, normalized].filter(Boolean)));

  const withoutHouseNo = normalized
    .replace(/^[\d/\-]+\s*(หมู่ที่?\s*\d+|ม\.\s*\d+)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutHouseNo && !candidates.includes(withoutHouseNo)) {
    candidates.push(withoutHouseNo);
  }

  const commaParts = normalized
    .split(/[,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (commaParts.length >= 2) {
    const tail = commaParts.slice(-2).join(' ');
    if (tail && !candidates.includes(tail)) {
      candidates.push(tail);
    }
  }

  const viewboxQuery = buildViewboxParams(biasPoint);

  for (const candidate of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=th${viewboxQuery}&q=${encodeURIComponent(
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
      if (Array.isArray(results) && results.length > 0) {
        const validPoints = results
          .map((r) => toLatLng(r.lat, r.lon))
          .filter((pt): pt is LatLngPoint => pt !== null);

        if (validPoints.length > 0) {
          if (biasPoint && validPoints.length > 1) {
            // Prefer plausible match closest to rider/store to prevent cross-province mismatches
            validPoints.sort(
              (a, b) => calculateHaversineMeters(biasPoint, a) - calculateHaversineMeters(biasPoint, b)
            );
          }
          return validPoints[0];
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return null;
    }
  }

  // Secondary fallback: Photon fuzzy search with lat/lon location bias (filtered inside Thailand bounds)
  try {
    const photonBias = biasPoint ? `&lat=${biasPoint.lat.toFixed(5)}&lon=${biasPoint.lng.toFixed(5)}` : '';
    const photonQuery = withoutHouseNo || normalized || cleaned;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=5${photonBias}`;
    const res = await fetch(photonUrl, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
      };
      const features = data?.features || [];
      const thaiPoints = features
        .map((f) => {
          const coords = f.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return null;
          return toLatLng(coords[1], coords[0]);
        })
        .filter(
          (pt): pt is LatLngPoint =>
            pt !== null && pt.lat >= 5.5 && pt.lat <= 20.6 && pt.lng >= 97.3 && pt.lng <= 105.8
        );
      if (thaiPoints.length > 0) {
        if (biasPoint && thaiPoints.length > 1) {
          thaiPoints.sort(
            (a, b) => calculateHaversineMeters(biasPoint, a) - calculateHaversineMeters(biasPoint, b)
          );
        }
        return thaiPoints[0];
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return null;
  }

  return null;
}

// Google-Maps-style directional navigation arrow marker for live GPS navigation (or Store pin if store fallback)
function createNavigationArrowIcon(headingDeg: number, isThai: boolean, isStoreFallback: boolean = false): L.DivIcon {
  const safeHeading = Number.isFinite(headingDeg) ? headingDeg : 0;
  if (isStoreFallback) {
    return L.divIcon({
      className: 'rider-custom-store-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
          <div style="width:32px;height:32px;border-radius:9999px;background:#F97316;border:3px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
            <div style="width:10px;height:10px;border-radius:9999px;background:#FFFFFF;"></div>
          </div>
          <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:#9A3412;color:#FFFFFF;font-size:9px;font-weight:800;padding:1px 6px;border-radius:9999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.4);">
            ${isThai ? 'ร้านค้า' : 'Store'}
          </div>
        </div>
      `,
    });
  }

  return L.divIcon({
    className: 'rider-custom-nav-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
        <div style="width:42px;height:42px;border-radius:9999px;background:rgba(37,99,235,0.22);display:flex;align-items:center;justify-content:center;">
          <div style="width:30px;height:30px;border-radius:9999px;background:#FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.45);transform:rotate(${safeHeading}deg);transition:transform 0.3s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
        </div>
        <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:#1E3A8A;color:#FFFFFF;font-size:9px;font-weight:800;padding:1px 6px;border-radius:9999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.4);">
          ${isThai ? 'คุณ' : 'You'}
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
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<string>('');
  const hasAutoZoomedNavRef = useRef<boolean>(false);
  const bestOriginGpsRef = useRef<{ accuracy: number; timestamp: number } | null>(null);
  const storeFallbackRef = useRef<LatLngPoint | null>(null);
  const refinedGeocodeWithGpsRef = useRef<boolean>(false);

  const [originPoint, setOriginPoint] = useState<LatLngPoint | null>(null);
  const [originSource, setOriginSource] = useState<'gps' | 'store' | 'locating' | 'unavailable'>('locating');
  const originSourceRef = useRef<'gps' | 'store' | 'locating' | 'unavailable'>('locating');
  const [originAccuracyMeters, setOriginAccuracyMeters] = useState<number | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [isRetryingGps, setIsRetryingGps] = useState<boolean>(false);
  const [riderHeading, setRiderHeading] = useState<number | null>(null);

  const [destPoint, setDestPoint] = useState<LatLngPoint | null>(null);
  const [destSource, setDestSource] = useState<'customer_gps' | 'maps_url' | 'geocoded' | 'manual' | null>(null);
  const [isManualPinMode, setIsManualPinMode] = useState<boolean>(false);
  const isManualPinModeRef = useRef<boolean>(false);

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [isResolvingDest, setIsResolvingDest] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [geocodeFailed, setGeocodeFailed] = useState<boolean>(false);
  const [manualSearchText, setManualSearchText] = useState<string>('');

  // Auto-Start Navigation state (starts ON automatically when modal opens, like tapping "Start" in Google Maps)
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);

  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  const [isStraightLineFallback, setIsStraightLineFallback] = useState<boolean>(false);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);

  const deliveryAddress = order?.customer?.deliveryAddress || '';

  useEffect(() => {
    isManualPinModeRef.current = isManualPinMode;
  }, [isManualPinMode]);

  // Close cleanly on Escape key & stop TTS on unmount
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, [isOpen, onClose]);

  // 1. Initialize Fullscreen Leaflet Map + Auto Resize Listeners
  useEffect(() => {
    if (!isOpen) return;

    hasAutoZoomedNavRef.current = false;
    setIsNavigating(true);
    setIsAutoFollow(true);
    setIsManualPinMode(false);
    lastSpokenStepRef.current = '';

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialCustomerCoords =
        toLatLng(order?.customer?.latitude, order?.customer?.longitude) ||
        extractCoordsFromMapsUrl(order?.customer?.mapsUrl);
      const initialLat = initialCustomerCoords?.lat ?? DEFAULT_BANGKOK_CENTER.lat;
      const initialLng = initialCustomerCoords?.lng ?? DEFAULT_BANGKOK_CENTER.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialCustomerCoords ? 16 : 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // If rider manually drags map during active navigation, pause auto-follow so they can inspect freely
      map.on('dragstart', () => {
        setIsAutoFollow(false);
      });

      // Allow rider to tap map to manually place/correct destination pin when adjust mode is active
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!isManualPinModeRef.current) return;
        const tapped = toLatLng(e.latlng.lat, e.latlng.lng);
        if (tapped) {
          setDestPoint({ lat: Number(tapped.lat.toFixed(6)), lng: Number(tapped.lng.toFixed(6)) });
          setDestSource('manual');
          setGeocodeFailed(false);
          setIsManualPinMode(false);
        }
      });

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
      accuracyCircleRef.current = null;
      destMarkerRef.current = null;
      routeLayerRef.current = null;
      setIsMapReady(false);
    };
  }, [isOpen, order?.id]);

  // 2. Resolve Destination Coordinates (exact customer pin -> mapsUrl coords -> location-biased Thai geocode)
  useEffect(() => {
    if (!isOpen || !order) return;

    const controller = new AbortController();
    refinedGeocodeWithGpsRef.current = false;
    setManualSearchText(order.customer?.deliveryAddress || '');
    setGeocodeFailed(false);
    setRouteSteps([]);
    setRouteCoords([]);
    setShowStepsDrawer(false);
    setRouteDistanceMeters(null);
    setRouteDurationSeconds(null);

    const resolveDestination = async () => {
      const exactPin = toLatLng(order.customer?.latitude, order.customer?.longitude);
      if (exactPin) {
        setDestPoint(exactPin);
        setDestSource('customer_gps');
        setIsResolvingDest(false);
        return;
      }

      const urlCoords = extractCoordsFromMapsUrl(order.customer?.mapsUrl);
      if (urlCoords) {
        setDestPoint(urlCoords);
        setDestSource('maps_url');
        setIsResolvingDest(false);
        return;
      }

      const addr = order.customer?.deliveryAddress?.trim() || '';
      if (!addr) {
        setDestPoint(null);
        setDestSource(null);
        setGeocodeFailed(true);
        setIsResolvingDest(false);
        return;
      }

      setDestPoint(null);
      setDestSource(null);
      setIsResolvingDest(true);
      const found = await geocodeAddress(addr, {
        biasPoint: originSourceRef.current === 'gps' ? originPoint : storeFallbackRef.current,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setIsResolvingDest(false);
      if (found) {
        setDestPoint(found);
        setDestSource('geocoded');
        setGeocodeFailed(false);
      } else {
        setGeocodeFailed(true);
      }
    };

    resolveDestination();

    return () => controller.abort();
  }, [isOpen, order]);

  // Refine text-geocoded destination once real Rider GPS arrives (prevents wrong-province Nominatim match)
  useEffect(() => {
    if (!isOpen || !order || originSource !== 'gps' || !originPoint) return;
    if (refinedGeocodeWithGpsRef.current) return;
    if (destSource === 'customer_gps' || destSource === 'maps_url' || destSource === 'manual') return;

    const addr = order.customer?.deliveryAddress?.trim() || '';
    if (!addr) return;

    refinedGeocodeWithGpsRef.current = true;
    const controller = new AbortController();
    geocodeAddress(addr, { biasPoint: originPoint, signal: controller.signal }).then((refined) => {
      if (controller.signal.aborted || !refined) return;
      setDestPoint((prev) => {
        if (!prev) return refined;
        // Update if refined result differs noticeably (> 150m) from unbiased initial guess
        return calculateHaversineMeters(prev, refined) > 150 ? refined : prev;
      });
      setDestSource('geocoded');
      setGeocodeFailed(false);
    });

    return () => controller.abort();
  }, [isOpen, order, originSource, originPoint, destSource]);

  // 3. Track Rider Live GPS + Heading continuously via single iOS-safe watchPosition (with accuracy filtering)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    bestOriginGpsRef.current = null;
    storeFallbackRef.current = null;
    setOriginPoint(null);
    originSourceRef.current = 'locating';
    setOriginSource('locating');
    setOriginAccuracyMeters(null);
    setGpsErrorMsg(null);
    setRiderHeading(null);

    // Optional store address fallback ONLY if owner configured a specific address (not generic "Bangkok, Thailand")
    const trimmedStoreAddr = (settings?.address || '').trim();
    const hasSpecificStoreAddr =
      trimmedStoreAddr.length > 0 && trimmedStoreAddr.toLowerCase() !== 'bangkok, thailand';

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (hasSpecificStoreAddr) {
      geocodeAddress(trimmedStoreAddr).then((storeCoords) => {
        if (cancelled || !storeCoords) return;
        storeFallbackRef.current = storeCoords;
        // Wait briefly for GPS first; if GPS already failed/unavailable, show store fallback immediately
        if (originSourceRef.current === 'unavailable') {
          originSourceRef.current = 'store';
          setOriginPoint(storeCoords);
          setOriginSource('store');
        }
      });

      fallbackTimer = setTimeout(() => {
        if (!cancelled && originSourceRef.current === 'locating' && storeFallbackRef.current) {
          originSourceRef.current = 'store';
          setOriginPoint(storeFallbackRef.current);
          setOriginSource('store');
        }
      }, 4500);
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          const pt = toLatLng(pos.coords.latitude, pos.coords.longitude);
          if (!pt) return;

          const acc =
            typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
              ? Math.round(pos.coords.accuracy)
              : 9999;
          const ts = pos.timestamp || Date.now();

          if (!shouldAcceptGpsUpdate(bestOriginGpsRef.current, { accuracy: acc, timestamp: ts })) {
            return;
          }

          bestOriginGpsRef.current = { accuracy: acc, timestamp: ts };
          originSourceRef.current = 'gps';
          setOriginPoint({ lat: Number(pt.lat.toFixed(6)), lng: Number(pt.lng.toFixed(6)) });
          setOriginSource('gps');
          setOriginAccuracyMeters(acc);
          setGpsErrorMsg(null);

          if (
            typeof pos.coords.heading === 'number' &&
            Number.isFinite(pos.coords.heading) &&
            pos.coords.heading >= 0 &&
            pos.coords.heading <= 360
          ) {
            setRiderHeading(pos.coords.heading);
          }
        },
        (err) => {
          if (cancelled) return;
          console.warn('Rider GPS watch error:', err);
          setGpsErrorMsg(formatGeolocationError(err, isThai));
          if (originSourceRef.current !== 'gps') {
            if (storeFallbackRef.current) {
              originSourceRef.current = 'store';
              setOriginPoint(storeFallbackRef.current);
              setOriginSource('store');
            } else {
              originSourceRef.current = 'unavailable';
              setOriginSource('unavailable');
            }
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      setGpsErrorMsg(
        isThai ? 'อุปกรณ์ไม่รองรับ GPS กรุณาเปิดใช้บริการตำแหน่งที่ตั้ง' : 'Geolocation is not supported.'
      );
      if (storeFallbackRef.current) {
        originSourceRef.current = 'store';
        setOriginPoint(storeFallbackRef.current);
        setOriginSource('store');
      } else {
        originSourceRef.current = 'unavailable';
        setOriginSource('unavailable');
      }
    }

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, settings?.address, isThai]);

  // Fit map bounds helper (Overview mode)
  const fitMapToRoute = useCallback(
    (origin: LatLngPoint | null, dest: LatLngPoint | null, coordsToFit?: [number, number][]) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const activeCoords = coordsToFit && coordsToFit.length > 1 ? coordsToFit : routeCoords;
      if (activeCoords.length > 1) {
        const bounds = L.latLngBounds(activeCoords);
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
        map.setView([origin.lat, origin.lng], 16, { animate: true });
      }
    },
    [routeCoords]
  );

  // Determine the active/next turn-by-turn maneuver based on Rider's live position
  const activeNavStep = useMemo(() => {
    if (!destPoint) return null;

    if (originPoint) {
      const distToDest = calculateHaversineMeters(originPoint, destPoint);
      if (distToDest <= 45) {
        return {
          instruction: isThai ? 'ถึงจุดส่งอาหารของลูกค้าแล้ว!' : 'You have arrived at destination!',
          distanceMeters: Math.round(distToDest),
          maneuverType: 'arrive',
          modifier: '',
          arrived: true,
        };
      }
    }

    if (routeSteps.length === 0) {
      return {
        instruction: isThai ? 'มุ่งหน้าไปยังจุดส่งลูกค้า' : 'Proceed to delivery destination',
        distanceMeters: routeDistanceMeters || (originPoint ? Math.round(calculateHaversineMeters(originPoint, destPoint)) : 0),
        maneuverType: 'depart',
        modifier: '',
        arrived: false,
      };
    }

    // Prefer step[1] (next turn) if available, otherwise step[0]
    if (originPoint) {
      for (let i = 1; i < routeSteps.length; i++) {
        const step = routeSteps[i];
        if (step.location) {
          const distToManeuver = calculateHaversineMeters(originPoint, step.location);
          // Pick the upcoming maneuver not yet passed (> 20m away) or final arrive step
          if (distToManeuver > 20 || i === routeSteps.length - 1) {
            return {
              instruction: step.instruction,
              distanceMeters: Math.round(distToManeuver),
              maneuverType: step.maneuverType,
              modifier: step.modifier,
              arrived: false,
            };
          }
        }
      }
    }

    const next = routeSteps[1] || routeSteps[0];
    return {
      instruction: next.instruction,
      distanceMeters: routeSteps[0]?.distanceMeters || next.distanceMeters,
      maneuverType: next.maneuverType,
      modifier: next.modifier,
      arrived: false,
    };
  }, [originPoint, destPoint, routeSteps, routeDistanceMeters, isThai]);

  // Optional Thai/English voice guidance whenever the active instruction changes (if Rider unmuted)
  useEffect(() => {
    if (!isOpen || !isNavigating || !isVoiceEnabled || !activeNavStep) return;
    const text =
      activeNavStep.arrived
        ? activeNavStep.instruction
        : isThai
        ? `อีก ${formatDistance(activeNavStep.distanceMeters, true)} ${activeNavStep.instruction}`
        : `In ${formatDistance(activeNavStep.distanceMeters, false)}, ${activeNavStep.instruction}`;

    if (text === lastSpokenStepRef.current) return;
    lastSpokenStepRef.current = text;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = isThai ? 'th-TH' : 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }, [isOpen, isNavigating, isVoiceEnabled, activeNavStep, isThai]);

  // 4. Update Markers, GPS Accuracy Ring & Follow Rider Camera in Live Navigation Mode
  useEffect(() => {
    if (!isOpen || !isMapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Compute heading toward next route point if real GPS heading wasn't supplied
    let computedBearing = riderHeading !== null ? riderHeading : 0;
    if (originPoint && riderHeading === null) {
      if (routeCoords.length > 1) {
        const target = routeCoords[Math.min(2, routeCoords.length - 1)];
        computedBearing = calculateBearingDegrees(originPoint, { lat: target[0], lng: target[1] });
      } else if (destPoint) {
        computedBearing = calculateBearingDegrees(originPoint, destPoint);
      }
    }

    if (originPoint) {
      const arrowIcon = createNavigationArrowIcon(computedBearing, isThai, originSource === 'store');
      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([originPoint.lat, originPoint.lng]);
        originMarkerRef.current.setIcon(arrowIcon);
      } else {
        originMarkerRef.current = L.marker([originPoint.lat, originPoint.lng], {
          icon: arrowIcon,
          zIndexOffset: 700,
        }).addTo(map);
      }

      if (originSource === 'gps' && originAccuracyMeters && originAccuracyMeters <= 2500) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([originPoint.lat, originPoint.lng]);
          accuracyCircleRef.current.setRadius(originAccuracyMeters);
        } else {
          accuracyCircleRef.current = L.circle([originPoint.lat, originPoint.lng], {
            radius: originAccuracyMeters,
            color: '#2563EB',
            weight: 1,
            opacity: 0.45,
            fillColor: '#3B82F6',
            fillOpacity: 0.12,
            interactive: false,
          }).addTo(map);
        }
      } else if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }
    } else {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }
    }

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

    // Active Navigation Camera Auto-Follow (zoomed in on Rider GPS like Google Maps "Start" mode)
    if (isNavigating && isAutoFollow && !isManualPinMode && originPoint && originSource === 'gps') {
      const targetZoom = hasAutoZoomedNavRef.current ? Math.max(map.getZoom(), 16.5) : 17;
      hasAutoZoomedNavRef.current = true;
      map.setView([originPoint.lat, originPoint.lng], targetZoom, { animate: true });
    }
  }, [isOpen, isMapReady, originPoint, originSource, originAccuracyMeters, destPoint, riderHeading, routeCoords, isNavigating, isAutoFollow, isManualPinMode, isThai]);

  // 5. Fetch & Draw OSRM Driving Route whenever Origin or Destination updates
  useEffect(() => {
    if (!isOpen || !isMapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!originPoint || !destPoint) {
      if (destPoint && !originPoint) {
        map.setView([destPoint.lat, destPoint.lng], 16, { animate: true });
      } else if (originPoint && !destPoint) {
        map.setView([originPoint.lat, originPoint.lng], 16, { animate: true });
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

        // Draw outer glow + Google-Maps-blue solid route polyline
        L.polyline(coords, {
          color: '#1D4ED8',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        L.polyline(coords, {
          color: '#2563EB',
          weight: 6,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current);

        setRouteCoords(coords);
        setRouteDistanceMeters(typeof route.distance === 'number' ? route.distance : null);
        setRouteDurationSeconds(typeof route.duration === 'number' ? route.duration : null);

        const rawSteps = route?.legs?.[0]?.steps;
        if (Array.isArray(rawSteps)) {
          const formattedSteps: RouteStep[] = rawSteps
            .filter((s: { distance?: number }) => (s.distance || 0) >= 0)
            .map(
              (s: {
                maneuver?: { type?: string; modifier?: string; location?: [number, number] };
                name?: string;
                distance?: number;
              }) => ({
                instruction: formatManeuverInstruction(s, isThai),
                distanceMeters: Math.round(s.distance || 0),
                maneuverType: s.maneuver?.type || '',
                modifier: s.maneuver?.modifier || '',
                location:
                  Array.isArray(s.maneuver?.location) && s.maneuver.location.length >= 2
                    ? { lat: s.maneuver.location[1], lng: s.maneuver.location[0] }
                    : undefined,
              })
            );
          setRouteSteps(formattedSteps);
        }

        // In Navigation mode: zoom onto Rider GPS if live GPS is active; otherwise fit full route so Rider sees entire route
        if (!isManualPinMode) {
          if (isNavigating && isAutoFollow && originSourceRef.current === 'gps') {
            hasAutoZoomedNavRef.current = true;
            map.setView([originPoint.lat, originPoint.lng], 17, { animate: true });
          } else if (!hasAutoZoomedNavRef.current) {
            fitMapToRoute(originPoint, destPoint, coords);
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        if (routeLayerRef.current) {
          const lineCoords: [number, number][] = [
            [originPoint.lat, originPoint.lng],
            [destPoint.lat, destPoint.lng],
          ];
          L.polyline(lineCoords, {
            color: '#F97316',
            weight: 5,
            opacity: 0.9,
            dashArray: '8, 8',
          }).addTo(routeLayerRef.current);
          setRouteCoords(lineCoords);
          if (!isManualPinMode && !(isNavigating && isAutoFollow && originSourceRef.current === 'gps')) {
            fitMapToRoute(originPoint, destPoint, lineCoords);
          }
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
  }, [isOpen, isMapReady, originPoint, destPoint, isThai]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchText.trim()) return;
    setIsResolvingDest(true);
    setGeocodeFailed(false);
    const found = await geocodeAddress(manualSearchText, {
      biasPoint: originSourceRef.current === 'gps' ? originPoint : storeFallbackRef.current,
    });
    setIsResolvingDest(false);
    if (found) {
      setDestPoint(found);
      setDestSource('geocoded');
      setGeocodeFailed(false);
    } else {
      setGeocodeFailed(true);
    }
  };

  // Manual iOS-safe high-accuracy GPS retry
  const handleRetryGps = () => {
    if (isRetryingGps) return;
    setIsRetryingGps(true);
    setGpsErrorMsg(null);
    acquireAccurateGpsFix({
      timeoutMs: 12000,
      refineWindowMs: 3200,
      targetAccuracyMeters: 25,
      onProgress: (fix) => {
        bestOriginGpsRef.current = { accuracy: fix.accuracy, timestamp: fix.timestamp };
        originSourceRef.current = 'gps';
        setOriginPoint({ lat: fix.lat, lng: fix.lng });
        setOriginSource('gps');
        setOriginAccuracyMeters(fix.accuracy);
        if (fix.heading !== null) setRiderHeading(fix.heading);
      },
    })
      .then((best) => {
        setIsRetryingGps(false);
        bestOriginGpsRef.current = { accuracy: best.accuracy, timestamp: best.timestamp };
        originSourceRef.current = 'gps';
        setOriginPoint({ lat: best.lat, lng: best.lng });
        setOriginSource('gps');
        setOriginAccuracyMeters(best.accuracy);
        setGpsErrorMsg(null);
        if (best.heading !== null) setRiderHeading(best.heading);
        if (mapInstanceRef.current && isAutoFollow) {
          mapInstanceRef.current.setView([best.lat, best.lng], 17, { animate: true });
        }
      })
      .catch((err) => {
        setIsRetryingGps(false);
        setGpsErrorMsg(formatGeolocationError(err, isThai));
      });
  };

  // Snap back to live Google-Maps-style Navigation Follow mode
  const handleResumeNavigation = () => {
    setIsNavigating(true);
    setIsAutoFollow(true);
    setIsManualPinMode(false);
    if (originPoint && originSource === 'gps' && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([originPoint.lat, originPoint.lng], 17, { duration: 0.7 });
      return;
    }
    handleRetryGps();
  };

  const handleViewFullRoute = () => {
    setIsAutoFollow(false);
    fitMapToRoute(originPoint, destPoint);
  };

  if (!isOpen || !order) return null;

  const externalGoogleMapsUrl = buildGoogleMapsNavigationUrl({
    latitude: destPoint?.lat,
    longitude: destPoint?.lng,
    mapsUrl: order.customer?.mapsUrl,
    address: deliveryAddress,
  });

  const handleOpenExternalGoogleMaps = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldUseTopLevelMapsHandoff()) {
      e.preventDefault();
      window.location.assign(externalGoogleMapsUrl);
    }
  };

  return (
    <div
      id="rider-fullscreen-route-modal"
      className="fixed inset-0 z-60 w-screen h-[100dvh] bg-[#0A0A0A] text-[#FFFFFF] flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* 1. Compact Header with Prominent Back Button + Order + Call */}
      <header className="bg-[#171717] border-b border-[#262626] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            id="btn-rider-map-back"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-[#262626] hover:bg-[#404040] active:scale-95 text-[#FFFFFF] font-black text-xs flex items-center gap-1.5 border border-[#404040] transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{isThai ? 'ย้อนกลับ' : 'Back'}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-xs sm:text-sm text-[#FB923C]">
                {order.orderNumberFormatted}
              </span>
              <span className="text-xs font-bold text-[#FFFFFF] truncate">
                {order.customer?.name || 'Customer'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#A3A3A3] truncate">
              {deliveryAddress || (isThai ? 'ไม่ระบุที่อยู่' : 'No address')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Guidance Mute/Unmute */}
          <button
            type="button"
            onClick={() => {
              const next = !isVoiceEnabled;
              setIsVoiceEnabled(next);
              if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                try {
                  window.speechSynthesis.cancel();
                } catch {}
              }
            }}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
              isVoiceEnabled
                ? 'bg-[#064E3B] border-[#10B981] text-[#6EE7B7]'
                : 'bg-[#262626] border-[#404040] text-[#A3A3A3] hover:text-[#FFFFFF]'
            }`}
            title={isThai ? 'เปิด/ปิดเสียงนำทาง' : 'Toggle voice guidance'}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {order.customer?.phone && order.customer.phone !== '-' && (
            <a
              href={`tel:${order.customer.phone}`}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#059669] hover:bg-[#10B981] text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
              title={isThai ? 'โทรหาลูกค้า' : 'Call Customer'}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{isThai ? 'โทร' : 'Call'}</span>
            </a>
          )}
        </div>
      </header>

      {/* 2. Google-Maps-Style Green Auto-Navigation Turn-by-Turn Top Banner */}
      {isNavigating && activeNavStep && (
        <div
          id="rider-active-nav-banner"
          className={`px-3.5 py-2.5 shrink-0 z-20 shadow-lg flex items-center justify-between gap-3 transition-colors ${
            activeNavStep.arrived
              ? 'bg-[#D97706]'
              : 'bg-[#047857]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(0,0,0,0.28)] border border-[rgba(255,255,255,0.25)] flex items-center justify-center shrink-0">
              {renderManeuverIcon(activeNavStep.maneuverType, activeNavStep.modifier)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!activeNavStep.arrived && activeNavStep.distanceMeters > 0 && (
                  <span className="text-base sm:text-lg font-black text-[#FFFFFF] leading-none">
                    {formatDistance(activeNavStep.distanceMeters, isThai)}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.28)] text-[#D1FAE5]">
                  {activeNavStep.arrived
                    ? isThai
                      ? 'ถึงแล้ว'
                      : 'Arrived'
                    : isThai
                    ? 'กำลังนำทางอัตโนมัติ'
                    : 'Auto Navigating'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] mt-0.5 line-clamp-2 leading-snug">
                {activeNavStep.instruction}
              </p>
            </div>
          </div>

          {routeSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStepsDrawer((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl bg-[rgba(0,0,0,0.28)] hover:bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.25)] text-[11px] font-black text-[#FFFFFF] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{isThai ? 'เส้นทาง' : 'Steps'}</span>
              {showStepsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* 3. Fullscreen Auto-Sized Map Container */}
      <div className="relative flex-1 w-full min-h-0 bg-[#171717] overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status / Geocode Overlay */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {(isResolvingDest || isRouting) && (
            <div className="bg-[#171717] px-3.5 py-2 rounded-full border border-[#F97316] shadow-xl flex items-center gap-2 text-xs font-bold text-[#FDBA74] pointer-events-auto">
              <Loader2 className="w-4 h-4 animate-spin text-[#FB923C]" />
              <span>
                {isResolvingDest
                  ? isThai
                    ? 'กำลังค้นหาพิกัดและเริ่มนำทางอัตโนมัติ...'
                    : 'Locating destination & starting navigation...'
                  : isThai
                  ? 'กำลังคำนวณเส้นทางนำทาง...'
                  : 'Calculating navigation route...'}
              </span>
            </div>
          )}

          {/* Manual Destination Pin Drop Instruction */}
          {isManualPinMode && (
            <div className="bg-[#EA580C] px-3.5 py-2 rounded-2xl border border-[#FDBA74] shadow-2xl flex items-center justify-between gap-2 text-xs font-extrabold text-[#FFFFFF] pointer-events-auto">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 shrink-0" />
                <span>
                  {isThai
                    ? 'แตะบนแผนที่เพื่อวางหมุดปลายทางลูกค้าใหม่'
                    : 'Tap anywhere on map to set destination pin'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsManualPinMode(false)}
                className="px-2 py-0.5 rounded-lg bg-[#0A0A0A] text-[#FFFFFF] text-[11px] font-bold cursor-pointer shrink-0"
              >
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
            </div>
          )}

          {/* Origin GPS Status / iOS Precise Location Alert + Retry */}
          {!isResolvingDest && !isRouting && originSource !== 'gps' && (
            <div className="max-w-md bg-[#171717] px-3 py-2 rounded-2xl border border-[#F59E0B] shadow-lg text-[11px] font-semibold text-[#E5E5E5] flex items-center justify-between gap-2 pointer-events-auto">
              <div className="flex items-start gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#FBBF24] shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {gpsErrorMsg
                    ? gpsErrorMsg
                    : originSource === 'store'
                    ? isThai
                      ? 'กำลังเริ่มจากตำแหน่งร้าน (แตะ "จับ GPS" เพื่อใช้ตำแหน่งจริงของคุณ)'
                      : 'Routing from store (tap Retry GPS for live position)'
                    : isThai
                    ? 'กำลังจับสัญญาณ GPS ความแม่นยำสูง...'
                    : 'Acquiring high-accuracy GPS signal...'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetryGps}
                disabled={isRetryingGps}
                className="px-2.5 py-1 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-60 text-[#FFFFFF] font-black text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRetryingGps ? 'animate-spin' : ''}`} />
                <span>{isThai ? 'จับ GPS' : 'Retry'}</span>
              </button>
            </div>
          )}

          {/* Low-accuracy warning if GPS fixed > 200m (common before iOS satellite lock) */}
          {originSource === 'gps' && originAccuracyMeters !== null && originAccuracyMeters > 200 && (
            <div className="bg-[#451A03] px-3 py-1.5 rounded-full border border-[#F59E0B] shadow-lg text-[11px] font-bold text-[#FDE68A] flex items-center gap-2 pointer-events-auto">
              <span>
                {isThai
                  ? `⚠️ สัญญาณ GPS ยังคลาดเคลื่อน (±${originAccuracyMeters} ม.)`
                  : `⚠️ Low GPS accuracy (±${originAccuracyMeters}m)`}
              </span>
              <button
                type="button"
                onClick={handleRetryGps}
                disabled={isRetryingGps}
                className="underline font-black text-[#FFFFFF] cursor-pointer"
              >
                {isThai ? 'จับใหม่' : 'Refine'}
              </button>
            </div>
          )}

          {/* Geocode Not Found Manual Search Bar */}
          {geocodeFailed && !isResolvingDest && (
            <div className="w-full max-w-md bg-[#171717] p-3 rounded-2xl border border-[#F59E0B] shadow-2xl space-y-2 pointer-events-auto">
              <div className="flex items-start gap-2 text-xs text-[#FCD34D]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FBBF24]" />
                <span>
                  {isThai
                    ? 'ไม่พบพิกัดอัตโนมัติจากที่อยู่เต็ม ลองค้นหาชื่อถนน/ซอย หรือกดปุ่มปรับหมุดปลายทางบนแผนที่'
                    : 'Could not auto-locate address. Search street/landmark or drop pin on map.'}
                </span>
              </div>
              <form onSubmit={handleManualSearch} className="flex gap-1.5">
                <input
                  type="text"
                  value={manualSearchText}
                  onChange={(e) => setManualSearchText(e.target.value)}
                  placeholder={isThai ? 'พิมพ์ชื่อถนน / ซอย / สถานที่ใกล้เคียง...' : 'Search street / landmark...'}
                  className="flex-1 min-w-0 bg-[#262626] border border-[#404040] rounded-xl px-3 py-1.5 text-xs text-[#FFFFFF] placeholder-[#A3A3A3] focus:outline-none focus:border-[#F97316]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-[#0A0A0A] font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isThai ? 'ค้นหา' : 'Search'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Floating "Recenter / กลับสู่การนำทาง" Button when rider drags or zooms out */}
        {!isAutoFollow && (
          <div className="absolute left-3 bottom-3 z-20">
            <button
              type="button"
              id="btn-rider-recenter-nav"
              onClick={handleResumeNavigation}
              className="px-3.5 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#3B82F6] active:scale-95 text-[#FFFFFF] font-black text-xs shadow-2xl border border-[#93C5FD] flex items-center gap-2 cursor-pointer transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>{isThai ? 'กลับสู่การนำทาง' : 'Recenter'}</span>
            </button>
          </div>
        )}

        {/* Floating Map Controls (Bottom Right) */}
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
          {/* Adjust Destination Pin Manually */}
          <button
            type="button"
            onClick={() => {
              setIsAutoFollow(false);
              setIsManualPinMode((prev) => !prev);
            }}
            className={`w-11 h-11 rounded-2xl shadow-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isManualPinMode
                ? 'bg-[#F97316] border-[#FDBA74] text-[#0A0A0A]'
                : 'bg-[#171717] hover:bg-[#262626] border-[#404040] text-[#FCD34D]'
            }`}
            title={isThai ? 'ปรับหมุดปลายทางบนแผนที่' : 'Adjust Destination Pin'}
          >
            <Crosshair className="w-5 h-5" />
          </button>

          {/* Overview / Fit Entire Route */}
          <button
            type="button"
            onClick={handleViewFullRoute}
            className="w-11 h-11 rounded-2xl bg-[#171717] hover:bg-[#262626] active:scale-95 text-[#FB923C] shadow-xl border border-[#404040] flex items-center justify-center transition-all cursor-pointer"
            title={isThai ? 'ดูภาพรวมเส้นทางทั้งหมด' : 'Route Overview'}
          >
            <Route className="w-5 h-5" />
          </button>

          {/* Center on Rider GPS & Resume Follow */}
          <button
            type="button"
            onClick={handleResumeNavigation}
            className={`w-11 h-11 rounded-2xl shadow-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isAutoFollow
                ? 'bg-[#2563EB] border-[#60A5FA] text-[#FFFFFF]'
                : 'bg-[#171717] hover:bg-[#262626] border-[#404040] text-[#60A5FA]'
            }`}
            title={isThai ? 'ติดตามตำแหน่งนำทางของฉัน' : 'Follow My GPS'}
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          {/* Zoom Controls */}
          <div className="bg-[#171717] rounded-2xl shadow-xl border border-[#404040] overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => {
                setIsAutoFollow(false);
                mapInstanceRef.current?.zoomIn();
              }}
              className="w-11 h-10 hover:bg-[#262626] active:bg-[#404040] text-[#FFFFFF] flex items-center justify-center border-b border-[#262626] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAutoFollow(false);
                mapInstanceRef.current?.zoomOut();
              }}
              className="w-11 h-10 hover:bg-[#262626] active:bg-[#404040] text-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Google-Maps-Style Navigation ETA & Actions Footer */}
      <footer className="bg-[#171717] border-t border-[#262626] px-3 sm:px-4 py-3 space-y-2.5 shrink-0 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        {/* Collapsible Turn-by-Turn Route Directions */}
        {showStepsDrawer && routeSteps.length > 0 && (
          <div className="max-h-40 overflow-y-auto bg-[#0A0A0A] rounded-2xl border border-[#262626] p-2.5 space-y-1.5 text-xs">
            {routeSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 py-1 border-b border-[#262626] last:border-0"
              >
                <span className="text-[#E5E5E5] font-medium">
                  <span className="text-[#FB923C] font-mono font-bold mr-1.5">{idx + 1}.</span>
                  {step.instruction}
                </span>
                {step.distanceMeters > 0 && (
                  <span className="text-[11px] font-mono text-[#A3A3A3] shrink-0">
                    {formatDistance(step.distanceMeters, isThai)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Prominent ETA / Distance Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="px-2.5 py-1.5 rounded-xl bg-[#064E3B] border border-[#10B981] text-[#6EE7B7] shrink-0 text-center">
              <span className="text-sm sm:text-base font-black block leading-none">
                {routeDurationSeconds !== null ? formatDuration(routeDurationSeconds, isThai) : '...'}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {routeDistanceMeters !== null ? (
                  <span className="text-sm font-black text-[#FFFFFF]">
                    {formatDistance(routeDistanceMeters, isThai)}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#D4D4D4]">
                    {isResolvingDest
                      ? isThai
                        ? 'กำลังค้นหาปลายทาง...'
                        : 'Finding destination...'
                      : isThai
                      ? 'ข้อมูลเส้นทาง'
                      : 'Route Info'}
                  </span>
                )}
                {routeDurationSeconds !== null && (
                  <span className="text-xs text-[#A3A3A3] font-semibold">
                    • {isThai ? 'ถึงประมาณ' : 'ETA'} {formatEtaClock(routeDurationSeconds, isThai)}
                  </span>
                )}
                {isStraightLineFallback && (
                  <span className="text-[10px] text-[#FBBF24] font-semibold">
                    ({isThai ? 'ระยะทางตรง' : 'Direct line'})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A3A3A3] truncate flex items-center gap-1.5">
                {originSource === 'gps' && originAccuracyMeters !== null && (
                  <span className="text-[#60A5FA] font-bold shrink-0">
                    GPS ±{originAccuracyMeters}{isThai ? 'ม.' : 'm'}
                  </span>
                )}
                {destSource && (
                  <span className="text-[#FDBA74] font-bold shrink-0">
                    {destSource === 'customer_gps'
                      ? isThai ? '• หมุดลูกค้า' : '• Customer GPS'
                      : destSource === 'maps_url'
                      ? isThai ? '• จากลิงก์' : '• From Link'
                      : destSource === 'manual'
                      ? isThai ? '• ปักหมุดเอง' : '• Manual Pin'
                      : isThai ? '• ค้นหาจากที่อยู่' : '• Geocoded'}
                  </span>
                )}
                <span className="truncate font-mono">
                  {destPoint
                    ? `${destPoint.lat.toFixed(5)}, ${destPoint.lng.toFixed(5)}`
                    : deliveryAddress}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewFullRoute}
            className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#404040] border border-[#404040] text-[11px] font-bold text-[#FDBA74] shrink-0 cursor-pointer"
          >
            {isThai ? 'ภาพรวม' : 'Overview'}
          </button>
        </div>

        {/* Bottom Action Buttons: Back + Open External Google Maps */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#404040] active:scale-[0.99] border border-[#404040] text-[#FFFFFF] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isThai ? 'ย้อนกลับหน้ารายการ' : 'Back to Orders'}</span>
          </button>

          <a
            href={externalGoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenExternalGoogleMaps}
            className="py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] border border-[#60A5FA] text-[#FFFFFF] font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>{isThai ? 'นำทางผ่าน Google Maps' : 'Open Google Maps'}</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </footer>
    </div>
  );
};
