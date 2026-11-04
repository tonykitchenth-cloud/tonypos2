import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  X,
  Smartphone,
  Monitor,
  MoreVertical,
  CheckCircle2,
  ArrowDownToLine,
  Download,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OwnerPOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  supportsNativePrompt?: boolean;
  onTriggerNativePrompt?: () => Promise<void>;
}

export const OwnerPOSInstallModal: React.FC<OwnerPOSInstallModalProps> = ({
  isOpen,
  onClose,
  supportsNativePrompt = false,
  onTriggerNativePrompt,
}) => {
  const { language } = useRestaurant();
  const [deviceType, setDeviceType] = useState<'android_pos' | 'windows_pos'>('android_pos');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-800 overflow-hidden relative max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-owner-pos-install-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-neutral-800">
            <div className="w-13 h-13 rounded-2xl bg-[#E65100]/20 text-[#E65100] border border-[#E65100]/30 flex items-center justify-center shrink-0 shadow-lg">
              <Download className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {language === 'th' ? 'วิธีติดตั้งแอปร้านค้าบนเครื่อง POS' : 'Install POS App on Terminal'}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'th'
                  ? 'ติดตั้ง Tony\'s Kitchen บนหน้าจอสัมผัสเครื่อง POS สำหรับเปิดใช้งานเต็มจอ (Standalone Touch POS)'
                  : 'Install Tony\'s Kitchen on your POS touchscreen for full-screen cashier operations.'}
              </p>
            </div>
          </div>

          {/* Quick 1-Click Native Install Button if available */}
          {supportsNativePrompt && onTriggerNativePrompt && (
            <div className="mb-5 p-3.5 bg-gradient-to-r from-orange-600/30 via-orange-500/20 to-orange-600/30 rounded-2xl border border-orange-500/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-200">
                  {language === 'th' ? 'Google Chrome พร้อมติดตั้งทันที' : 'Chrome is ready to install'}
                </span>
                <span className="text-[10px] bg-orange-500 text-neutral-950 font-black px-2 py-0.5 rounded-full uppercase">
                  1-Click
                </span>
              </div>
              <button
                type="button"
                id="btn-trigger-owner-native-pwa"
                onClick={onTriggerNativePrompt}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E65100] hover:bg-[#D84315] active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'th' ? 'กดตรงนี้เพื่อติดตั้งลงเครื่อง POS ทันที' : 'Click to Install on POS Now'}</span>
              </button>
            </div>
          )}

          {/* Device Tabs: Android POS vs Windows POS */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDeviceType('android_pos')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'android_pos'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'เครื่อง POS ระบบ Android (เช่น iMin)' : 'Android POS (e.g. iMin)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceType('windows_pos')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'windows_pos'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'เครื่อง POS Windows / PC' : 'Windows POS / PC'}</span>
            </button>
          </div>

          {/* Guide Content: Android POS */}
          {deviceType === 'android_pos' && (
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 1: แตะเมนูจุดสามจุด (⋮) ของ Chrome' : 'Step 1: Tap the Three Dots (⋮) in Chrome'}
                  </span>
                  {language === 'th'
                    ? 'ที่มุมขวาบนสุดของหน้าจอ Google Chrome บนเครื่อง POS ให้แตะที่ปุ่มจุดสามจุด (⋮)'
                    : 'At the top-right corner of Google Chrome on your POS screen, tap the three dots (⋮) menu button.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 2: เลือก "เพิ่มลงในหน้าจอหลัก" หรือ "ติดตั้งแอป"' : 'Step 2: Select "Add to Home screen" or "Install app"'}
                  </span>
                  {language === 'th'
                    ? 'ในรายการเมนู ให้แตะเลือก "เพิ่มลงในหน้าจอหลัก" (Add to Home screen) หรือ "ติดตั้งแอป" (Install app)'
                    : 'From the menu list, tap "Add to Home screen" or "Install app".'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-900/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-200 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 3: แตะ "เพิ่ม" หรือ "ติดตั้ง"' : 'Step 3: Tap "Add" or "Install"'}
                  </span>
                  {language === 'th'
                    ? 'ไอคอน Tony\'s Kitchen จะปรากฏบนหน้าจอหลักของเครื่อง POS ทันที เมื่อแตะเปิด แอปจะทำงานเป็นระบบ POS สัมผัสเต็มจอ ไม่มีแถบ Browser รบกวน!'
                    : 'Tony\'s Kitchen icon will appear on your POS home screen. Tap to launch in full-screen touch mode!'}
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: Windows POS */}
          {deviceType === 'windows_pos' && (
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'วิธีที่ 1: คลิกไอคอนติดตั้งในช่อง URL' : 'Method 1: Click Install Icon in URL Bar'}
                  </span>
                  {language === 'th'
                    ? 'สังเกตที่ แถบที่อยู่ Address Bar ด้านบนขวา จะมีไอคอนรูป "จอคอมพิวเตอร์พร้อมลูกศรลง" 💻 ให้คลิกแล้วกด "ติดตั้ง"'
                    : 'Look for the install icon (monitor with down arrow) on the right side of Chrome address bar, click it and confirm.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'วิธีที่ 2: เมนูจุดสามจุด (⋮) ของ Chrome' : 'Method 2: Via Chrome 3-Dots Menu (⋮)'}
                  </span>
                  {language === 'th'
                    ? 'คลิกจุดสามจุด (⋮) ด้านขวาบน > เลือก "บันทึกและแชร์" (Save and share) > คลิก "ติดตั้ง Tony\'s Kitchen..."'
                    : 'Click (⋮) in Chrome > "Save and share" > "Install Tony\'s Kitchen...".'}
                </div>
              </div>
            </div>
          )}

          {/* Understood Button */}
          <button
            type="button"
            id="owner-pos-guide-got-it-btn"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-extrabold text-xs sm:text-sm active:scale-[0.99] transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{language === 'th' ? 'เข้าใจแล้ว / ปิดหน้าต่าง' : 'Got it / Close'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
