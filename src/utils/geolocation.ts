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
 * Detects whether the app is running inside an embedded iframe (e.g., preview or webview).
 */
export function isEmbeddedFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Formats actionable Thai/English geolocation error guidance, including iOS Precise Location
 * and iframe permissions-policy detection (avoids falsely claiming permission denied when blocked by frame policy).
 */
export function formatGeolocationError(
  error: Pick<GeolocationPositionError, 'code' | 'message'> | null | undefined,
  isThai: boolean
): string {
  const ios = isIOSDevice();
  const rawMsg = (error?.message || '').toLowerCase();

  if (!error) {
    return isThai
      ? 'ไม่สามารถดึงตำแหน่ง GPS ได้ สามารถพิมพ์ค้นหาชื่อสถานที่บนแผนที่หรือเลื่อนหมุดได้ทันที'
      : 'Unable to retrieve GPS location. You can search your place or drag the pin on the map.';
  }

  // Detect iframe / Permissions-Policy block even if browser GPS permission was already granted
  if (
    rawMsg.includes('permissions policy') ||
    rawMsg.includes('feature policy') ||
    rawMsg.includes('has been disabled in this document') ||
    (error.code === 1 && isEmbeddedFrame())
  ) {
    return isThai
      ? 'หน้าต่างแสดงตัวอย่าง (Preview/Iframe) จำกัดการเข้าถึง GPS กรุณาเปิดลิงก์ในเบราว์เซอร์หลัก (Safari/Chrome) โดยตรง หรือค้นหาชื่อสถานที่/เลื่อนหมุดบนแผนที่ได้เลย'
      : 'This embedded preview window restricts GPS access. Open directly in Safari/Chrome, or search your location / drag the pin on the map.';
  }

  if (error.code === 1) {
    // PERMISSION_DENIED
    if (ios) {
      return isThai
        ? 'ระบบ iOS ยังไม่อนุญาต GPS สำหรับเว็บนี้: ไปที่ การตั้งค่า > ความเป็นส่วนตัวและความปลอดภัย > บริการหาตำแหน่งที่ตั้ง > Safari เลือก "ขณะใช้แอป" และเปิด "ตำแหน่งที่ตั้งจริง (Precise Location)"'
        : 'GPS permission blocked on iOS: Settings > Privacy & Security > Location Services > Safari Websites > Allow with "Precise Location" enabled.';
    }
    return isThai
      ? 'เบราว์เซอร์ยังไม่อนุญาตเข้าถึงตำแหน่งสำหรับหน้าเว็บนี้ กรุณากดอนุญาตตำแหน่งที่รูปกุญแจ/ไอคอนข้างช่อง URL แล้วกด "ลองใหม่"'
      : 'Location access is blocked for this site. Please allow Location in the address bar site settings and tap Retry.';
  }

  if (error.code === 2) {
    // POSITION_UNAVAILABLE
    return isThai
      ? ios
        ? 'สัญญาณ GPS iOS ยังไม่พร้อมใช้งาน (อาจอยู่ในอาคาร) แนะนำให้กด "ลองใหม่" หรือค้นหาชื่อสถานที่บนแผนที่'
        : 'อุปกรณ์ไม่สามารถระบุตำแหน่ง GPS ได้ในขณะนี้ กรุณาลองใหม่หรือค้นหาชื่อสถานที่บนแผนที่'
      : 'GPS position unavailable right now. Please retry or search your address on the map.';
  }

  // TIMEOUT or fallback
  return isThai
    ? ios
      ? 'จับสัญญาณ GPS บน iOS นานเกินกำหนด แนะนำให้ลองใหม่ในที่โล่ง หรือค้นหาชื่อสถานที่บนแผนที่'
      : 'จับสัญญาณ GPS นานเกินกำหนด กรุณากด "ลองใหม่" หรือค้นหาชื่อสถานที่บนแผนที่'
    : 'GPS acquisition timed out. Tap Retry or search your location on the map.';
}

/**
 * Checks navigator.permissions when error.code === 1 so that if the user ALREADY granted
 * geolocation permission, the UI never falsely claims they denied browser permission
 * (instead explaining OS/device Location Services or in-app browser restrictions).
 */
export async function resolveGeolocationErrorMessage(
  error: Pick<GeolocationPositionError, 'code' | 'message'> | null | undefined,
  isThai: boolean
): Promise<string> {
  const baseMsg = formatGeolocationError(error, isThai);
  if (!error || error.code !== 1 || isEmbeddedFrame()) {
    return baseMsg;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const status = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });
      if (status.state === 'granted') {
        const ios = isIOSDevice();
        if (ios) {
          return isThai
            ? 'เบราว์เซอร์ได้รับสิทธิ์ GPS แล้ว แต่ระบบตำแหน่งของเครื่อง (Location Services) ยังไม่ส่งพิกัด กรุณาเปิดบริการหาตำแหน่งที่ตั้งในเครื่อง หรือใช้ช่องค้นหา/เลื่อนหมุดบนแผนที่'
            : 'Browser location permission is already granted, but iOS Location Services is unavailable. Check iOS Settings > Location Services or search your location on the map.';
        }
        return isThai
          ? 'คุณอนุญาต GPS ให้เว็บนี้แล้ว แต่อุปกรณ์/ระบบตำแหน่งยังไม่ส่งพิกัด (อาจปิด GPS ของเครื่องหรือเปิดผ่านเว็บวิว) สามารถพิมพ์ค้นหาชื่อสถานที่หรือเลื่อนหมุดบนแผนที่ได้ทันที'
          : 'GPS permission is already granted, but the device location service did not return a fix. Enable device GPS or search your location on the map.';
      }
    }
  } catch {
    // Ignore Permissions API errors (e.g. unsupported browsers) and fall back to baseMsg
  }

  return baseMsg;
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
  /** If true, fall back to OS/network location (enableHighAccuracy: false) when satellite GPS is slow (>2.2s) or unavailable on desktop/non-iOS */
  allowCoarseFallback?: boolean;
  /** Optional progress callback whenever a better fix arrives */
  onProgress?: (fix: GpsFixResult) => void;
  /** Optional AbortSignal to cancel watchPosition and timers cleanly */
  signal?: AbortSignal;
}

/**
 * iOS-safe high-accuracy GPS acquisition.
 * - Synchronously initiates navigator.geolocation.getCurrentPosition with enableHighAccuracy: true
 *   (W3C equivalent of highAccuracy: true) alongside fresh watchPosition (enableHighAccuracy: true, maximumAge: 0)
 *   to wake CoreLocation immediately on iOS Safari / PWA without breaking user gesture chains.
 * - On iOS (Safari / WKWebView / PWA), avoids calling enableHighAccuracy: false while
 *   watchPosition is warming up, because iOS shares a single CoreLocation manager per tab
 *   and enableHighAccuracy: false downgrades accuracy / returns cell-tower approximations.
 * - Filters stale (>25s old) cached CoreLocation readings and suppresses transient code 2/3 errors
 *   while CoreLocation locks satellites, plus a hard watchdog timer so requests never stay stuck.
 */
export function acquireAccurateGpsFix(options: AcquireGpsOptions = {}): Promise<GpsFixResult> {
  const {
    timeoutMs = 12000,
    refineWindowMs = 3200,
    targetAccuracyMeters = 25,
    allowCoarseFallback = false,
    onProgress,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject({
        code: 3,
        name: 'AbortError',
        message: 'Location request was aborted.',
      });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 2,
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    const ios = isIOSDevice();
    const startedAt = Date.now();
    const effectiveRefineWindowMs = ios ? Math.max(refineWindowMs, 4500) : refineWindowMs;
    const hasGetCurrentPosition = typeof navigator.geolocation.getCurrentPosition === 'function';
    const hasWatchPosition = typeof navigator.geolocation.watchPosition === 'function';

    if (!hasGetCurrentPosition && !hasWatchPosition) {
      reject({
        code: 2,
        message: 'Geolocation API methods are unavailable.',
      });
      return;
    }

    let settled = false;
    let watchId: number | null = null;
    let bestFix: GpsFixResult | null = null;
    let staleFallbackFix: GpsFixResult | null = null;
    let coarseFallbackFix: GpsFixResult | null = null;
    let coarseTriggered = false;
    let refineTimer: ReturnType<typeof setTimeout> | null = null;
    let coarseDelayTimer: ReturnType<typeof setTimeout> | null = null;
    let delayedProgressTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        try {
          if (typeof navigator.geolocation.clearWatch === 'function') {
            navigator.geolocation.clearWatch(watchId);
          }
        } catch {}
        watchId = null;
      }
      if (refineTimer !== null) {
        clearTimeout(refineTimer);
        refineTimer = null;
      }
      if (coarseDelayTimer !== null) {
        clearTimeout(coarseDelayTimer);
        coarseDelayTimer = null;
      }
      if (delayedProgressTimer !== null) {
        clearTimeout(delayedProgressTimer);
        delayedProgressTimer = null;
      }
      if (hardTimer !== null) {
        clearTimeout(hardTimer);
        hardTimer = null;
      }
      if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject({
        code: 3,
        name: 'AbortError',
        message: 'Location request was aborted.',
      });
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    let lastError: GeolocationPositionError | null = null;

    const parsePosition = (pos: GeolocationPosition): GpsFixResult | null => {
      if (!pos || !pos.coords) return null;
      const pt = toLatLng(pos.coords.latitude, pos.coords.longitude);
      if (!pt) return null;

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

      return {
        lat: Number(pt.lat.toFixed(6)),
        lng: Number(pt.lng.toFixed(6)),
        accuracy: Math.round(acc),
        heading,
        speed,
        timestamp: pos.timestamp || Date.now(),
      };
    };

    const isStaleReading = (timestamp: number): boolean => {
      return timestamp > 1_000_000_000_000 && startedAt - timestamp > 25000;
    };

    const finishWithBest = () => {
      if (settled) return;
      settled = true;
      cleanup();
      // Never return coarseFallbackFix on iOS; only bestFix or last-resort staleFallbackFix
      const chosen = bestFix || (!ios ? coarseFallbackFix : null) || staleFallbackFix;
      if (chosen) {
        resolve(chosen);
      } else {
        reject(
          lastError || {
            code: 3,
            message: 'Location request timed out.',
          }
        );
      }
    };

    const handleCandidatePosition = (pos: GeolocationPosition, fromSingleShot: boolean) => {
      if (settled) return;
      const candidate = parsePosition(pos);
      if (!candidate) return;

      // Hold stale (>25s old) cached iOS CoreLocation coordinates aside unless timeout expires with nothing fresh
      if (isStaleReading(candidate.timestamp)) {
        if (!staleFallbackFix || candidate.accuracy <= staleFallbackFix.accuracy) {
          staleFallbackFix = candidate;
        }
        return;
      }

      const isBetter = !bestFix || candidate.accuracy <= bestFix.accuracy;
      if (isBetter) {
        bestFix = candidate;
        if (candidate.accuracy <= 150 || Date.now() - startedAt >= 2500) {
          if (delayedProgressTimer !== null) {
            clearTimeout(delayedProgressTimer);
            delayedProgressTimer = null;
          }
          onProgress?.(candidate);
        } else if (delayedProgressTimer === null) {
          const remaining = Math.max(0, 2500 - (Date.now() - startedAt));
          delayedProgressTimer = setTimeout(() => {
            delayedProgressTimer = null;
            if (!settled && bestFix) {
              onProgress?.(bestFix);
            }
          }, remaining);
        }
      }

      // Resolve immediately once target GPS precision is achieved, or when watchPosition is unavailable
      if (candidate.accuracy <= targetAccuracyMeters || (fromSingleShot && watchId === null)) {
        finishWithBest();
        return;
      }

      // Otherwise allow CoreLocation / GPS chip to refine up to effectiveRefineWindowMs
      if (refineTimer === null) {
        refineTimer = setTimeout(() => {
          finishWithBest();
        }, effectiveRefineWindowMs);
      }
    };

    const triggerCoarseFallback = () => {
      if (
        settled ||
        coarseTriggered ||
        ios ||
        !allowCoarseFallback ||
        bestFix !== null ||
        !hasGetCurrentPosition
      ) {
        return;
      }
      coarseTriggered = true;
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (settled) return;
            const candidate = parsePosition(pos);
            if (!candidate) return;
            if (!coarseFallbackFix || candidate.accuracy <= coarseFallbackFix.accuracy) {
              coarseFallbackFix = candidate;
            }
            if (!bestFix) {
              onProgress?.(candidate);
            }
          },
          (err) => {
            if (!lastError) lastError = err;
            if (err?.code === 1 && !bestFix && !coarseFallbackFix && !staleFallbackFix) {
              settled = true;
              cleanup();
              reject(err);
            }
          },
          {
            enableHighAccuracy: false,
            maximumAge: 15000,
            timeout: Math.min(5000, timeoutMs),
          }
        );
      } catch {}
    };

    hardTimer = setTimeout(() => {
      finishWithBest();
    }, timeoutMs);

    // Secondary watchdog guarantee so a stalled iOS CoreLocation / WKWebView call can never hang forever
    watchdogTimer = setTimeout(() => {
      finishWithBest();
    }, timeoutMs + 500);

    // Only run the 2.2s coarse fallback timer on non-iOS devices (e.g. desktops without GPS hardware).
    // On iOS, keep CoreLocation uninterrupted in high-accuracy mode so satellites can lock cleanly.
    if (allowCoarseFallback && !ios) {
      coarseDelayTimer = setTimeout(() => {
        triggerCoarseFallback();
      }, 2200);
    }

    const highAccuracyOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: timeoutMs,
    };

    // Start watchPosition first so watchId is populated if getCurrentPosition resolves synchronously in mocks/browsers
    if (hasWatchPosition) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            handleCandidatePosition(pos, false);
          },
          (err) => {
            lastError = err;
            // Permission denied won't recover during this call
            if (err?.code === 1 && !bestFix && !coarseFallbackFix && !staleFallbackFix) {
              settled = true;
              cleanup();
              reject(err);
              return;
            }
            // On non-iOS (e.g. desktop PCs without GPS hardware), trigger coarse fallback on code 2.
            // On iOS, code 2/3 can occur transiently while CoreLocation warms up, so keep waiting cleanly.
            if (err?.code === 2 && allowCoarseFallback && !ios && !bestFix) {
              if (coarseFallbackFix) {
                finishWithBest();
              } else {
                triggerCoarseFallback();
              }
            }
          },
          highAccuracyOptions
        );
      } catch (err) {
        if (!lastError) lastError = err as GeolocationPositionError;
        watchId = null;
      }
    }

    // Invoke synchronous high-accuracy getCurrentPosition to wake iOS CoreLocation & trigger OS permission promptly
    if (hasGetCurrentPosition && !settled) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleCandidatePosition(pos, true);
          },
          (err) => {
            if (!lastError) lastError = err;
            if (err?.code === 1 && !bestFix && !coarseFallbackFix && !staleFallbackFix) {
              settled = true;
              cleanup();
              reject(err);
              return;
            }
            // If watchPosition failed to start/is missing and getCurrentPosition errored, trigger coarse (non-iOS) or fail cleanly
            if (watchId === null && !settled) {
              if (allowCoarseFallback && !ios && err?.code === 2) {
                triggerCoarseFallback();
              } else {
                finishWithBest();
              }
            }
          },
          highAccuracyOptions
        );
      } catch (err) {
        if (!lastError) lastError = err as GeolocationPositionError;
        if (watchId === null && !settled) {
          finishWithBest();
        }
      }
    }
  });
}

/**
 * Detects whether the app is running as an installed Home Screen / standalone PWA.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const iosStandalone = Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    );
    const displayStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    return iosStandalone || displayStandalone;
  } catch {
    return false;
  }
}

/**
 * Builds a universal cross-platform Google Maps URL (iOS & Android) that opens Google Maps
 * directly in turn-by-turn driving navigation mode (&dir_action=navigate) using the device's live GPS as origin.
 */
export function buildGoogleMapsNavigationUrl(params: {
  latitude?: unknown;
  longitude?: unknown;
  mapsUrl?: string;
  address?: string;
}): string {
  const coords =
    toLatLng(params.latitude, params.longitude) ||
    extractCoordsFromMapsUrl(params.mapsUrl);

  const cleanedAddress = (params.address || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const destination = coords
    ? `${coords.lat},${coords.lng}`
    : encodeURIComponent(cleanedAddress || 'Bangkok, Thailand');

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving&dir_action=navigate`;
}

/**
 * On iOS Home Screen standalone PWAs (outside iframes), target="_blank" opens SFSafariViewController
 * instead of handing off Universal Links straight to the Google Maps app. Top-level assign lets iOS
 * launch the Google Maps app directly in turn-by-turn navigation mode.
 */
export function shouldUseTopLevelMapsHandoff(): boolean {
  return isIOSDevice() && isStandalonePwa() && !isEmbeddedFrame();
}



