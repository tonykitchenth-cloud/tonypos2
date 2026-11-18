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
  maneuverType: string;
  modifier: string;
  location?: LatLngPoint;
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

async function geocodeAddress(query: string, signal?: AbortSignal): Promise<LatLngPoint | null> {
  const cleaned = query.trim();
  if (!cleaned) return null;

  const candidates: string[] = [cleaned];

  const withoutHouseNo = cleaned
    .replace(/^[\d/\-]+\s*(หมู่\s*\d+|ม\.\s*\d+)?\s*/i, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutHouseNo && withoutHouseNo !== cleaned) {
    candidates.push(withoutHouseNo);
  }

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

// Google-Maps-style directional navigation arrow marker for live GPS navigation
function createNavigationArrowIcon(headingDeg: number, isThai: boolean): L.DivIcon {
  const safeHeading = Number.isFinite(headingDeg) ? headingDeg : 0;
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
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSpokenStepRef = useRef<string>('');
  const hasAutoZoomedNavRef = useRef<boolean>(false);

  const [originPoint, setOriginPoint] = useState<LatLngPoint | null>(null);
  const [originSource, setOriginSource] = useState<'gps' | 'store' | 'default'>('default');
  const originSourceRef = useRef<'gps' | 'store' | 'default'>('default');
  const [riderHeading, setRiderHeading] = useState<number>(0);
  const [destPoint, setDestPoint] = useState<LatLngPoint | null>(null);

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
    lastSpokenStepRef.current = '';

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
        zoom: 16,
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
    setRouteCoords([]);
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

  // 3. Track Rider Live GPS + Heading continuously (with fallback to Store Address or Bangkok Center)
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setOriginPoint(DEFAULT_BANGKOK_CENTER);
    originSourceRef.current = 'default';
    setOriginSource('default');

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
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOriginPoint(pt);
          setOriginSource('gps');
          if (typeof pos.coords.heading === 'number' && Number.isFinite(pos.coords.heading)) {
            setRiderHeading(pos.coords.heading);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          originSourceRef.current = 'gps';
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOriginPoint(pt);
          setOriginSource('gps');
          if (typeof pos.coords.heading === 'number' && Number.isFinite(pos.coords.heading)) {
            setRiderHeading(pos.coords.heading);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
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

  // 4. Update Markers & Follow Rider Camera in Live Navigation Mode
  useEffect(() => {
    if (!isOpen || !isMapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Compute heading toward next route point if GPS heading wasn't supplied
    let computedBearing = riderHeading;
    if (originPoint && (!computedBearing || computedBearing === 0)) {
      if (routeCoords.length > 1) {
        const target = routeCoords[Math.min(2, routeCoords.length - 1)];
        computedBearing = calculateBearingDegrees(originPoint, { lat: target[0], lng: target[1] });
      } else if (destPoint) {
        computedBearing = calculateBearingDegrees(originPoint, destPoint);
      }
    }

    if (originPoint) {
      const arrowIcon = createNavigationArrowIcon(computedBearing, isThai);
      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([originPoint.lat, originPoint.lng]);
        originMarkerRef.current.setIcon(arrowIcon);
      } else {
        originMarkerRef.current = L.marker([originPoint.lat, originPoint.lng], {
          icon: arrowIcon,
          zIndexOffset: 700,
        }).addTo(map);
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
    if (isNavigating && isAutoFollow && originPoint && originSource === 'gps') {
      const targetZoom = hasAutoZoomedNavRef.current ? Math.max(map.getZoom(), 16.5) : 17;
      hasAutoZoomedNavRef.current = true;
      map.setView([originPoint.lat, originPoint.lng], targetZoom, { animate: true });
    }
  }, [isOpen, isMapReady, originPoint, originSource, destPoint, riderHeading, routeCoords, isNavigating, isAutoFollow, isThai]);

  // 5. Fetch & Draw OSRM Driving Route whenever Origin or Destination updates
  useEffect(() => {
    if (!isOpen || !isMapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!originPoint || !destPoint) {
      if (originPoint && !destPoint) {
        map.setView([originPoint.lat, originPoint.lng], 15);
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
        if (isNavigating && isAutoFollow && originSourceRef.current === 'gps') {
          hasAutoZoomedNavRef.current = true;
          map.setView([originPoint.lat, originPoint.lng], 17, { animate: true });
        } else if (!hasAutoZoomedNavRef.current) {
          fitMapToRoute(originPoint, destPoint, coords);
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
          if (!(isNavigating && isAutoFollow && originSourceRef.current === 'gps')) {
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
    const found = await geocodeAddress(manualSearchText);
    setIsResolvingDest(false);
    if (found) {
      setDestPoint(found);
      setGeocodeFailed(false);
    } else {
      setGeocodeFailed(true);
    }
  };

  // Snap back to live Google-Maps-style Navigation Follow mode
  const handleResumeNavigation = () => {
    setIsNavigating(true);
    setIsAutoFollow(true);
    if (originPoint && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([originPoint.lat, originPoint.lng], 17, { duration: 0.7 });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          originSourceRef.current = 'gps';
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOriginPoint(pt);
          setOriginSource('gps');
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([pt.lat, pt.lng], 17, { duration: 0.7 });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleViewFullRoute = () => {
    setIsAutoFollow(false);
    fitMapToRoute(originPoint, destPoint);
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
      {/* 1. Compact Header with Prominent Back Button + Order + Call */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            id="btn-rider-map-back"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 border border-neutral-700 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{isThai ? 'ย้อนกลับ' : 'Back'}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-xs sm:text-sm text-orange-400">
                {order.orderNumberFormatted}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {order.customer?.name || 'Customer'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
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
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title={isThai ? 'เปิด/ปิดเสียงนำทาง' : 'Toggle voice guidance'}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {order.customer?.phone && order.customer.phone !== '-' && (
            <a
              href={`tel:${order.customer.phone}`}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
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
              ? 'bg-gradient-to-r from-orange-600 to-amber-600'
              : 'bg-gradient-to-r from-emerald-700 to-emerald-600'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-black/25 border border-white/20 flex items-center justify-center shrink-0">
              {renderManeuverIcon(activeNavStep.maneuverType, activeNavStep.modifier)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!activeNavStep.arrived && activeNavStep.distanceMeters > 0 && (
                  <span className="text-base sm:text-lg font-black text-white leading-none">
                    {formatDistance(activeNavStep.distanceMeters, isThai)}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-emerald-100">
                  {activeNavStep.arrived
                    ? isThai
                      ? 'ถึงแล้ว'
                      : 'Arrived'
                    : isThai
                    ? 'กำลังนำทางอัตโนมัติ'
                    : 'Auto Navigating'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5 line-clamp-2 leading-snug">
                {activeNavStep.instruction}
              </p>
            </div>
          </div>

          {routeSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStepsDrawer((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl bg-black/25 hover:bg-black/35 border border-white/20 text-[11px] font-black text-white flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{isThai ? 'เส้นทาง' : 'Steps'}</span>
              {showStepsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {/* 3. Fullscreen Auto-Sized Map Container */}
      <div className="relative flex-1 w-full min-h-0 bg-neutral-900 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status / Geocode Overlay */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {(isResolvingDest || isRouting) && (
            <div className="bg-neutral-900/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-orange-500/40 shadow-xl flex items-center gap-2 text-xs font-bold text-orange-300 pointer-events-auto">
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
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

          {/* Origin hint if GPS not yet granted */}
          {!isResolvingDest && !isRouting && destPoint && originSource !== 'gps' && (
            <div className="bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 shadow-lg text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5 pointer-events-auto">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                {originSource === 'store'
                  ? isThai
                    ? 'นำทางจากตำแหน่งร้าน (เปิด GPS มือถือเพื่อนำทางตามตำแหน่งจริง)'
                    : 'Routing from store (enable GPS for live turn-by-turn tracking)'
                  : isThai
                  ? 'แสดงเส้นทางนำทางเบื้องต้น (เปิด GPS เพื่อนำทางตามตำแหน่งจริง)'
                  : 'Preview navigation route (enable GPS for live tracking)'}
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

        {/* Floating "Recenter / กลับสู่การนำทาง" Button when rider drags or zooms out */}
        {!isAutoFollow && (
          <div className="absolute left-3 bottom-3 z-20">
            <button
              type="button"
              id="btn-rider-recenter-nav"
              onClick={handleResumeNavigation}
              className="px-3.5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs shadow-2xl border border-white/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>{isThai ? 'กลับสู่การนำทาง' : 'Recenter'}</span>
            </button>
          </div>
        )}

        {/* Floating Map Controls (Bottom Right) */}
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
          {/* Overview / Fit Entire Route */}
          <button
            type="button"
            onClick={handleViewFullRoute}
            className="w-11 h-11 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800 active:scale-95 text-orange-400 shadow-xl border border-neutral-700 flex items-center justify-center transition-all cursor-pointer"
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
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-neutral-900/95 hover:bg-neutral-800 border-neutral-700 text-blue-400'
            }`}
            title={isThai ? 'ติดตามตำแหน่งนำทางของฉัน' : 'Follow My GPS'}
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          {/* Zoom Controls */}
          <div className="bg-neutral-900/95 rounded-2xl shadow-xl border border-neutral-700 overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => {
                setIsAutoFollow(false);
                mapInstanceRef.current?.zoomIn();
              }}
              className="w-11 h-10 hover:bg-neutral-800 active:bg-neutral-700 text-white flex items-center justify-center border-b border-neutral-800 transition-colors cursor-pointer"
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
              className="w-11 h-10 hover:bg-neutral-800 active:bg-neutral-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Google-Maps-Style Navigation ETA & Actions Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 px-3 sm:px-4 py-3 space-y-2.5 shrink-0 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        {/* Collapsible Turn-by-Turn Route Directions */}
        {showStepsDrawer && routeSteps.length > 0 && (
          <div className="max-h-40 overflow-y-auto bg-neutral-950 rounded-2xl border border-neutral-800 p-2.5 space-y-1.5 text-xs">
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

        {/* Prominent ETA / Distance Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 shrink-0 text-center">
              <span className="text-sm sm:text-base font-black block leading-none">
                {routeDurationSeconds !== null ? formatDuration(routeDurationSeconds, isThai) : '...'}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {routeDistanceMeters !== null ? (
                  <span className="text-sm font-black text-white">
                    {formatDistance(routeDistanceMeters, isThai)}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-neutral-300">
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
                  <span className="text-xs text-neutral-400 font-semibold">
                    • {isThai ? 'ถึงประมาณ' : 'ETA'} {formatEtaClock(routeDurationSeconds, isThai)}
                  </span>
                )}
                {isStraightLineFallback && (
                  <span className="text-[10px] text-amber-400 font-semibold">
                    ({isThai ? 'ระยะทางตรง' : 'Direct line'})
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

          <button
            type="button"
            onClick={handleViewFullRoute}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-bold text-orange-300 shrink-0 cursor-pointer"
          >
            {isThai ? 'ภาพรวม' : 'Overview'}
          </button>
        </div>

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
            <span>{isThai ? 'นำทางผ่าน Google Maps' : 'Open Google Maps'}</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>
      </footer>
    </div>
  );
};
