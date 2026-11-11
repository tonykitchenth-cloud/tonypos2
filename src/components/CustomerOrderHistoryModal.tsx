import React, { useState } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantOrder } from '../types';
import { formatCurrency } from '../utils/pricing';
import {
  X,
  Clock,
  Receipt,
  ShoppingBag,
  Bike,
  Store,
  CheckCircle2,
  ChevronRight,
  Printer,
  ExternalLink,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  FileText,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CustomerOrderHistoryModal: React.FC = () => {
  const {
    isCustomerOrderHistoryOpen,
    setIsCustomerOrderHistoryOpen,
    customerOrderHistory,
    refreshCustomerOrderHistory,
    setActiveOrderId,
    setIsOrderStatusOpen,
    settings,
    language,
    t,
  } = useRestaurant();

  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<RestaurantOrder | null>(null);

  if (!isCustomerOrderHistoryOpen) return null;

  const handleTrackActiveOrder = (orderId: string) => {
    setActiveOrderId(orderId);
    setIsCustomerOrderHistoryOpen(false);
    setIsOrderStatusOpen(true);
  };

  const handlePrintReceipt = (order: RestaurantOrder) => {
    setSelectedOrderForReceipt(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: language === 'th' ? 'รอร้านค้ายืนยัน' : 'Pending Confirmation',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'accepted':
        return {
          label: language === 'th' ? 'ร้านค้ารับออเดอร์แล้ว' : 'Accepted / Preparing',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'on_the_way':
        return {
          label: language === 'th' ? 'กำลังเดินทางไปส่ง' : 'On The Way',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
        };
      case 'completed':
        return {
          label: language === 'th' ? 'จัดส่งสำเร็จ (JOB DONE)' : 'Completed (JOB DONE)',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'cancelled':
        return {
          label: language === 'th' ? 'ยกเลิกแล้ว' : 'Cancelled',
          color: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden text-[#1A1A1A]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#E65100]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-[#1A1A1A]">
                    {language === 'th' ? 'ประวัติรายการสั่งซื้อ' : 'Order History'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#E65100] text-[11px] font-mono font-bold">
                    {customerOrderHistory.length}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'th'
                      ? 'บันทึกในเครื่องของคุณเพื่อเป็นหลักฐาน (อย่างน้อย 20 รายการ)'
                      : 'Saved on this device as proof (at least 20 orders)'}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              id="close-order-history-btn"
              onClick={() => setIsCustomerOrderHistoryOpen(false)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-[#1A1A1A] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Orders Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-gray-50/60">
            {customerOrderHistory.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-gray-100 my-4">
                <div className="w-14 h-14 rounded-full bg-orange-50 text-[#E65100] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-800">
                  {language === 'th' ? 'ยังไม่มีประวัติการสั่งซื้อบนเครื่องนี้' : 'No order history on this device yet'}
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  {language === 'th'
                    ? 'เมื่อคุณสั่งอาหาร ข้อมูลคำสั่งซื้อและใบเสร็จจะถูกบันทึกเก็บไว้ในเครื่องของคุณโดยอัตโนมัติอย่างน้อย 20 รายการเพื่อใช้เป็นหลักฐาน'
                    : 'When you place an order, your receipts and order details are automatically saved locally on this device as proof.'}
                </p>
              </div>
            ) : (
              customerOrderHistory.map((order) => {
                const statusBadge = getStatusBadge(order.status);
                const isDelivery = order.orderType === 'delivery';
                const formattedDate = new Date(order.createdAt).toLocaleDateString(
                  language === 'th' ? 'th-TH' : 'en-US',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }
                );
                const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isActiveOrder =
                  order.status === 'pending' ||
                  order.status === 'accepted' ||
                  order.status === 'on_the_way';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-200/90 hover:border-orange-300 p-4 space-y-3 shadow-xs transition-all"
                  >
                    {/* Top Row: Order Number, Date, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm sm:text-base text-[#1A1A1A]">
                          {order.orderNumberFormatted}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusBadge.color}`}
                        >
                          {statusBadge.label}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {isDelivery ? (
                            <Bike className="w-3 h-3 text-[#E65100]" />
                          ) : (
                            <Store className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{isDelivery ? (language === 'th' ? 'จัดส่ง' : 'Delivery') : (language === 'th' ? 'รับที่ร้าน' : 'Pickup')}</span>
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-400 font-medium">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    {/* Middle: Dishes summary */}
                    <div className="space-y-1.5 text-xs">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-gray-700">
                          <span className="font-medium">
                            <span className="font-bold text-[#1A1A1A]">{item.quantity}x</span>{' '}
                            {language === 'th' ? (item.name.th || item.name.en) : item.name.en}
                            {item.selectedMainOption && (
                              <span className="text-orange-600 font-bold text-[10px] block">
                                • {language === 'th' ? 'ตัวเลือกหลัก' : 'Main'}: {language === 'th' ? (item.selectedMainOption.name.th || item.selectedMainOption.name.en) : (item.selectedMainOption.name.en || item.selectedMainOption.name.th)}
                              </span>
                            )}
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                              <span className="text-gray-400 text-[10px] block">
                                ({item.selectedModifiers.map(m => language === 'th' ? m.optionName.th : m.optionName.en).join(', ')})
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-semibold text-gray-600 shrink-0 ml-2">
                            ฿{(item.subtotal || item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Row: Total & Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-gray-500 font-medium">{t('total')}:</span>
                        <span className="text-base font-black font-mono text-[#E65100]">
                          ฿{order.total.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({order.paymentMethod === 'qr_payment' ? t('qrPayment') : t('cash')})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* View Receipt / Details button */}
                        <button
                          type="button"
                          id={`view-order-receipt-${order.id}`}
                          onClick={() => setSelectedOrderForReceipt(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-600" />
                          <span>{language === 'th' ? 'ดูใบเสร็จหลักฐาน' : 'View Receipt'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-3 bg-white border-t border-gray-100 text-center text-[11px] text-gray-400 shrink-0">
            {language === 'th'
              ? '💡 ข้อมูลถูกเก็บไว้ในเบราว์เซอร์เครื่องนี้อย่างปลอดภัย สามารถเปิดเช็คเป็นหลักฐานได้ตลอดเวลา'
              : '💡 Order history is stored securely on this device and can be checked anytime as proof.'}
          </div>
        </motion.div>
      </div>

      {/* 📄 FULL RECEIPT MODAL (ใบเสร็จรับเงิน / หลักฐานการสั่งซื้อ) */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#1A1A1A]">
            {/* Receipt Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#E65100]" />
                <h3 className="text-sm sm:text-base font-extrabold text-[#1A1A1A]">
                  {language === 'th' ? 'หลักฐานใบเสร็จการสั่งซื้อ' : 'Official Order Receipt'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForReceipt(null)}
                className="w-8 h-8 rounded-full bg-gray-200/80 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 print-receipt-container font-sans">
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-gray-200">
                <h2 className="text-lg font-black text-[#1A1A1A]">{settings.restaurantName}</h2>
                <p className="text-xs text-gray-500 font-mono">Tony's Kitchen • Fresh & Fast Thai Cuisine</p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-[#E65100] text-xs font-mono font-black">
                  {selectedOrderForReceipt.orderNumberFormatted}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {new Date(selectedOrderForReceipt.createdAt).toLocaleString(
                    language === 'th' ? 'th-TH' : 'en-US'
                  )}
                </p>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'th' ? 'ลูกค้า:' : 'Customer:'}</span>
                  <span className="font-bold text-[#1A1A1A]">{selectedOrderForReceipt.customer?.name}</span>
                </div>
                {selectedOrderForReceipt.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'th' ? 'เบอร์โทร:' : 'Phone:'}</span>
                    <span className="font-bold text-gray-700">{selectedOrderForReceipt.customer.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'th' ? 'ประเภท:' : 'Type:'}</span>
                  <span className="font-bold text-[#E65100] uppercase">
                    {selectedOrderForReceipt.orderType === 'delivery'
                      ? (language === 'th' ? 'บริการจัดส่ง' : 'Delivery')
                      : (language === 'th' ? 'รับเองที่ร้าน' : 'Pickup')}
                  </span>
                </div>
                {selectedOrderForReceipt.customer?.deliveryAddress && (
                  <div className="pt-1 border-t border-gray-200/60 text-gray-600">
                    <span className="font-bold text-gray-700 block">{language === 'th' ? 'ที่อยู่จัดส่ง:' : 'Address:'}</span>
                    <span className="text-[11px]">{selectedOrderForReceipt.customer.deliveryAddress}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold text-gray-500 border-b border-gray-200 pb-1 text-[11px] uppercase">
                  <span>{language === 'th' ? 'รายการอาหาร' : 'Item'}</span>
                  <span>{language === 'th' ? 'จำนวน x ราคา' : 'Amount'}</span>
                </div>
                {selectedOrderForReceipt.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-bold text-[#1A1A1A]">
                        {language === 'th' ? (item.name.th || item.name.en) : item.name.en}
                      </span>
                      {item.selectedModifiers?.map((mod, mi) => (
                        <span key={mi} className="block text-[10px] text-gray-400">
                          + {language === 'th' ? mod.optionName.th : mod.optionName.en}
                        </span>
                      ))}
                    </div>
                    <div className="text-right shrink-0 font-mono ml-2">
                      <span className="text-gray-500 text-[11px]">{item.quantity} x ฿{item.unitPrice}</span>
                      <span className="block font-bold text-[#1A1A1A]">฿{(item.subtotal || item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Payment */}
              <div className="pt-3 border-t-2 border-dashed border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>{t('subtotal')}:</span>
                  <span className="font-mono font-semibold">฿{selectedOrderForReceipt.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline text-sm sm:text-base font-black text-[#1A1A1A] pt-1 border-t border-gray-100">
                  <span>{language === 'th' ? 'ยอดรวมสุทธิ:' : 'Total Amount:'}</span>
                  <span className="font-mono text-lg text-[#E65100]">฿{selectedOrderForReceipt.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                  <span>{language === 'th' ? 'วิธีชำระเงิน:' : 'Payment Method:'}</span>
                  <span className="font-bold">
                    {selectedOrderForReceipt.paymentMethod === 'qr_payment' ? t('qrPayment') : t('cash')}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>{language === 'th' ? 'สถานะออเดอร์:' : 'Status:'}</span>
                  <span className="font-black uppercase text-emerald-600">
                    {selectedOrderForReceipt.status === 'completed'
                      ? 'JOB DONE (สำเร็จ)'
                      : selectedOrderForReceipt.status}
                  </span>
                </div>
              </div>

              {/* Digital Proof Code */}
              <div className="p-2.5 rounded-xl bg-gray-50 text-[10px] text-gray-400 font-mono text-center border border-gray-100">
                <span>Proof ID: {selectedOrderForReceipt.id}</span>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedOrderForReceipt)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'th' ? 'พิมพ์ใบเสร็จ' : 'Print Receipt'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForReceipt(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
