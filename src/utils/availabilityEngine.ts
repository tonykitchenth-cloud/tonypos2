import { AvailabilityStatus, DailySchedule, MenuItem, ModifierOption, SpecialHoliday, StoreAvailabilityResult, StoreSettings } from '../types';

/**
 * Helper to get current Date & Time in Asia/Bangkok timezone
 */
export function getBangkokDate(customDate?: Date): Date {
  const now = customDate || new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  // Bangkok is UTC+7
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  return new Date(utcTime + bangkokOffsetMs);
}

export function normalizeHolidayDateStr(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr.slice(0, 10);
}

export function toBangkokDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determines whether a SpecialHoliday event has expired.
 * Strict Rule:
 * An event is expired ONLY IF currentDate > endDate (where comparison is YYYY-MM-DD in Bangkok timezone).
 * If currentDate === endDate -> NOT expired (holiday is still active today).
 * If currentDate < startDate or currentDate <= endDate -> NOT expired (upcoming or currently active).
 */
export function isHolidayExpired(holiday: SpecialHoliday, testDate?: Date): boolean {
  if (!holiday) return false;
  const bkkDate = getBangkokDate(testDate);
  const todayDateStr = toBangkokDateString(bkkDate);

  const rawEnd = holiday.endDate || holiday.startDate;
  const endStr = normalizeHolidayDateStr(rawEnd);

  // If no parseable end date, do not assume expired
  if (!endStr || endStr.length < 10) return false;

  // Expired only if today is strictly after the end date
  return todayDateStr > endStr;
}

/**
 * Cleans out any expired SpecialHoliday events from an array.
 * Preserves all active and upcoming holiday events.
 */
export function cleanExpiredHolidays(holidays: SpecialHoliday[], testDate?: Date): SpecialHoliday[] {
  if (!Array.isArray(holidays)) return [];
  return holidays.filter(h => !isHolidayExpired(h, testDate));
}

/**
 * Converts "HH:mm" to total minutes from midnight (e.g. "10:30" => 630)
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_TH = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

/**
 * Comprehensive Store Availability calculation with strict priority:
 * 1. Emergency Close
 * 2. Special Holiday / Special Closure
 * 3. Weekly Closure (e.g. Tuesday)
 * 4. Daily Operating Hours (e.g. 10:00 - 21:00)
 */
export function checkStoreAvailability(settings: StoreSettings, testDate?: Date): StoreAvailabilityResult {
  const bkkDate = getBangkokDate(testDate);
  const currentDayOfWeek = bkkDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const currentMinutes = bkkDate.getHours() * 60 + bkkDate.getMinutes();
  const todayDateStr = toBangkokDateString(bkkDate);

  // 1. PRIORITY 1: Emergency Close
  if (settings.emergencyClose && settings.emergencyClose.enabled) {
    return {
      isOpen: false,
      reasonEn: settings.emergencyClose.reasonEn || "We are temporarily closed due to an emergency or private event.",
      reasonTh: settings.emergencyClose.reasonTh || "ทางร้านขออภัยในความไม่สะดวก ขณะนี้ปิดบริการชั่วคราวกรณีพิเศษ",
      closedType: 'emergency',
      nextOpenFormatted: {
        en: "To be announced",
        th: "รอประกาศเวลาเปิดให้บริการอีกครั้ง",
      },
    };
  }

  // 2. PRIORITY 2: Special Holiday / Closure (Inclusive date range)
  if (settings.specialHolidays && settings.specialHolidays.length > 0) {
    for (const holiday of settings.specialHolidays) {
      if (holiday.enabled && (holiday.startDate || holiday.endDate)) {
        const startStr = normalizeHolidayDateStr(holiday.startDate || holiday.endDate);
        const endStr = normalizeHolidayDateStr(holiday.endDate || holiday.startDate);

        if (startStr && endStr && todayDateStr >= startStr && todayDateStr <= endStr) {
          const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
          const dayAfter = new Date(endYear, endMonth - 1, endDay + 1);
          const nextDayOfWeek = dayAfter.getDay();
          const nextDaySched = settings.schedule.find(s => s.dayOfWeek === nextDayOfWeek);

          let nextOpenEn: string;
          let nextOpenTh: string;

          if (nextDaySched && nextDaySched.isOpen) {
            nextOpenEn = `${DAY_NAMES_EN[nextDayOfWeek]} at ${nextDaySched.openTime}`;
            nextOpenTh = `${DAY_NAMES_TH[nextDayOfWeek]} เวลา ${nextDaySched.openTime} น.`;
          } else {
            const nextResult = findNextOpeningTime(settings.schedule, nextDayOfWeek, dayAfter);
            nextOpenEn = nextResult.en;
            nextOpenTh = nextResult.th;
          }

          return {
            isOpen: false,
            reasonEn: `Holiday: ${holiday.name}`,
            reasonTh: `วันหยุด: ${holiday.name}`,
            closedType: 'holiday',
            nextOpenFormatted: {
              en: nextOpenEn,
              th: nextOpenTh,
            },
          };
        }
      }
    }
  }

  // Find schedule for today
  const todaySchedule = settings.schedule.find(s => s.dayOfWeek === currentDayOfWeek);

  // 3. PRIORITY 3: Weekly Closure (e.g. Tuesday closed)
  if (!todaySchedule || !todaySchedule.isOpen) {
    const nextOpen = findNextOpeningTime(settings.schedule, currentDayOfWeek, bkkDate);
    return {
      isOpen: false,
      reasonEn: "Closed today (Weekly scheduled closure)",
      reasonTh: "วันนี้ร้านปิดทำการ (วันหยุดประจำสัปดาห์)",
      closedType: 'weekly',
      nextOpenFormatted: nextOpen,
    };
  }

  // 4. PRIORITY 4: Daily Operating Hours (e.g. 10:00 - 21:00)
  const openMinutes = timeToMinutes(todaySchedule.openTime);
  const closeMinutes = timeToMinutes(todaySchedule.closeTime);

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      reasonEn: `Opens today at ${todaySchedule.openTime}`,
      reasonTh: `เปิดบริการวันนี้เวลา ${todaySchedule.openTime} น.`,
      closedType: 'hours',
      nextOpenFormatted: {
        en: `Today at ${todaySchedule.openTime}`,
        th: `วันนี้ เวลา ${todaySchedule.openTime} น.`,
      },
    };
  }

  if (currentMinutes >= closeMinutes) {
    const nextOpen = findNextOpeningTime(settings.schedule, currentDayOfWeek, bkkDate);
    return {
      isOpen: false,
      reasonEn: `Closed for the day (Operating hours: ${todaySchedule.openTime} - ${todaySchedule.closeTime})`,
      reasonTh: `ปิดบริการสำหรับวันนี้แล้ว (เวลาเปิดทำการ: ${todaySchedule.openTime} - ${todaySchedule.closeTime} น.)`,
      closedType: 'hours',
      nextOpenFormatted: nextOpen,
    };
  }

  // If all passes, the store is OPEN
  return {
    isOpen: true,
    reasonEn: `Open now until ${todaySchedule.closeTime}`,
    reasonTh: `เปิดให้บริการถึงเวลา ${todaySchedule.closeTime} น.`,
  };
}

/**
 * Calculates the next opening time across the weekly schedule
 */
function findNextOpeningTime(
  schedule: DailySchedule[],
  currentDayOfWeek: number,
  bkkDate: Date
): { en: string; th: string } {
  // Check next 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayOfWeek = (currentDayOfWeek + offset) % 7;
    const daySched = schedule.find(s => s.dayOfWeek === nextDayOfWeek);
    if (daySched && daySched.isOpen) {
      if (offset === 1) {
        return {
          en: `Tomorrow (${DAY_NAMES_EN[nextDayOfWeek]}) at ${daySched.openTime}`,
          th: `วันพรุ่งนี้ (${DAY_NAMES_TH[nextDayOfWeek]}) เวลา ${daySched.openTime} น.`,
        };
      }
      return {
        en: `${DAY_NAMES_EN[nextDayOfWeek]} at ${daySched.openTime}`,
        th: `${DAY_NAMES_TH[nextDayOfWeek]} เวลา ${daySched.openTime} น.`,
      };
    }
  }

  return {
    en: "Scheduled opening time",
    th: "ตามเวลาทำการปกติ",
  };
}

/**
 * Checks availability of a specific menu item
 */
export function isMenuItemAvailable(item: MenuItem, testDate?: Date): { isAvailable: boolean; status: AvailabilityStatus } {
  if (item.availability === 'hidden') {
    return { isAvailable: false, status: 'hidden' };
  }
  if (item.availability === 'out_indefinitely') {
    return { isAvailable: false, status: 'out_indefinitely' };
  }
  if (item.availability === 'out_today') {
    return { isAvailable: false, status: 'out_today' };
  }
  if (item.availability === 'out_until_date' && item.outUntilDate) {
    const bkkDate = getBangkokDate(testDate);
    const until = new Date(item.outUntilDate).getTime();
    if (bkkDate.getTime() < until) {
      return { isAvailable: false, status: 'out_until_date' };
    }
  }
  return { isAvailable: true, status: 'available' };
}

/**
 * Checks availability of a modifier option
 */
export function isModifierOptionAvailable(option: ModifierOption, testDate?: Date): { isAvailable: boolean; status: AvailabilityStatus } {
  if (option.availability === 'hidden') {
    return { isAvailable: false, status: 'hidden' };
  }
  if (option.availability === 'out_indefinitely') {
    return { isAvailable: false, status: 'out_indefinitely' };
  }
  if (option.availability === 'out_today') {
    return { isAvailable: false, status: 'out_today' };
  }
  if (option.availability === 'out_until_date' && option.outUntilDate) {
    const bkkDate = getBangkokDate(testDate);
    const until = new Date(option.outUntilDate).getTime();
    if (bkkDate.getTime() < until) {
      return { isAvailable: false, status: 'out_until_date' };
    }
  }
  return { isAvailable: true, status: 'available' };
}
