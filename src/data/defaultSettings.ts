import { StoreSettings } from '../types';

export const defaultSettings: StoreSettings = {
  restaurantName: "Tony's Kitchen",
  logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&h=200&q=80",
  phone: "0841536498",
  phoneDisplay: "084 153 6498",
  lineId: "padaroisauce",
  whatsAppNumber: "+66 84 153 6498",
  whatsAppIntlNumber: "66841536498",
  emergencyClose: {
    enabled: false,
    reasonEn: "We are temporarily closed for private catering preparations.",
    reasonTh: "ทางร้านขออภัยในความไม่สะดวก ขณะนี้ปิดบริการชั่วคราวเพื่อเตรียมงานจัดเลี้ยงพิเศษ",
  },
  schedule: [
    { dayOfWeek: 0, dayName: 'Sunday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
    { dayOfWeek: 1, dayName: 'Monday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', isOpen: false, openTime: '10:00', closeTime: '21:00' }, // Closed every Tuesday
    { dayOfWeek: 3, dayName: 'Wednesday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
    { dayOfWeek: 4, dayName: 'Thursday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
    { dayOfWeek: 5, dayName: 'Friday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
    { dayOfWeek: 6, dayName: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
  ],
  specialHolidays: [
    {
      id: 'holiday-songkran',
      name: 'Songkran Thai New Year',
      startDate: '2027-04-13T00:00',
      endDate: '2027-04-15T23:59',
      enabled: false,
    }
  ],
  channels: {
    whatsApp: true,
    line: true,
    pickup: true,
    delivery: true,
  },
  timezone: "Asia/Bangkok",
  currencySymbol: "฿",
  currencyCode: "THB",
  ownerPasscodeHash: "1234", // Simple default passcode for Owner Portal
  taglineEn: "Authentic Thai Flavors & Fast Ordering",
  taglineTh: "รสชาติไทยแท้ สั่งง่าย ส่งไว ปรุงสดใหม่ทุกจาน",
  address: "Bangkok, Thailand",
  defaultLanguage: "en",
};
