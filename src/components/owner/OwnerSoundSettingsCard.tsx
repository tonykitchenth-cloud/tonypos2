import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import {
  notificationSoundService,
  SoundStatusDetail,
} from '../../services/notificationSoundService';
import { orderNotificationService } from '../../services/orderNotificationService';

interface OwnerSoundSettingsCardProps {
  language: Language;
}

export const OwnerSoundSettingsCard: React.FC<OwnerSoundSettingsCardProps> = ({
  language,
}) => {
  const isThai = language === 'th';

  const [soundStatus, setSoundStatus] = useState<SoundStatusDetail>(() =>
    notificationSoundService.getAudioStatus()
  );
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationSoundService.subscribeStatus((status) => {
      setSoundStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleEnableOrderSounds = async () => {
    setIsProcessing(true);
    try {
      const result = await notificationSoundService.unlockAudio();
      if (result.success) {
        setFeedbackMessage({
          text: isThai
            ? 'เปิดใช้งานเสียงแจ้งเตือนออเดอร์เรียบร้อยแล้ว'
            : 'Order notification sounds are enabled.',
          type: 'success',
        });
      } else {
        setFeedbackMessage({
          text: result.message,
          type: 'warning',
        });
      }
    } catch {
      setFeedbackMessage({
        text: isThai
          ? 'เบราว์เซอร์ไม่อนุญาตให้เล่นเสียงอัตโนมัติ กรุณาลองใหม่อีกครั้ง'
          : 'Browser blocked audio. Please interact and try again.',
        type: 'warning',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestSound = async () => {
    setIsProcessing(true);
    try {
      const result = await notificationSoundService.testSound();
      setFeedbackMessage({
        text: result.message,
        type: result.success ? 'success' : 'warning',
      });
    } catch (err: any) {
      setFeedbackMessage({
        text: err?.message || 'Failed to play test sound.',
        type: 'warning',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    notificationSoundService.setSoundEnabled(enabled);
    setFeedbackMessage({
      text: enabled
        ? isThai
          ? 'เปิดเสียงแจ้งเตือนออเดอร์แล้ว'
          : 'Notification sound turned ON'
        : isThai
        ? 'ปิดเสียงแจ้งเตือนออเดอร์แล้ว'
        : 'Notification sound turned OFF',
      type: 'info',
    });
  };

  const handleToggleMute = (muted: boolean) => {
    notificationSoundService.setMuted(muted);
    setFeedbackMessage({
      text: muted
        ? isThai
          ? 'ปิดเสียงชั่วคราว (Muted)'
          : 'Notification sound MUTED'
        : isThai
          ? 'เปิดเสียง (Unmuted)'
          : 'Notification sound UNMUTED',
      type: 'info',
    });
  };

  const handleSimulateNewOrder = () => {
    const mockOrder = orderNotificationService.simulateMockOrder();
    setFeedbackMessage({
      text: isThai
        ? `จำลองออเดอร์ใหม่สำเร็จ (${mockOrder.orderNumberFormatted})`
        : `Mock order simulated successfully (${mockOrder.orderNumberFormatted})`,
      type: 'success',
    });
  };

  // Determine current status badge
  let statusBadgeColor = 'bg-gray-100 text-gray-700 border-gray-300';
  let statusText = isThai ? 'ยังไม่ได้เปิดใช้งาน' : 'Not configured';

  if (!soundStatus.isEnabled) {
    statusBadgeColor = 'bg-gray-100 text-gray-600 border-gray-300';
    statusText = isThai ? '● ปิดใช้งาน (OFF)' : '● Disabled (OFF)';
  } else if (soundStatus.isMuted) {
    statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
    statusText = isThai ? '● ปิดเสียงชั่วคราว (Muted)' : '● Muted (Silent)';
  } else if (!soundStatus.isUnlocked || soundStatus.playStatus === 'blocked') {
    statusBadgeColor = 'bg-amber-50 text-amber-900 border-amber-300';
    statusText = isThai
      ? '● ต้องกดอนุญาตในเบราว์เซอร์'
      : '● Browser permission/action required';
  } else if (soundStatus.playStatus === 'file_warning') {
    statusBadgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
    statusText = isThai
      ? '● ใช้งานอยู่ (ใช้เสียงสำรอง Chime)'
      : '● Enabled (Fallback Chime)';
  } else {
    statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    statusText = isThai ? '● เปิดใช้งานแล้ว' : '● Enabled';
  }

  return (
    <div
      id="owner-notification-sound-settings"
      className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#E65100]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1A1A1A]">
              {isThai ? 'เสียงแจ้งเตือนออเดอร์ใหม่' : 'Order Notification Sound'}
            </h3>
            <p className="text-xs text-gray-500">
              {isThai
                ? 'ส่งเสียงแจ้งเตือนทันทีเมื่อมีออเดอร์ใหม่เข้ามาที่หน้าจอเจ้าของร้าน'
                : 'Play custom audio automatically when a new customer order arrives.'}
            </p>
          </div>
        </div>

        {/* Status indicator badge */}
        <div
          id="sound-status-badge"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadgeColor}`}
        >
          <span>{statusText}</span>
        </div>
      </div>

      {/* Main Autoplay Unlock Banner (if browser blocked or not yet explicitly unlocked) */}
      {(!soundStatus.isUnlocked || soundStatus.playStatus === 'blocked') && (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black text-orange-950 block">
              {isThai ? '🔔 เปิดใช้งานเสียงแจ้งเตือน' : '🔔 Enable Order Sounds'}
            </span>
            <p className="text-[11px] text-orange-900/80 mt-0.5">
              {isThai
                ? 'เบราว์เซอร์จำเป็นต้องได้รับการยินยอมจากผู้ใช้ก่อนจึงจะสามารถส่งเสียงแจ้งเตือนออเดอร์ใหม่ได้'
                : 'Modern browsers require one-click owner consent before allowing audio playback.'}
            </p>
          </div>
          <button
            type="button"
            id="enable-order-sounds-btn"
            disabled={isProcessing}
            onClick={handleEnableOrderSounds}
            className="px-4 py-2.5 rounded-xl bg-[#E65100] hover:bg-[#D84315] disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>{isThai ? '🔔 เปิดเสียงแจ้งเตือนออเดอร์' : '🔔 Enable Order Sounds'}</span>
          </button>
        </div>
      )}

      {/* Feedback toast banner */}
      {feedbackMessage && (
        <div
          id="sound-feedback-message"
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        
        {/* Toggle On / Off */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-gray-800">
              {isThai ? 'เปิด / ปิด ระบบเสียงแจ้งเตือน' : 'Notification Sound Master'}
            </span>
            <span className="text-[11px] font-bold text-gray-500">
              {soundStatus.isEnabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="sound-master-on-btn"
              onClick={() => handleToggleEnabled(true)}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                soundStatus.isEnabled
                  ? 'bg-[#E65100] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {isThai ? 'เปิด (ON)' : 'ON'}
            </button>
            <button
              type="button"
              id="sound-master-off-btn"
              onClick={() => handleToggleEnabled(false)}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                !soundStatus.isEnabled
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {isThai ? 'ปิด (OFF)' : 'OFF'}
            </button>
          </div>

          {/* Quick Sound Mute / Unmute */}
          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
            <span className="text-gray-600 font-medium text-[11px]">
              {isThai ? 'สถานะเสียง' : 'Sound Output'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="sound-mute-toggle-on"
                onClick={() => handleToggleMute(false)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  !soundStatus.isMuted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isThai ? '🔊 เปิดเสียง' : '🔊 Sound On'}</span>
              </button>
              <button
                type="button"
                id="sound-mute-toggle-off"
                onClick={() => handleToggleMute(true)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  soundStatus.isMuted
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{isThai ? '🔇 ปิดเสียง' : '🔇 Sound Off'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audio Asset & Testing */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
          <div>
            <span className="font-extrabold text-gray-800 block">
              {isThai ? 'ไฟล์เสียงที่ใช้งาน:' : 'Sound file:'}
            </span>
            <div className="mt-1 flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 text-gray-700">
              <FileAudio className="w-4 h-4 text-[#E65100] shrink-0" />
              <code className="font-mono text-[11px] text-[#E65100] font-bold">
                new-order.wav
              </code>
              <span className="text-[10px] text-gray-400 ml-auto">
                (/sounds/new-order.wav)
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {isThai
                ? 'ไฟล์เสียงแจ้งเตือนออเดอร์ใหม่ทางการของร้าน Tony\'s Kitchen (WAV/MP3 ใน public/sounds/)'
                : 'Official new order notification sound for Tony\'s Kitchen (WAV/MP3 in public/sounds/).'}
            </p>
          </div>

          {/* Action Buttons: Test Sound & Simulate Order */}
          <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="test-order-sound-btn"
              disabled={isProcessing}
              onClick={handleTestSound}
              className="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#D4AF37]" />
              <span>{isThai ? 'ทดสอบเสียง' : 'Test Sound'}</span>
            </button>

            <button
              type="button"
              id="simulate-new-order-btn"
              onClick={handleSimulateNewOrder}
              className="py-2 px-3 rounded-xl bg-orange-100 hover:bg-orange-200 text-[#E65100] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Trigger a mock order to test visual alert and audio"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isThai ? 'จำลองออเดอร์ใหม่' : 'Simulate Order'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Warning note if file is missing or blocked */}
      {soundStatus.warningMessage && (
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">
              {isThai ? 'ข้อความแจ้งเตือนระบบเสียง:' : 'Audio System Notice:'}
            </span>
            <span>{soundStatus.warningMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
