import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder } from '../../types';
import { getOwnerOrderHistory } from '../../utils/orderHistory';
import { posPrinterService } from '../../services/posPrinterService';
import {
  X,
  Receipt,
  Search,
  Printer,
  ShieldCheck,
  Bike,
  Store,
  Calendar,
  Clock,
  Phone,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle2,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface OwnerOrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerOrderHistoryModal: React.FC<OwnerOrderHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, language, t } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<RestaurantOrder | null>(null);
  const [historyOrders, setHistoryOrders] = useState<RestaurantOrder[]>(() => getOwnerOrderHistory());

  // Refresh history on open
  React.useEffect(() => {
    if (isOpen) {
      setHistoryOrders(getOwnerOrderHistory());
    }
  }, [isOpen]);

  // Listen for owner_order_history_updated
  React.useEffect(() => {
    const handleUpdate = () => {
      setHistoryOrders(getOwnerOrderHistory());
    };
    window.addEventListener('owner_order_history_updated', handleUpdate);
    return () => {
      window.removeEventListener('owner_order_history_updated', handleUpdate);
    };
  }, []);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyOrders;
    const q = searchQuery.toLowerCase().trim();
    return historyOrders.filter((order) => {
      const numMatch = (order.orderNumberFormatted || '').toLowerCase().includes(q);
      const nameMatch = (order.customer?.name || '').toLowerCase().includes(q);
      const phoneMatch = (order.customer?.phone || '').toLowerCase().includes(q);
      return numMatch || nameMatch || phoneMatch;
    });
  }, [historyOrders, searchQuery]);

  if (!isOpen) return null;

  const handlePrintReceipt = async (order: RestaurantOrder) => {
    // 1. Direct POS print if connected
    if (posPrinterService.isConnected()) {
      const res = await posPrinterService.printOrder(order);
      if (res.success) {
        return;
      }
    }

    // 2. Fallback to standard print
    setSelectedOrderForReceipt(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-white">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {language === 'th' ? 'ประวัติออเดอร์ในเครื่อง (Store Local Ledger)' : 'Local Order Ledger'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-mono font-bold border border-orange-500/30">
                  {historyOrders.length} {language === 'th' ? 'รายการ' : 'orders'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {language === 'th'
                    ? 'บันทึกในเครื่องของร้านค้าอย่างน้อย 20 รายการเพื่อเป็นหลักฐาน'
                    : 'Auto-saved locally on store device as tamper-proof ledger'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-owner-history-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar inside local ledger */}
        <div className="p-3 sm:px-5 border-b border-neutral-800/80 bg-neutral-900/90 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'th'
                  ? 'ค้นหาจากเลขที่ออเดอร์ (#1029), ชื่อลูกค้า, เบอร์โทร...'
                  : 'Search by Order #, Customer Name, Phone...'
              }
              className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Order List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-neutral-950/40">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-neutral-900/60 rounded-2xl border border-neutral-800 my-4">
              <Receipt className="w-10 h-10 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-bold text-neutral-300">
                {language === 'th' ? 'ไม่พบประวัติออเดอร์ในเครื่อง' : 'No local orders found'}
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {language === 'th'
                  ? 'เมื่อมีออเดอร์เข้ามา ระบบจะสำรองข้อมูลไว้ในเครื่องนี้อัตโนมัติอย่างน้อย 20 รายการ'
                  : 'Orders received are automatically backed up on this device.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((order) => {
              const isDelivery = order.orderType === 'delivery';
              const isCompleted = order.status === 'completed';
              const formattedDate = new Date(order.createdAt).toLocaleDateString(
                language === 'th' ? 'th-TH' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
              );
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 space-y-3 transition-colors"
                >
                  {/* Top Line */}
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-orange-400">
                        {order.orderNumberFormatted}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : order.status === 'cancelled'
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isCompleted ? 'JOB DONE' : order.status}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {isDelivery ? (
                          <Bike className="w-3 h-3 text-orange-400" />
                        ) : (
                          <Store className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{isDelivery ? t('delivery') : t('pickup')}</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-neutral-400 font-mono">
                      {formattedDate} {formattedTime}
                    </span>
                  </div>

                  {/* Customer & Items Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-neutral-400 text-[11px] block">
                        {language === 'th' ? 'ลูกค้า:' : 'Customer:'}{' '}
                        <span className="font-bold text-white">{order.customer?.name}</span>
                        {order.customer?.phone && (
                          <span className="ml-2 text-neutral-400 font-mono">({order.customer.phone})</span>
                        )}
                      </span>
                      <p className="text-neutral-300 text-[11px] mt-0.5 line-clamp-1">
                        {order.items?.map((it) => `${it.quantity}x ${it.name?.th || it.name?.en}`).join(', ')}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-neutral-400 text-[11px] block">{t('total')}:</span>
                      <span className="font-mono text-base font-black text-orange-400">
                        ฿{order.total?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(order)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{language === 'th' ? 'พิมพ์ใบเสร็จหลักฐาน' : 'Print Receipt'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center text-[11px] text-neutral-400 shrink-0">
          {language === 'th'
            ? '💡 ออเดอร์ทั้งหมดถูกเก็บสำรองไว้ใน Local Storage ของเครื่องนี้อัตโนมัติอย่างน้อย 20 รายการ'
            : '💡 All orders are preserved in this terminal local storage as proof (20+ records).'}
        </div>
      </div>

      {/* Print Receipt Modal overlay */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-neutral-950 space-y-3">
            <div className="text-center border-b pb-2">
              <h3 className="font-black text-lg">{settings.restaurantName}</h3>
              <p className="text-xs text-gray-500 font-mono">{selectedOrderForReceipt.orderNumberFormatted}</p>
              <p className="text-[11px] text-gray-400">{new Date(selectedOrderForReceipt.createdAt).toLocaleString()}</p>
            </div>
            <div className="text-xs space-y-1">
              <p><b>{language === 'th' ? 'ลูกค้า' : 'Customer'}:</b> {selectedOrderForReceipt.customer?.name} ({selectedOrderForReceipt.customer?.phone})</p>
              {selectedOrderForReceipt.customer?.deliveryAddress && (
                <p><b>{language === 'th' ? 'ที่อยู่' : 'Address'}:</b> {selectedOrderForReceipt.customer.deliveryAddress}</p>
              )}
            </div>
            <div className="border-t border-b py-2 space-y-1 text-xs">
              {selectedOrderForReceipt.items?.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.quantity}x {it.name?.th || it.name?.en}</span>
                  <span className="font-mono">฿{(it.subtotal || it.unitPrice * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-black text-base">
              <span>{t('total')}</span>
              <span className="font-mono text-[#E65100]">฿{selectedOrderForReceipt.total?.toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForReceipt(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 text-xs font-bold"
              >
                {language === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
