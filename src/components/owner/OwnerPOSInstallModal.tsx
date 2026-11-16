import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getOwnerShareUrl } from '../../utils/navigation';
import {
  X,
  Smartphone,
  Monitor,
  MoreVertical,
  CheckCircle2,
  ArrowDownToLine,
  Download,
  Share,
  PlusSquare,
  ExternalLink,
  Copy,
  Tablet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OwnerPOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  supportsNativePrompt?: boolean;
  onTriggerNativePrompt?: () => Promise<void>;
}

type InstallPlatformTab = 'android' | 'ios' | 'desktop';

export const OwnerPOSInstallModal: React.FC<OwnerPOSInstallModalProps> = ({
  isOpen,
  onClose,
  supportsNativePrompt = false,
  onTriggerNativePrompt,
}) => {
  const { language } = useRestaurant();
  const { isIOS, isDesktopPOS, isInAppBrowser, isLineBrowser } = usePWAInstall();
  const [deviceType, setDeviceType] = useState<InstallPlatformTab>('android');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Auto-select matching device tab when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (isIOS) {
      setDeviceType('ios');
    } else if (isDesktopPOS) {
      setDeviceType('desktop');
    } else {
      setDeviceType('android');
    }
  }, [isOpen, isIOS, isDesktopPOS]);

  if (!isOpen) return null;

  const ownerUrl = getOwnerShareUrl();

  const handleCopyOwnerUrl = async () => {
    try {
      await navigator.clipboard.writeText(ownerUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-neutral-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-neutral-800 overflow-hidden relative max-h-[92vh] overflow-y-auto"
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
          <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-neutral-800 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-[#E65100]/20 text-[#E65100] border border-[#E65100]/30 flex items-center justify-center shrink-0 shadow-lg">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {language === 'th' ? 'ติดตั้งแอปเจ้าของร้าน (Tony\'s POS)' : 'Install Owner POS App'}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'th'
                  ? 'รองรับทั้งคอมพิวเตอร์ (PC/Mac), แท็บเล็ต Android และ iPad / iPhone (iOS)'
                  : 'Install on PC/Mac, Android Tablets, and iPad / iPhone for full-screen POS mode.'}
              </p>
            </div>
          </div>

          {/* Warning Banner when opened inside LINE / Facebook / In-App Browser */}
          {(isInAppBrowser || isLineBrowser) && (
            <div className="mb-4 p-3.5 bg-amber-950/60 border border-amber-500/40 rounded-2xl space-y-2">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100 leading-relaxed">
                  <span className="font-bold text-amber-300 block mb-0.5">
                    {language === 'th'
                      ? 'กำลังเปิดผ่านแอปแชท (LINE / Facebook) — ยังติดตั้งไม่ได้'
                      : 'Opened inside an In-App Browser'}
                  </span>
                  {language === 'th'
                    ? 'กรุณาแตะปุ่ม ⋮ หรือ ⋯ มุมหน้าจอ แล้วเลือก "เปิดในเบราว์เซอร์เริ่มต้น (Safari / Chrome)" ก่อนจึงจะติดตั้งแอปได้'
                    : 'Please tap ⋮ / ⋯ and choose "Open in Safari / Chrome" before installing.'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyOwnerUrl}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedUrl
                    ? (language === 'th' ? 'คัดลอกลิงก์ร้านค้าแล้ว!' : 'Link Copied!')
                    : (language === 'th' ? 'คัดลอกลิงก์ไปวางใน Chrome / Safari' : 'Copy Link to Open in Browser')}
                </span>
              </button>
            </div>
          )}

          {/* Quick 1-Click Native Install Button if available */}
          {supportsNativePrompt && onTriggerNativePrompt && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-orange-600/30 via-orange-500/20 to-orange-600/30 rounded-2xl border border-orange-500/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-200">
                  {language === 'th' ? 'อุปกรณ์ของคุณพร้อมติดตั้งทันที' : 'Browser is ready to install'}
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
                <span>{language === 'th' ? 'กดตรงนี้เพื่อติดตั้งลงเครื่องทันที' : 'Click to Install App Now'}</span>
              </button>
            </div>
          )}

          {/* 3-Platform Tabs: Android Tablet / iOS (iPad/iPhone) / PC & Mac */}
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => setDeviceType('android')}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'android'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Tablet className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{language === 'th' ? 'Android / แท็บเล็ต' : 'Android'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceType('ios')}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'ios'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{language === 'th' ? 'iPad / iPhone' : 'iPad / iOS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceType('desktop')}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'desktop'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{language === 'th' ? 'คอม (PC / Mac)' : 'PC / Mac'}</span>
            </button>
          </div>

          {/* Guide Content: Android / Tablet */}
          {deviceType === 'android' && (
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 1: เปิดด้วย Google Chrome แล้วแตะปุ่ม (⋮)' : 'Step 1: Open in Google Chrome & Tap (⋮)'}
                  </span>
                  {language === 'th'
                    ? 'เปิดลิงก์ /owner/ บน Google Chrome (หรือ Samsung Internet) จากนั้นแตะเมนูจุดสามจุด (⋮) มุมขวาบน'
                    : 'Open this /owner/ page in Google Chrome on your Android tablet/phone and tap the three-dot (⋮) menu.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 2: เลือก "เพิ่มลงในหน้าจอหลัก" หรือ "ติดตั้งแอป"' : 'Step 2: Select "Install app" or "Add to Home screen"'}
                  </span>
                  {language === 'th'
                    ? 'ในรายการเมนู ให้แตะเลือก "ติดตั้งแอป" (Install app) หรือ "เพิ่มลงในหน้าจอหลัก" (Add to Home screen)'
                    : 'Tap "Install app" or "Add to Home screen" from the browser menu.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-900/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-200 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 3: ยืนยัน "ติดตั้ง"' : 'Step 3: Tap "Install"'}
                  </span>
                  {language === 'th'
                    ? 'ไอคอน Tony\'s POS จะขึ้นบนหน้าจอแท็บเล็ตทันที เปิดใช้งานเต็มจอสำหรับรับออเดอร์และคุมร้านได้เลย'
                    : 'The Tony\'s POS icon will appear on your Android home screen and launch in standalone full-screen mode.'}
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: iOS (iPad / iPhone) */}
          {deviceType === 'ios' && (
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  1
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'เปิดหน้านี้ในแอป Safari' : 'Open this page in Safari'}
                  </span>
                  {language === 'th'
                    ? 'บน iPad หรือ iPhone แนะนำให้เปิดลิงก์ /owner/ ผ่านเบราว์เซอร์ Safari (หากเปิดจาก LINE/Chrome ให้คัดลอกลิงก์มาเปิดใน Safari)'
                    : 'Open this /owner/ URL in Apple Safari on your iPad or iPhone.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'แตะปุ่ม "แชร์" (Share □↑)' : 'Tap the "Share" Button (□↑)'}
                  </span>
                  {language === 'th'
                    ? 'บน iPad ไอคอนแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) อยู่มุมขวาบนของ Safari • บน iPhone อยู่แถบด้านล่างตรงกลาง'
                    : 'On iPad, tap Share at the top-right; on iPhone, tap Share at the bottom bar.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'เลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)' : 'Select "Add to Home Screen"'}
                  </span>
                  {language === 'th'
                    ? 'เลื่อนรายการลงแล้วแตะ "เพิ่มไปยังหน้าจอโฮม" หากมีตัวเลือก "เปิดเป็นเว็บแอป" (Open as Web App) ให้เปิดไว้ แล้วแตะ "เพิ่ม" (Add)'
                    : 'Scroll down, tap "Add to Home Screen", ensure "Open as Web App" is on, then tap "Add".'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-900/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-200 pt-0.5 leading-relaxed">
                  {language === 'th'
                    ? 'ไอคอน Tony\'s POS จะขึ้นบนหน้าจอ iPad / iPhone และเปิดใช้งานแบบเต็มจอไร้แถบ URL'
                    : 'Tony\'s POS icon will appear on your iPad/iPhone Home Screen and run full-screen.'}
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: Desktop PC & Mac */}
          {deviceType === 'desktop' && (
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'วิธีที่ 1 (Chrome / Edge): คลิกไอคอนติดตั้งในแถบ URL' : 'Method 1 (Chrome / Edge): Click Install Icon in URL Bar'}
                  </span>
                  {language === 'th'
                    ? 'ที่มุมขวาของช่องใส่เว็บ (Address Bar) จะมีรูป "จอคอมพร้อมลูกศรลง" 💻 ให้คลิกแล้วกด "ติดตั้ง (Install)"'
                    : 'On the right side of Chrome or Edge address bar, click the install icon and confirm "Install".'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'วิธีที่ 2 (เมนู Chrome / Edge)' : 'Method 2 (Chrome / Edge Menu)'}
                  </span>
                  {language === 'th'
                    ? 'คลิกจุดสามจุด (⋮) ด้านขวาบน > "แคสต์ บันทึก และแชร์" (Save and share) หรือ "แอป" (Apps) > คลิก "ติดตั้ง Tony\'s Kitchen - Owner POS"'
                    : 'Click (⋮) > "Cast, save, and share" / "Apps" > "Install Tony\'s Kitchen - Owner POS".'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'วิธีที่ 3 (Mac Safari): เพิ่มไปยัง Dock' : 'Method 3 (Mac Safari): Add to Dock'}
                  </span>
                  {language === 'th'
                    ? 'หากเปิดด้วย Safari บน Mac ให้คลิกเมนู File (ไฟล์) ด้านบน > เลือก "Add to Dock..." (เพิ่มไปยัง Dock...)'
                    : 'In Safari on macOS, click File > Add to Dock... (or Share > Add to Dock).'}
                </div>
              </div>
            </div>
          )}

          {/* Direct Copy Link Helper */}
          <div className="mb-4 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-neutral-400 truncate font-mono select-all">{ownerUrl}</span>
            <button
              type="button"
              onClick={handleCopyOwnerUrl}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-orange-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedUrl ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอกลิงก์' : 'Copy')}</span>
            </button>
          </div>

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
