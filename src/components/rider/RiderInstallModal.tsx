import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getRiderShareUrl } from '../../utils/navigation';
import {
  X,
  Smartphone,
  MoreVertical,
  CheckCircle2,
  ArrowDownToLine,
  Download,
  Share,
  PlusSquare,
  ExternalLink,
  Copy,
  Bike,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RiderInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  supportsNativePrompt?: boolean;
  onTriggerNativePrompt?: () => Promise<void>;
}

export const RiderInstallModal: React.FC<RiderInstallModalProps> = ({
  isOpen,
  onClose,
  supportsNativePrompt = false,
  onTriggerNativePrompt,
}) => {
  const { language } = useRestaurant();
  const { isIOS, isInAppBrowser, isLineBrowser } = usePWAInstall();
  const [deviceType, setDeviceType] = useState<'android' | 'ios'>('android');
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDeviceType(isIOS ? 'ios' : 'android');
  }, [isOpen, isIOS]);

  if (!isOpen) return null;

  const riderUrl = getRiderShareUrl();

  const handleCopyRiderUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(riderUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = riderUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
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
          className="bg-neutral-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-neutral-800 overflow-hidden relative max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-rider-install-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-neutral-800 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-lg">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {language === 'th' ? "ติดตั้งแอปไรเดอร์ (Tony's Rider)" : "Install Rider App (Tony's Rider)"}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'th'
                  ? 'ติดตั้งไว้บนหน้าจอมือถือ Android และ iPhone เปิดรับงานส่งอาหารได้ทันทีแบบเต็มจอ'
                  : 'Install on Android or iPhone home screen for instant full-screen delivery tracking.'}
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
                      ? 'กำลังเปิดผ่านแอปแชท (เช่น LINE / Facebook)'
                      : 'Opened inside an In-App Browser'}
                  </span>
                  {language === 'th'
                    ? 'กรุณาแตะปุ่ม ⋮ หรือ ⋯ แล้วเลือก "เปิดใน Safari" (iPhone) หรือ "เปิดใน Chrome" (Android) ก่อนจึงจะติดตั้งแอปได้'
                    : 'Please tap ⋮ / ⋯ and choose "Open in Safari" (iPhone) or "Open in Chrome" (Android) before installing.'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyRiderUrl}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedUrl
                    ? (language === 'th' ? 'คัดลอกลิงก์ Rider แล้ว!' : 'Rider Link Copied!')
                    : (language === 'th' ? 'คัดลอกลิงก์ไปเปิดใน Chrome / Safari' : 'Copy Link to Open in Browser')}
                </span>
              </button>
            </div>
          )}

          {/* Quick 1-Click Native Install Button if available on Android Chrome */}
          {supportsNativePrompt && onTriggerNativePrompt && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-orange-600/30 via-orange-500/20 to-orange-600/30 rounded-2xl border border-orange-500/50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-200">
                  {language === 'th' ? 'มือถือ Android พร้อมติดตั้งทันที' : 'Android Chrome is ready to install'}
                </span>
                <span className="text-[10px] bg-orange-500 text-neutral-950 font-black px-2 py-0.5 rounded-full uppercase">
                  1-Click
                </span>
              </div>
              <button
                type="button"
                id="btn-trigger-rider-native-pwa"
                onClick={onTriggerNativePrompt}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E65100] hover:bg-[#D84315] active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'th' ? 'กดตรงนี้เพื่อติดตั้งแอป Rider ทันที' : 'Tap to Install Rider App Now'}</span>
              </button>
            </div>
          )}

          {/* 2-Platform Mobile Tabs: Android vs iOS */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDeviceType('android')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'android'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'th' ? 'มือถือ Android' : 'Android Phone'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceType('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                deviceType === 'ios'
                  ? 'bg-orange-500 text-neutral-950 border-orange-400 shadow-md font-extrabold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'th' ? 'iPhone / iPad (iOS)' : 'iPhone / iOS'}</span>
            </button>
          </div>

          {/* Guide Content: Android Mobile */}
          {deviceType === 'android' && (
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 1: เปิดด้วย Google Chrome แล้วแตะ (⋮)' : 'Step 1: Open in Chrome & Tap (⋮)'}
                  </span>
                  {language === 'th'
                    ? 'เปิดลิงก์ /rider/ บน Google Chrome (หรือ Samsung Internet) แล้วแตะเมนูจุดสามจุด (⋮) มุมขวาบน'
                    : 'Open this /rider/ page in Google Chrome and tap the three-dot (⋮) menu at top right.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 2: เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"' : 'Step 2: Select "Install app" or "Add to Home screen"'}
                  </span>
                  {language === 'th'
                    ? 'แตะเลือก "ติดตั้งแอป" (Install app) หรือ "เพิ่มลงในหน้าจอหลัก" (Add to Home screen)'
                    : 'Tap "Install app" or "Add to Home screen" from the menu.'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-900/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-200 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'ขั้นตอนที่ 3: ยืนยัน "ติดตั้ง"' : 'Step 3: Tap "Install"'}
                  </span>
                  {language === 'th'
                    ? "ไอคอน Tony's Rider จะปรากฏบนหน้าจอมือถือ เปิดใช้งานเต็มจอและรับออเดอร์ส่งอาหารได้ทันที"
                    : "Tony's Rider icon will appear on your phone home screen for full-screen delivery mode."}
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: iOS (iPhone / iPad Safari) */}
          {deviceType === 'ios' && (
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-orange-400 flex items-center justify-center shrink-0 font-black text-xs">
                  1
                </div>
                <div className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">
                    {language === 'th' ? 'เปิดหน้านี้ผ่านแอป Safari' : 'Open this page in Safari'}
                  </span>
                  {language === 'th'
                    ? 'บน iPhone หรือ iPad ให้เปิดลิงก์ /rider/ ด้วย Safari (หากกดมาจาก LINE ให้คัดลอกลิงก์ด้านล่างไปวางใน Safari)'
                    : 'Open this /rider/ URL in Apple Safari on your iPhone or iPad.'}
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
                    ? 'แตะไอคอนรูปสี่เหลี่ยมมีลูกศรชี้ขึ้น (□↑) ที่แถบด้านล่างของ Safari'
                    : 'Tap the Share icon (square with upward arrow) on Safari toolbar.'}
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
                    ? 'เลื่อนลงแล้วแตะ "เพิ่มไปยังหน้าจอโฮม" เปิดสวิตช์ "เปิดเป็นเว็บแอป" (ถ้ามี) แล้วกด "เพิ่ม"'
                    : 'Scroll down, tap "Add to Home Screen", enable "Open as Web App" if visible, and tap "Add".'}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-900/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-emerald-200 pt-0.5 leading-relaxed">
                  {language === 'th'
                    ? "ไอคอน Tony's Rider จะขึ้นบนหน้าจอโฮม iPhone เปิดใช้งานเต็มจอได้เหมือนแอปทั่วไป"
                    : "Tony's Rider icon will appear on your iPhone Home Screen and run full-screen."}
                </div>
              </div>
            </div>
          )}

          {/* Direct Copy Link Helper */}
          <div className="mb-4 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-neutral-400 truncate font-mono select-all">{riderUrl}</span>
            <button
              type="button"
              onClick={handleCopyRiderUrl}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-orange-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedUrl ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอกลิงก์' : 'Copy')}</span>
            </button>
          </div>

          {/* Understood Button */}
          <button
            type="button"
            id="rider-install-guide-got-it-btn"
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
