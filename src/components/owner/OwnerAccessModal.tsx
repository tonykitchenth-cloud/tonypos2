import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Lock, KeyRound, X, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { unlockAudioContext, playNotificationSound } from '../../utils/soundAlarm';

export const OwnerAccessModal: React.FC = () => {
  const {
    isOwnerAccessModalOpen,
    setIsOwnerAccessModalOpen,
    setIsOwnerMode,
    settings,
    updateSettings,
    language,
    t,
  } = useRestaurant();

  const isFirstTime = !settings.ownerPasscodeHash || settings.ownerPasscodeHash.trim() === '';
  const [mode, setMode] = useState<'unlock' | 'setup'>(isFirstTime ? 'setup' : 'unlock');

  const [passcode, setPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOwnerAccessModalOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPasscode = settings.ownerPasscodeHash || '1234';
    if (passcode.trim() === targetPasscode) {
      setErrorMsg(null);
      setPasscode('');
      setIsOwnerAccessModalOpen(false);
      setIsOwnerMode(true);
      unlockAudioContext();
      playNotificationSound(settings.notificationSound || 'sound1').catch(() => {});
    } else {
      setErrorMsg(t('invalidPasscode'));
    }
  };

  const handleSetupPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode.trim() || newPasscode.trim().length < 4) {
      setErrorMsg(language === 'th' ? 'กรุณากรอกรหัสผ่านอย่างน้อย 4 หลัก' : 'Passcode must be at least 4 digits');
      return;
    }
    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setErrorMsg(language === 'th' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'Passcodes do not match');
      return;
    }

    updateSettings({ ownerPasscodeHash: newPasscode.trim() });
    setErrorMsg(null);
    setNewPasscode('');
    setConfirmPasscode('');
    setIsOwnerAccessModalOpen(false);
    setIsOwnerMode(true);
    unlockAudioContext();
    playNotificationSound(settings.notificationSound || 'sound1').catch(() => {});
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative"
        >
          <button
            type="button"
            id="close-owner-access-btn"
            onClick={() => {
              setIsOwnerAccessModalOpen(false);
              setPasscode('');
              setNewPasscode('');
              setConfirmPasscode('');
              setErrorMsg(null);
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#E65100] mx-auto flex items-center justify-center border border-amber-100 shadow-xs">
              {mode === 'setup' ? <ShieldCheck className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
            </div>
            <h2 className="text-lg font-black text-[#1A1A1A]">
              {mode === 'setup'
                ? (language === 'th' ? 'ตั้งค่ารหัสผ่านเจ้าของร้าน' : 'Create Owner Passcode')
                : t('ownerAccessTitle')}
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'setup'
                ? (language === 'th'
                  ? 'กรุณากำหนดรหัสผ่าน 4 หลักขึ้นไปเพื่อความปลอดภัย'
                  : 'Set up your secret 4+ digit passcode for restaurant management.')
                : (language === 'th'
                  ? 'กรอกรหัสผ่านเจ้าของร้านเพื่อจัดการเมนูและเวลาเปิดปิด'
                  : 'Enter your owner passcode to manage dishes, hours, and store settings.')}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'unlock' ? (
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {t('enterPasscode')}
                </label>
                <input
                  id="owner-passcode-input"
                  type="password"
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder={t('passcodePlaceholder')}
                  className="w-full bg-gray-50 text-center text-lg font-black tracking-widest px-4 py-3 rounded-2xl border border-gray-200 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>

              <button
                type="submit"
                id="unlock-owner-btn"
                className="w-full py-3 px-4 rounded-2xl bg-[#1A1A1A] text-white font-extrabold text-xs sm:text-sm hover:bg-black active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#E65100]" />
                <span>{t('unlock')}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('setup');
                    setErrorMsg(null);
                  }}
                  className="text-[11px] text-gray-400 hover:text-[#E65100] underline"
                >
                  {language === 'th' ? 'เปลี่ยนรหัสผ่าน / ตั้งค่าใหม่' : 'Reset / Change Passcode'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSetupPasscode} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {language === 'th' ? 'รหัสผ่านใหม่' : 'New Passcode'}
                </label>
                <input
                  type="password"
                  autoFocus
                  value={newPasscode}
                  onChange={(e) => {
                    setNewPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-gray-50 text-center text-base font-bold tracking-widest px-3 py-2.5 rounded-xl border border-gray-200 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Passcode'}
                </label>
                <input
                  type="password"
                  value={confirmPasscode}
                  onChange={(e) => {
                    setConfirmPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-gray-50 text-center text-base font-bold tracking-widest px-3 py-2.5 rounded-xl border border-gray-200 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100]"
                />
              </div>

              <button
                type="submit"
                id="save-passcode-btn"
                className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#E65100] text-white font-extrabold text-xs sm:text-sm hover:bg-[#D84315] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'th' ? 'บันทึกรหัสผ่านและเข้าใช้งาน' : 'Save Passcode & Enter'}</span>
              </button>

              {!isFirstTime && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('unlock');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-gray-400 hover:text-gray-700 underline"
                  >
                    {language === 'th' ? 'กลับไปหน้ากรอกรหัสผ่าน' : 'Back to Passcode Entry'}
                  </button>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
