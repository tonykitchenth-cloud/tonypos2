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
  /** If true, fall back to OS/network location (enableHighAccuracy: false) when satellite GPS is slow (>2.2s) or unavailable indoors/desktop */
  allowCoarseFallback?: boolean;
  /** Optional progress callback whenever a better fix arrives */
  onProgress?: (fix: GpsFixResult) => void;
}

/**
 * iOS-safe high-accuracy GPS acquisition.
 * Prioritizes fresh satellite watchPosition (enableHighAccuracy: true, maximumAge: 0) first
 * to avoid stale OS cache collisions; if allowCoarseFallback is enabled and satellite GPS
 * hasn't responded within 2.2s (or reports POSITION_UNAVAILABLE indoors/desktop), triggers a
 * network/Wi-Fi getCurrentPosition fallback without cutting off satellite refinement.
 */
export function acquireAccurateGpsFix(options: AcquireGpsOptions = {}): Promise<GpsFixResult> {
  const {
    timeoutMs = 12000,
    refineWindowMs = 3200,
    targetAccuracyMeters = 25,
    allowCoarseFallback = false,
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
    let coarseFallbackFix: GpsFixResult | null = null;
    let coarseTriggered = false;
    let refineTimer: ReturnType<typeof setTimeout> | null = null;
    let coarseDelayTimer: ReturnType<typeof setTimeout> | null = null;
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
      if (coarseDelayTimer !== null) {
        clearTimeout(coarseDelayTimer);
        coarseDelayTimer = null;
      }
      if (hardTimer !== null) {
        clearTimeout(hardTimer);
        hardTimer = null;
      }
    };

    const parsePosition = (pos: GeolocationPosition): GpsFixResult | null => {
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

    const finishWithBest = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const chosen = bestFix || coarseFallbackFix;
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

    const triggerCoarseFallback = () => {
      if (
        settled ||
        coarseTriggered ||
        !allowCoarseFallback ||
        bestFix !== null ||
        typeof navigator.geolocation.getCurrentPosition !== 'function'
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
            if (err.code === 1 && !bestFix && !coarseFallbackFix) {
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

    if (allowCoarseFallback) {
      // Wait 2.2s for real high-accuracy GPS before requesting network/OS fallback
      coarseDelayTimer = setTimeout(() => {
        triggerCoarseFallback();
      }, 2200);
    }

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (settled) return;
          const candidate = parsePosition(pos);
          if (!candidate) return;

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
          if (err.code === 1 && !bestFix && !coarseFallbackFix) {
            settled = true;
            cleanup();
            reject(err);
            return;
          }
          // If hardware high-accuracy is unavailable, try coarse fallback immediately if allowed
          if (err.code === 2 && allowCoarseFallback && !bestFix) {
            if (coarseFallbackFix) {
              finishWithBest();
            } else {
              triggerCoarseFallback();
            }
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
      if (coarseFallbackFix) {
        settled = true;
        resolve(coarseFallbackFix);
      } else {
        reject(err);
      }
    }
  });
}


