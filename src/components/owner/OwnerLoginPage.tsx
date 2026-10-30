import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { KeyRound, ShieldCheck, AlertCircle, ArrowLeft, Globe, Lock } from 'lucide-react';
import { unlockAudioContext, playNotificationSound } from '../../utils/soundAlarm';
import { navigateTo } from '../../utils/navigation';

export const OwnerLoginPage: React.FC = () => {
  const {
    setIsOwnerMode,
    settings,
    updateSettings,
    language,
    setLanguage,
    t,
  } = useRestaurant();

  const isFirstTime = !settings.ownerPasscodeHash || settings.ownerPasscodeHash.trim() === '';
  const [mode, setMode] = useState<'unlock' | 'setup'>(isFirstTime ? 'setup' : 'unlock');

  const [passcode, setPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPasscode = settings.ownerPasscodeHash || '1234';
    if (passcode.trim() === targetPasscode) {
      setErrorMsg(null);
      setPasscode('');
      setIsOwnerMode(true);
      await unlockAudioContext();
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
    setIsOwnerMode(true);
    unlockAudioContext();
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col justify-between selection:bg-[#E65100]/30 selection:text-[#E65100]">
      {/* Top Bar with Language Switcher and Return to Customer Page */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#1A1A1A]/80 backdrop-blur-md">
        <button
          type="button"
          id="back-to-customer-page-btn"
          onClick={() => navigateTo('customer')}
          className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'th' ? 'กลับไปหน้าสั่งอาหารลูกค้า' : 'Back to Customer Menu'}</span>
        </button>

        {/* Language Switcher */}
        <div className="flex items-center bg-white/10 p-0.5 rounded-full text-xs font-semibold">
          <button
            type="button"
            id="owner-lang-btn-en"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
              language === 'en'
                ? 'bg-[#E65100] text-white shadow-xs font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
          <button
            type="button"
            id="owner-lang-btn-th"
            onClick={() => setLanguage('th')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
              language === 'th'
                ? 'bg-[#E65100] text-white shadow-xs font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🇹🇭</span>
            <span>ไทย</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#1F1F1F] rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-white/10 text-center relative overflow-hidden">
          {/* Brand Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E65100] to-[#BF360C] text-white mx-auto flex items-center justify-center shadow-lg ring-4 ring-[#D4AF37]/30 mb-4">
            {mode === 'setup' ? <ShieldCheck className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            {settings.restaurantName}
          </h2>
          <p className="text-xs text-[#D4AF37] font-bold tracking-wider uppercase mt-0.5">
            {language === 'th' ? 'พอร์ทัลจัดการร้านและออเดอร์' : 'Owner & Staff Portal'}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            {mode === 'setup'
              ? (language === 'th'
                ? 'กรุณากำหนดรหัสผ่าน 4 หลักขึ้นไปเพื่อความปลอดภัย'
                : 'Set up your secret 4+ digit passcode for restaurant management.')
              : (language === 'th'
                ? 'กรุณากรอกรหัสผ่านเจ้าของร้านเพื่อเข้าสู่ระบบแดชบอร์ด'
                : 'Enter your owner passcode to manage live orders, menu, and store settings.')}
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div
              id="owner-login-error"
              className="mt-4 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2 text-rose-300 text-xs text-left"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unlock Form */}
          {mode === 'unlock' ? (
            <form onSubmit={handleUnlock} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1 text-left">
                  {language === 'th' ? 'รหัสผ่านเจ้าของร้าน' : 'Owner Passcode'}
                </label>
                <input
                  id="owner-passcode-input"
                  data-testid="owner-passcode-input"
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="••••"
                  className="w-full bg-[#2A2A2A] text-center text-xl font-bold tracking-widest px-4 py-3 rounded-2xl border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                id="submit-owner-passcode-btn"
                data-testid="submit-owner-passcode-btn"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#E65100] hover:bg-[#D84315] text-white font-black text-sm active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{language === 'th' ? 'เข้าสู่ระบบเจ้าของร้าน' : 'Unlock Dashboard'}</span>
              </button>
            </form>
          ) : (
            /* Setup Passcode Form */
            <form onSubmit={handleSetupPasscode} className="mt-5 space-y-3.5 text-left">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">
                  {language === 'th' ? 'กำหนดรหัสผ่านใหม่ (อย่างน้อย 4 หลัก)' : 'New Passcode (4+ digits)'}
                </label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => {
                    setNewPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-[#2A2A2A] text-center text-lg font-bold tracking-widest px-4 py-2.5 rounded-2xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#E65100]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1">
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
                  className="w-full bg-[#2A2A2A] text-center text-lg font-bold tracking-widest px-4 py-2.5 rounded-2xl border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#E65100]"
                />
              </div>

              <button
                type="submit"
                id="save-owner-passcode-btn"
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#E65100] hover:bg-[#D84315] text-white font-black text-sm active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'th' ? 'บันทึกรหัสผ่านและเข้าสู่ระบบ' : 'Save Passcode & Enter'}</span>
              </button>
            </form>
          )}

          {/* Quick Default Passcode hint if default */}
          {settings.ownerPasscodeHash === '1234' && (
            <p className="text-[11px] text-gray-500 mt-4">
              Default passcode: <span className="font-mono text-gray-300 font-bold">1234</span>
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[11px] text-gray-500 border-t border-white/5">
        <span>Tony's Kitchen Bangkok • Authorized Personnel Only</span>
      </footer>
    </div>
  );
};
