export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GpsFixResult {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

/**
 * Validates that latitude/longitude are finite geographic coordinates and not (0, 0).
 */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  const nLat = typeof lat === 'string' ? Number(lat) : lat;
  const nLng = typeof lng === 'string' ? Number(lng) : lng;
  if (typeof nLat !== 'number' || typeof nLng !== 'number') return false;
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (Math.abs(nLat) > 90 || Math.abs(nLng) > 180) return false;
  // Exclude Null Island (0, 0) often caused by uninitialized defaults
  if (Math.abs(nLat) < 0.0001 && Math.abs(nLng) < 0.0001) return false;
  return true;
}

/**
 * Safely coerces unknown lat/lng values into a valid LatLngPoint or null.
 */
export function toLatLng(lat: unknown, lng: unknown): LatLngPoint | null {
  const nLat = typeof lat === 'string' ? Number(lat) : lat;
  const nLng = typeof lng === 'string' ? Number(lng) : lng;
  if (!isValidLatLng(nLat, nLng)) return null;
  return { lat: nLat as number, lng: nLng as number };
}

/**
 * Detects iOS / iPadOS browsers & standalone PWAs.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Parses coordinates from Google Maps, Apple Maps, and URL-encoded map links.
 */
export function extractCoordsFromMapsUrl(mapsUrl?: string): LatLngPoint | null {
  if (!mapsUrl || typeof mapsUrl !== 'string') return null;

  let decoded = mapsUrl;
  try {
    decoded = decodeURIComponent(mapsUrl);
  } catch {
    decoded = mapsUrl;
  }

  const patterns: RegExp[] = [
    // Google Maps embed format: !3d13.7563!4d100.5018
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    // Google Maps / Apple Maps query parameters: query=, q=, q=loc:, destination=, ll=, sll=, daddr=, center=
    /(?:[?&#](?:query|q|destination|ll|sll|daddr|center)=)(?:loc:)?\s*(-?\d+(?:\.\d+)?)\s*,\s*\+?(-?\d+(?:\.\d+)?)/i,
    // @lat,lng or /place/lat,lng or /search/lat,lng
    /(?:@|\/place\/|\/search\/)\s*(-?\d+(?:\.\d+)?)\s*,\s*\+?(-?\d+(?:\.\d+)?)/i,
  ];

  for (const regex of patterns) {
    const match = decoded.match(regex);
    if (match) {
      const point = toLatLng(Number(match[1]), Number(match[2]));
      if (point) return point;
    }
  }

  return null;
}

/**
 * Formats actionable Thai/English geolocation error guidance, including iOS Precise Location hints.
 */
export function formatGeolocationError(
  error: Pick<GeolocationPositionError, 'code' | 'message'> | null | undefined,
  isThai: boolean
): string {
  const ios = isIOSDevice();
  if (!error) {
    return isThai
      ? 'ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิดบริการตำแหน่งที่ตั้ง'
      : 'Unable to retrieve GPS location. Please enable location services.';
  }

  if (error.code === 1) {
    // PERMISSION_DENIED
    if (ios) {
      return isThai
        ? 'ไม่ได้รับสิทธิ์ GPS บน iOS: ไปที่ การตั้งค่า (Settings) > ความเป็นส่วนตัวและความปลอดภัย > บริการหาตำแหน่งที่ตั้ง > เว็บไซต์ Safari (หรือแอป) เลือก "ขณะใช้แอป" และเปิด "ตำแหน่งที่ตั้งจริง (Precise Location)"'
        : 'GPS permission denied on iOS: Open Settings > Privacy & Security > Location Services > Safari Websites and allow location with "Precise Location" enabled.';
    }
    return isThai
      ? 'ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง GPS กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์'
      : 'Location permission denied. Please allow location access in your browser.';
  }

  if (error.code === 2) {
    // POSITION_UNAVAILABLE
    return isThai
      ? ios
        ? 'สัญญาณ GPS iOS ไม่พร้อมใช้งาน กรุณาเปิด "ตำแหน่งที่ตั้งจริง (Precise Location)" หรือย้ายไปยังจุดที่รับสัญญาณได้ดี'
        : 'GPS signal unavailable. Please check device Location Services.'
      : 'GPS position unavailable. Please check your device Location Services.';
  }

  // TIMEOUT or fallback
  return isThai
    ? ios
      ? 'จับสัญญาณ GPS บน iOS นานเกินกำหนด กรุณาตรวจสอบว่าเปิด "ตำแหน่งที่ตั้งจริง (Precise Location)" แล้วกดลองจับ GPS ใหม่'
      : 'GPS signal timed out. Please move to an open area and tap retry.'
    : 'GPS acquisition timed out. Please tap retry.';
}

/**
 * Filters continuous GPS updates (e.g. Rider navigation watchPosition) so coarse Wi-Fi / cell-tower
 * spikes on iOS never overwrite an accurate recent GPS fix.
 */
export function shouldAcceptGpsUpdate(
  current: { accuracy: number; timestamp: number } | null,
  next: { accuracy: number; timestamp: number }
): boolean {
  if (!Number.isFinite(next.accuracy) || next.accuracy <= 0) {
    return current === null;
  }

  if (!current) {
    return true;
  }

  const ageMs = Math.max(0, next.timestamp - current.timestamp);

  // Always accept if new fix is better or nearly as accurate
  if (next.accuracy <= Math.max(45, current.accuracy * 1.4)) {
    return true;
  }

  // Reject huge cell-tower jumps (> 300m) while we still have a fresh (< 20s) accurate (< 100m) fix
  if (current.accuracy <= 100 && next.accuracy > 300 && ageMs < 20000) {
    return false;
  }

  // Reject absurd > 2000m IP/cell fallback if any previous reasonable fix exists within 45s
  if (current.accuracy <= 500 && next.accuracy > 2000 && ageMs < 45000) {
    return false;
  }

  // If existing fix is stale (> 20s) and new fix is usable (<= 400m), allow refresh
  if (ageMs >= 20000 && next.accuracy <= 400) {
    return true;
  }

  return false;
}

export interface AcquireGpsOptions {
  /** Maximum total wait time before returning best fix or failing (ms) */
  timeoutMs?: number;
  /** How long to continue refining via watchPosition after first coarse fix on iOS (ms) */
  refineWindowMs?: number;
  /** Stop immediately once accuracy reaches this threshold (meters) */
  targetAccuracyMeters?: number;
  /** Optional progress callback whenever a better fix arrives */
  onProgress?: (fix: GpsFixResult) => void;
}

/**
 * iOS-safe high-accuracy GPS acquisition.
 * Unlike a single getCurrentPosition() call (which on iOS Safari often immediately resolves with a
 * 500m-3000m Wi-Fi/cell estimate), this uses watchPosition with maximumAge: 0 and refines briefly
 * to pick the highest-accuracy satellite fix.
 */
export function acquireAccurateGpsFix(options: AcquireGpsOptions = {}): Promise<GpsFixResult> {
  const {
    timeoutMs = 12000,
    refineWindowMs = 3200,
    targetAccuracyMeters = 25,
    onProgress,
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 2,
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    let settled = false;
    let watchId: number | null = null;
    let bestFix: GpsFixResult | null = null;
    let refineTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let lastError: GeolocationPositionError | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {}
        watchId = null;
      }
      if (refineTimer !== null) {
        clearTimeout(refineTimer);
        refineTimer = null;
      }
      if (hardTimer !== null) {
        clearTimeout(hardTimer);
        hardTimer = null;
      }
    };

    const finishWithBest = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (bestFix) {
        resolve(bestFix);
      } else {
        reject(
          lastError || {
            code: 3,
            message: 'Location request timed out.',
          }
        );
      }
    };

    hardTimer = setTimeout(() => {
      finishWithBest();
    }, timeoutMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (settled) return;
          const pt = toLatLng(pos.coords.latitude, pos.coords.longitude);
          if (!pt) return;

          const acc =
            typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
              ? pos.coords.accuracy
              : 9999;

          const heading =
            typeof pos.coords.heading === 'number' &&
            Number.isFinite(pos.coords.heading) &&
            pos.coords.heading >= 0 &&
            pos.coords.heading <= 360
              ? pos.coords.heading
              : null;

          const speed =
            typeof pos.coords.speed === 'number' &&
            Number.isFinite(pos.coords.speed) &&
            pos.coords.speed >= 0
              ? pos.coords.speed
              : null;

          const candidate: GpsFixResult = {
            lat: Number(pt.lat.toFixed(6)),
            lng: Number(pt.lng.toFixed(6)),
            accuracy: Math.round(acc),
            heading,
            speed,
            timestamp: pos.timestamp || Date.now(),
          };

          const isBetter = !bestFix || candidate.accuracy <= bestFix.accuracy;
          if (isBetter) {
            bestFix = candidate;
            onProgress?.(candidate);
          }

          // If we achieved target GPS precision, resolve immediately!
          if (candidate.accuracy <= targetAccuracyMeters) {
            finishWithBest();
            return;
          }

          // Otherwise start a short refinement window to let iOS GPS chip warm up
          if (refineTimer === null) {
            refineTimer = setTimeout(() => {
              finishWithBest();
            }, refineWindowMs);
          }
        },
        (err) => {
          lastError = err;
          // Permission denied won't recover during this call
          if (err.code === 1 && !bestFix) {
            settled = true;
            cleanup();
            reject(err);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: timeoutMs,
        }
      );
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}
