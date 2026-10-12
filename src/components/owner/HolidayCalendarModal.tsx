import React, { useState, useEffect, useMemo } from 'react';
import { SpecialHoliday } from '../../types';
import { normalizeHolidayDateStr } from '../../utils/availabilityEngine';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle, Check, Sparkles } from 'lucide-react';

interface HolidayCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  holiday: SpecialHoliday | null;
  isAdding: boolean;
  onSave: (holiday: SpecialHoliday) => void;
  language: 'en' | 'th';
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_NAMES_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const HolidayCalendarModal: React.FC<HolidayCalendarModalProps> = ({
  isOpen,
  onClose,
  holiday,
  isAdding,
  onSave,
  language,
}) => {
  const todayYMD = useMemo(() => formatDateToYMD(new Date()), []);

  const [name, setName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayYMD);
  const [endDate, setEndDate] = useState<string>(todayYMD);
  const [enabled, setEnabled] = useState<boolean>(true);

  // Active view year and month for the interactive calendar
  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed
  const [activePickerTarget, setActivePickerTarget] = useState<'start' | 'end'>('start');

  // Hydrate when modal opens or holiday changes
  useEffect(() => {
    if (holiday) {
      setName(holiday.name || '');
      const s = normalizeHolidayDateStr(holiday.startDate) || todayYMD;
      const e = normalizeHolidayDateStr(holiday.endDate || holiday.startDate) || s;
      setStartDate(s);
      setEndDate(e);
      setEnabled(holiday.enabled !== false);

      // Set calendar view to the start date
      if (s) {
        const [y, m] = s.split('-').map(Number);
        if (y && m) {
          setViewYear(y);
          setViewMonth(m - 1);
        }
      }
    } else {
      setName('');
      setStartDate(todayYMD);
      setEndDate(todayYMD);
      setEnabled(true);
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  }, [holiday, isAdding, todayYMD]);

  if (!isOpen) return null;

  // Validation
  const isDateRangeInvalid = Boolean(startDate && endDate && endDate < startDate);
  const isNameEmpty = !name.trim();
  const canSave = !isDateRangeInvalid && !isNameEmpty;

  // Compute number of closure days
  const calculateDays = () => {
    if (!startDate || !endDate || isDateRangeInvalid) return 0;
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffTime = endObj.getTime() - startObj.getTime();
    return Math.round(diffTime / (1000 * 3600 * 24)) + 1;
  };

  const closureDays = calculateDays();

  // Calendar math for grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const clickedYMD = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (activePickerTarget === 'start') {
      setStartDate(clickedYMD);
      if (endDate < clickedYMD) {
        setEndDate(clickedYMD);
      }
      setActivePickerTarget('end');
    } else {
      if (clickedYMD < startDate) {
        setStartDate(clickedYMD);
      } else {
        setEndDate(clickedYMD);
      }
    }
  };

  // Quick Preset Handlers
  const applyPreset = (daysOffsetStart: number, durationDays: number, presetName?: string) => {
    const start = new Date();
    start.setDate(start.getDate() + daysOffsetStart);
    const end = new Date(start);
    end.setDate(end.getDate() + (durationDays - 1));

    const sStr = formatDateToYMD(start);
    const eStr = formatDateToYMD(end);
    setStartDate(sStr);
    setEndDate(eStr);
    if (presetName && !name) {
      setName(presetName);
    }

    const [y, m] = sStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  };

  const handleSongkranPreset = () => {
    const year = new Date().getFullYear();
    const sStr = `${year}-04-13`;
    const eStr = `${year}-04-15`;
    setStartDate(sStr);
    setEndDate(eStr);
    setName(language === 'th' ? 'เทศกาลวันสงกรานต์' : 'Songkran Thai New Year');
    setViewYear(year);
    setViewMonth(3); // April is index 3
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    const savedHoliday: SpecialHoliday = {
      id: holiday?.id || `holiday_${Date.now()}`,
      name: name.trim(),
      startDate,
      endDate,
      enabled,
    };

    onSave(savedHoliday);
  };

  const formatSummaryDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-').map(Number);
    if (parts.length < 3) return dStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#E65100] flex items-center justify-center font-bold shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#1A1A1A]">
                {isAdding
                  ? (language === 'th' ? 'เพิ่มวันหยุดพิเศษ' : 'Add Special Holiday Closure')
                  : (language === 'th' ? 'แก้ไขวันหยุดพิเศษ' : 'Edit Special Holiday Closure')}
              </h3>
              <p className="text-[11px] text-gray-500">
                {language === 'th'
                  ? 'กำหนดช่วงวันที่ปิดร้านชั่วคราว (ร้านจะกลับมาเปิดอัตโนมัติเมื่อครบกำหนด)'
                  : 'Specify exact closure date range (store reopens automatically)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Holiday Name */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">
              {language === 'th' ? 'ชื่อวันหยุด / สาเหตุการปิดร้าน' : 'Holiday Name / Reason'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={language === 'th' ? 'เช่น วันสงกรานต์, ปิดปรับปรุงร้าน, วันปีใหม่...' : 'e.g. Songkran Thai New Year, Annual Staff Retreat, Christmas...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:bg-white focus:border-[#E65100] focus:ring-1 focus:ring-[#E65100] outline-hidden"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="font-bold text-gray-500 block mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E65100]" />
              <span>{language === 'th' ? 'ตัวเลือกด่วน' : 'Quick Presets'}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(0, 1, language === 'th' ? 'วันหยุดพิเศษ (วันนี้)' : 'Special Closure (Today)')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#E65100] font-semibold text-[11px] transition-colors"
              >
                {language === 'th' ? 'วันนี้ (1 วัน)' : 'Today (1 Day)'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1, 1, language === 'th' ? 'วันหยุดพิเศษ (วันพรุ่งนี้)' : 'Special Closure (Tomorrow)')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#E65100] font-semibold text-[11px] transition-colors"
              >
                {language === 'th' ? 'วันพรุ่งนี้ (1 วัน)' : 'Tomorrow (1 Day)'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 3, language === 'th' ? 'วันหยุดต่อเนื่อง (3 วัน)' : '3-Day Closure')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#E65100] font-semibold text-[11px] transition-colors"
              >
                {language === 'th' ? '3 วัน' : 'Next 3 Days'}
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 7, language === 'th' ? 'วันหยุดยาว (1 สัปดาห์)' : '1-Week Holiday')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-50 hover:text-[#E65100] font-semibold text-[11px] transition-colors"
              >
                {language === 'th' ? '1 สัปดาห์' : '1 Week'}
              </button>
              <button
                type="button"
                onClick={handleSongkranPreset}
                className="px-2.5 py-1 rounded-lg bg-orange-100 text-[#E65100] font-bold text-[11px] hover:bg-orange-200 transition-colors"
              >
                {language === 'th' ? 'สงกรานต์ (13-15 เม.ย.)' : 'Songkran (Apr 13-15)'}
              </button>
            </div>
          </div>

          {/* Date Selector Row */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Start Date Target */}
            <div
              onClick={() => setActivePickerTarget('start')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activePickerTarget === 'start'
                  ? 'border-[#E65100] bg-orange-50/50 shadow-2xs ring-1 ring-[#E65100]'
                  : 'border-gray-200 bg-gray-50 hover:bg-white'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {language === 'th' ? 'วันที่เริ่มต้น (Start Date)' : 'Start Date'}
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full mt-1 bg-transparent font-extrabold text-xs text-[#1A1A1A] outline-hidden cursor-pointer"
              />
            </div>

            {/* End Date Target */}
            <div
              onClick={() => setActivePickerTarget('end')}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                activePickerTarget === 'end'
                  ? 'border-[#E65100] bg-orange-50/50 shadow-2xs ring-1 ring-[#E65100]'
                  : 'border-gray-200 bg-gray-50 hover:bg-white'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {language === 'th' ? 'วันที่สิ้นสุด (End Date)' : 'End Date'}
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value < startDate) setStartDate(e.target.value);
                }}
                className="w-full mt-1 bg-transparent font-extrabold text-xs text-[#1A1A1A] outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive Visual Calendar Grid */}
          <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200">
            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-[#1A1A1A]">
                {language === 'th' ? MONTH_NAMES_TH[viewMonth] : MONTH_NAMES_EN[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-white text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-white text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-1">
              {(language === 'th' ? WEEKDAY_NAMES_TH : WEEKDAY_NAMES_EN).map((day, idx) => (
                <div key={idx} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Padding days before month starts */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="py-1.5" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNumber = idx + 1;
                const cellYMD = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const isStart = cellYMD === startDate;
                const isEnd = cellYMD === endDate;
                const isInRange = Boolean(startDate && endDate && cellYMD >= startDate && cellYMD <= endDate);
                const isToday = cellYMD === todayYMD;

                return (
                  <button
                    key={dayNumber}
                    type="button"
                    onClick={() => handleDateClick(dayNumber)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                      isStart || isEnd
                        ? 'bg-[#E65100] text-white shadow-xs z-10'
                        : isInRange
                        ? 'bg-orange-100 text-[#D84315]'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                  >
                    {dayNumber}
                    {isToday && !isStart && !isEnd && (
                      <span className="w-1 h-1 rounded-full bg-[#E65100] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Errors & Info Banner */}
          {isDateRangeInvalid && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'th'
                  ? 'วันที่สิ้นสุดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้น'
                  : 'End date cannot be earlier than start date.'}
              </span>
            </div>
          )}

          {/* Summary pill */}
          {!isDateRangeInvalid && startDate && endDate && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  {startDate === endDate
                    ? formatSummaryDate(startDate)
                    : `${formatSummaryDate(startDate)} – ${formatSummaryDate(endDate)}`}
                </span>
              </div>
              <span className="font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                {closureDays} {closureDays === 1 ? (language === 'th' ? 'วัน' : 'day') : (language === 'th' ? 'วัน' : 'days')}
              </span>
            </div>
          )}

          {/* Enable / Disable toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
              />
              <span className="font-bold text-gray-700">
                {language === 'th' ? 'เปิดใช้งานวันหยุดนี้ (Enabled)' : 'Enable this holiday closure'}
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-xs font-bold transition-colors"
          >
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-[#E65100] text-white text-xs font-extrabold hover:bg-[#D84315] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{language === 'th' ? 'บันทึกวันหยุด' : 'Save Holiday'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
