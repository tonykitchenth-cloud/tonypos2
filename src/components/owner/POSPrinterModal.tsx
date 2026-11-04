import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { posPrinterService, POSPrinterConfig } from '../../services/posPrinterService';
import {
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Usb,
  FileText,
  RotateCcw,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface POSPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const POSPrinterModal: React.FC<POSPrinterModalProps> = ({ isOpen, onClose }) => {
  const { language } = useRestaurant();
  const [config, setConfig] = useState<POSPrinterConfig>(() => posPrinterService.getConfig());
  const [isConnected, setIsConnected] = useState<boolean>(() => posPrinterService.isConnected());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(posPrinterService.getConfig());
      setIsConnected(posPrinterService.isConnected());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMsg(null);
    const result = await posPrinterService.connectSerialPrinter();
    setIsConnecting(false);

    if (result.success) {
      setIsConnected(true);
      setConfig(posPrinterService.getConfig());
      setStatusMsg({
        type: 'success',
        text: language === 'th' ? `เชื่อมต่อสำเร็จ: ${result.name}` : `Connected: ${result.name}`,
      });
    } else if (result.error && result.error !== 'User cancelled port selection') {
      setStatusMsg({
        type: 'error',
        text: result.error,
      });
    }
  };

  const handleDisconnect = async () => {
    await posPrinterService.disconnectPrinter();
    setIsConnected(false);
    setConfig(posPrinterService.getConfig());
    setStatusMsg({
      type: 'success',
      text: language === 'th' ? 'ตัดการเชื่อมต่อเรียบร้อยแล้ว' : 'Printer disconnected',
    });
  };

  const handlePaperWidthChange = (width: '80mm' | '58mm') => {
    const updated = posPrinterService.saveConfig({ paperWidth: width });
    setConfig(updated);
  };

  const handleTestPrint = async () => {
    setStatusMsg(null);
    if (!isConnected) {
      setStatusMsg({
        type: 'error',
        text: language === 'th' ? 'กรุณาเชื่อมต่อเครื่องพิมพ์ก่อนทดสอบพิมพ์' : 'Please connect printer first',
      });
      return;
    }
    const res = await posPrinterService.printTestSlip();
    if (res.success) {
      setStatusMsg({
        type: 'success',
        text: language === 'th' ? 'ส่งคำสั่งพิมพ์ทดสอบไปยังเครื่องพิมพ์สำเร็จ!' : 'Test print sent successfully!',
      });
    } else {
      setStatusMsg({
        type: 'error',
        text: res.error || 'Failed to print test slip',
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            id="close-pos-printer-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E65100] flex items-center justify-center border border-orange-100 shadow-xs shrink-0">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A]">
                {language === 'th' ? 'ตั้งค่าเครื่องพิมพ์ใบเสร็จ POS (ESC/POS)' : 'POS Thermal Printer Setup'}
              </h3>
              <p className="text-xs text-gray-500">
                {language === 'th'
                  ? 'เชื่อมต่อเครื่องพิมพ์สลิป/ใบเสร็จความร้อน สำหรับพิมพ์ใบออเดอร์โดยตรง'
                  : 'Connect thermal receipt printer to print orders directly without Windows dialog.'}
              </p>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {statusMsg && (
            <div
              className={`p-3 rounded-2xl mb-4 text-xs font-bold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">
                {language === 'th' ? 'สถานะการเชื่อมต่อเครื่องพิมพ์' : 'Connection Status'}
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  {language === 'th' ? 'ยังไม่ได้เชื่อมต่อ' : 'Not Connected'}
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                  <Usb className="w-4 h-4 text-[#E65100]" />
                  <span>{config.printerName || 'POS USB-Serial Thermal Printer'}</span>
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#E65100] text-white text-xs font-bold hover:bg-[#D84315] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'th' ? 'ทดสอบพิมพ์ใบเสร็จ' : 'Test Print Slip'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="py-2 px-3 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-all"
                  >
                    {language === 'th' ? 'ตัดการเชื่อมต่อ' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-gray-500 leading-relaxed">
                  {language === 'th'
                    ? 'คลิกปุ่มด้านล่างเพื่อเลือกพอร์ต USB / Serial COM ของเครื่องพิมพ์ POS ใน Google Chrome เพื่อให้แอปสั่งพิมพ์ตรงโดยไม่ผ่านหน้าต่าง Windows'
                    : 'Click below to select your POS printer USB / Serial port in Chrome for direct printing.'}
                </p>
                <button
                  type="button"
                  id="btn-connect-pos-printer"
                  disabled={isConnecting}
                  onClick={handleConnect}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-extrabold hover:bg-black active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Usb className="w-4 h-4 text-orange-400" />
                  <span>
                    {isConnecting
                      ? language === 'th' ? 'กำลังค้นหาเครื่องพิมพ์...' : 'Connecting...'
                      : language === 'th' ? 'เชื่อมต่อเครื่องพิมพ์ POS (USB / COM)' : 'Connect POS Printer (USB / COM)'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Paper Width Settings */}
          <div className="mb-4 space-y-2">
            <label className="text-xs font-bold text-gray-700 block">
              {language === 'th' ? 'ขนาดหน้ากว้างกระดาษใบเสร็จ (Paper Width)' : 'Paper Width'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePaperWidthChange('80mm')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  config.paperWidth === '80mm'
                    ? 'border-[#E65100] bg-orange-50/60 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1A1A1A]">80 mm</span>
                  {config.paperWidth === '80mm' && (
                    <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {language === 'th' ? 'มาตรฐานเครื่อง POS ทั่วไป' : 'Standard POS printer roll'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handlePaperWidthChange('58mm')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  config.paperWidth === '58mm'
                    ? 'border-[#E65100] bg-orange-50/60 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1A1A1A]">58 mm</span>
                  {config.paperWidth === '58mm' && (
                    <span className="w-4 h-4 rounded-full bg-[#E65100] text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {language === 'th' ? 'เครื่องพิมพ์ขนาดเล็ก / พกพา' : 'Mini / portable printer roll'}
                </p>
              </button>
            </div>
          </div>

          {/* Useful Tip for POS Silent Printing without Windows Dialog */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>{language === 'th' ? 'เทคนิคการพิมพ์ด่วน 1 คลิก บนเครื่อง POS' : 'Fast 1-Click Silent Printing Tip'}</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {language === 'th'
                ? 'สำหรับเครื่อง POS ที่ติดตั้ง Driver เครื่องพิมพ์ไว้แล้วใน Windows: สามารถตั้งให้พิมพ์ทันที 1 คลิกโดยไม่เด้งหน้าต่าง Windows ได้ โดยเปิด Google Chrome ด้วยคำสั่ง: '
                : 'For Windows POS with printer drivers installed, enable silent 1-click printing in Chrome with flag: '}
              <code className="bg-white/80 px-1 py-0.5 rounded text-[#E65100] font-mono font-bold">
                --kiosk-printing
              </code>
            </p>
          </div>

          {/* Bottom Buttons */}
          <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-all cursor-pointer"
            >
              {language === 'th' ? 'ปิดหน้าต่าง' : 'Done'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
