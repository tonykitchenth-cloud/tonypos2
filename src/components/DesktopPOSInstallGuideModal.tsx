import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { X, Monitor, ArrowDownToLine, MoreVertical, CheckCircle2, Laptop } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DesktopPOSInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopPOSInstallGuideModal: React.FC<DesktopPOSInstallGuideModalProps> = ({ isOpen, onClose }) => {
  const { language } = useRestaurant();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-desktop-guide-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-2 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#E65100] mx-auto flex items-center justify-center border border-orange-100 shadow-xs">
              <Monitor className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-[#1A1A1A]">
              {language === 'th' ? 'วิธีติดตั้งแอปบนเครื่อง POS / Google Chrome' : 'Install App on POS / Google Chrome'}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {language === 'th'
                ? 'ติดตั้งเป็นแอปหน้าจอสัมผัสเต็มจอ สำหรับใช้งานคิดเงินและรับออเดอร์หน้าร้าน'
                : 'Install as a standalone touch POS app for fast ordering and cashier operations.'}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#E65100] flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'วิธีที่ 1: คลิกไอคอนติดตั้งที่แถบ URL ด้านบน' : 'Method 1: Click the Install Icon in the URL bar'}
                </span>
                {language === 'th'
                  ? 'สังเกตที่ แถบที่อยู่เว็บไซต์ (Address Bar) ด้านบนขวาของ Google Chrome จะมีไอคอนรูป "จอคอมพิวเตอร์พร้อมลูกศรลง" 💻 ให้คลิกที่ไอคอนนั้น แล้วกด "ติดตั้ง" (Install)'
                  : 'Look at the right side of the Chrome address bar for the install icon (monitor with down arrow), click it and select "Install".'}
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <MoreVertical className="w-4 h-4" />
              </div>
              <div className="text-xs text-gray-700 pt-0.5 leading-relaxed">
                <span className="font-bold text-[#1A1A1A] block mb-0.5">
                  {language === 'th' ? 'วิธีที่ 2: เมนูจุดสามจุด (⋮) ของ Google Chrome' : 'Method 2: Via Chrome Menu (⋮)'}
                </span>
                {language === 'th'
                  ? 'คลิกที่จุดสามจุด (⋮) มุมขวาบนสุดของ Chrome > เลือก "บันทึกและแชร์" (Save and share) > คลิก "ติดตั้ง Tony\'s Kitchen..." (Install Tony\'s Kitchen) แล้วกดยืนยัน'
                  : 'Click the three dots (⋮) in the top-right corner of Chrome > select "Save and share" > click "Install Tony\'s Kitchen...".'}
              </div>
            </div>

            <div className="flex items-start gap-3 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-emerald-900 pt-0.5 leading-relaxed">
                <span className="font-bold block mb-0.5">
                  {language === 'th' ? 'ผลลัพธ์หลังจากติดตั้ง' : 'After Installation'}
                </span>
                {language === 'th'
                  ? 'แอปจะเปิดเป็นหน้าต่างแยกอิสระเต็มจอ (Standalone) ไม่มีแถบ Browser รบกวน และมีไอคอนทางลัดบน Desktop หน้าจอเครื่อง POS ทันที!'
                  : 'The app will launch as a standalone window without browser toolbars, and a desktop shortcut will appear on your POS screen!'}
              </div>
            </div>
          </div>

          {/* Understood Button */}
          <button
            type="button"
            id="desktop-guide-got-it-btn"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-xs sm:text-sm hover:bg-[#D84315] transition-all active:scale-[0.99] cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'th' ? 'เข้าใจแล้ว / ปิด' : 'Got it'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
