import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder } from '../../types';
import { updateOrderStatus } from '../../utils/orderSync';
import {
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  Check,
  Navigation,
  Clock,
  Banknote,
  CreditCard,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Map,
} from 'lucide-react';
import { InteractiveMapModal } from '../customer/InteractiveMapModal';

export const RiderDashboard: React.FC = () => {
  const { allOrders, language, t } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'delivering' | 'completed'>('delivering');
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [justCompletedOrderId, setJustCompletedOrderId] = useState<string | null>(null);
  const [mapModalOrder, setMapModalOrder] = useState<RestaurantOrder | null>(null);

  // Filter orders for delivery:
  // Active deliveries: orders that are delivery type AND status is 'on_the_way' (or 'accepted' if dispatched)
  const activeDeliveryOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') return false;
      const isDelivery = order.orderType === 'delivery';
      // Prioritize orders on the way, or accepted delivery orders
      const isOnDelivery = order.status === 'on_the_way' || (isDelivery && order.status === 'accepted');
      return isDelivery && isOnDelivery;
    }).sort((a, b) => {
      // Prioritize on_the_way first, then by creation time
      if (a.status === 'on_the_way' && b.status !== 'on_the_way') return -1;
      if (b.status === 'on_the_way' && a.status !== 'on_the_way') return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [allOrders]);

  // Today's completed delivery orders
  const completedTodayOrders = useMemo(() => {
    const todayStr = new Date().toDateString();
    return allOrders.filter((order) => {
      if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') return false;
      const isDelivery = order.orderType === 'delivery';
      const isCompleted = order.status === 'completed';
      const isToday = new Date(order.createdAt).toDateString() === todayStr;
      return isDelivery && isCompleted && isToday;
    }).sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
  }, [allOrders]);

  const toggleItemsExpand = (orderId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Handle Rider marking the order as Delivered
  const handleMarkAsDelivered = async (order: RestaurantOrder) => {
    if (submittingOrderId) return;
    setSubmittingOrderId(order.id);

    try {
      // 1. Update order status to 'completed' in Firestore and BroadcastChannel
      await updateOrderStatus(order.id, 'completed');
      setJustCompletedOrderId(order.id);

      // Brief visual celebration
      setTimeout(() => {
        setJustCompletedOrderId(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to mark delivery as completed:', err);
      alert(language === 'th' ? 'เกิดข้อผิดพลาดในการอัปเดตสถานะ กรุณาลองใหม่อีกครั้ง' : 'Failed to update order status. Please try again.');
    } finally {
      setSubmittingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16 selection:bg-orange-500/30">
      {/* 1. Rider Top Banner / Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-neutral-950 shadow-md shadow-orange-500/20">
              <Bike className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                  Rider Delivery View
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                {language === 'th' ? "Tony's Kitchen - ส่งอาหาร" : "Tony's Kitchen - Rider"}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block font-semibold">
              {language === 'th' ? 'ออเดอร์ต้องส่ง' : 'Active'}
            </span>
            <span className="text-xl font-mono font-black text-orange-400">
              {activeDeliveryOrders.length}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Success Alert Banner when order completed */}
        {justCompletedOrderId && (
          <div className="p-4 rounded-2xl bg-emerald-900/90 border border-emerald-500 text-white flex items-center gap-3 shadow-xl animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">
                {language === 'th' ? 'ส่งอาหารเรียบร้อยแล้ว!' : 'Order Delivered Successfully!'}
              </h4>
              <p className="text-xs text-emerald-200">
                {language === 'th'
                  ? 'ระบบเปลี่ยนปุ่มที่หน้าร้านเป็น JOB DONE เรียบร้อยแล้ว'
                  : 'Shop dashboard has automatically updated to JOB DONE.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher: Active vs Delivered Today */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('delivering')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'delivering'
                ? 'bg-orange-500 text-neutral-950 shadow-md shadow-orange-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>
              {language === 'th' ? 'ออเดอร์ที่ต้องส่ง' : 'To Deliver'} ({activeDeliveryOrders.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {language === 'th' ? 'ส่งเสร็จแล้ววันนี้' : 'Delivered Today'} ({completedTodayOrders.length})
            </span>
          </button>
        </div>

        {/* ---------------- ACTIVE DELIVERIES TAB ---------------- */}
        {activeTab === 'delivering' && (
          <div className="space-y-4">
            {activeDeliveryOrders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {language === 'th' ? 'ไม่มีออเดอร์ที่ต้องไปส่งในขณะนี้' : 'No active deliveries right now'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {language === 'th'
                    ? 'เมื่อร้านค้ากด "On the way" ออเดอร์จะปรากฏที่หน้านี้โดยอัตโนมัติแบบ Real-Time'
                    : 'When the restaurant sets an order to "On the way", it will appear here instantly.'}
                </p>
              </div>
            ) : (
              activeDeliveryOrders.map((order) => {
                const isSubmitting = submittingOrderId === order.id;
                const isExpanded = Boolean(expandedItems[order.id]);
                const isPaid = order.paymentStatus === 'paid';
                const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="bg-neutral-900 border-2 border-orange-500/40 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden"
                  >
                    {/* Top Status & Order Number Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-neutral-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl sm:text-2xl font-black text-orange-400 tracking-tight">
                            {order.orderNumberFormatted}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-black uppercase">
                            {order.status === 'on_the_way'
                              ? (language === 'th' ? 'กำลังเดินทางไปส่ง' : 'On the way')
                              : (language === 'th' ? 'เตรียมจัดส่ง' : 'Ready for delivery')}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{language === 'th' ? 'รับออเดอร์เมื่อ' : 'Ordered at'} {formattedTime}</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                          {language === 'th' ? 'ยอดรวม' : 'Total'}
                        </span>
                        <span className="font-mono text-xl font-black text-white">
                          ฿{order.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info Card: Name, Call, Address, Maps */}
                    <div className="space-y-3 bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800">
                      {/* Customer Name & Phone Call Button */}
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                            {language === 'th' ? 'ลูกค้าผู้รับ' : 'Customer'}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white">
                            {order.customer?.name || 'Customer'}
                          </h3>
                        </div>

                        {order.customer?.phone && order.customer.phone !== '-' && (
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-transform active:scale-95"
                          >
                            <Phone className="w-4 h-4 stroke-[2.5]" />
                            <span>{language === 'th' ? 'โทรหาลูกค้า' : 'Call'}</span>
                          </a>
                        )}
                      </div>

                      {/* Delivery Address & Google Maps Navigation Button */}
                      <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-neutral-200">
                            <span className="font-bold text-white block">
                              {language === 'th' ? 'ที่อยู่จัดส่ง:' : 'Delivery Address:'}
                            </span>
                            <p className="mt-0.5 leading-relaxed font-medium">
                              {order.customer?.deliveryAddress || (language === 'th' ? 'ไม่ระบุที่อยู่ชัดเจน' : 'No address specified')}
                            </p>
                          </div>
                        </div>

                        {/* Note to Rider if any */}
                        {order.customer?.notes && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                            <span className="font-bold">{language === 'th' ? 'หมายเหตุจากลูกค้า: ' : 'Customer Note: '}</span>
                            {order.customer.notes}
                          </div>
                        )}

                        {/* 1-Tap Google Maps & In-App Map with Exact GPS Pin */}
                        {(order.customer?.deliveryAddress || order.customer?.mapsUrl || order.customer?.latitude) && (
                          <div className="space-y-2 pt-1">
                            {order.customer?.latitude && order.customer?.longitude ? (
                              <>
                                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                    <div className="min-w-0">
                                      <span className="font-black text-white block">
                                        {language === 'th' ? '📍 เชื่อมโยงหมุด GPS ตรงจุดจากลูกค้า' : '📍 Linked Exact Customer GPS Pin'}
                                      </span>
                                      <span className="font-mono text-[10px] text-emerald-400 block truncate">
                                        {order.customer.latitude.toFixed(6)}, {order.customer.longitude.toFixed(6)}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setMapModalOrder(order)}
                                    className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-neutral-950 font-black text-[11px] flex items-center gap-1 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
                                  >
                                    <Map className="w-3.5 h-3.5" />
                                    <span>{language === 'th' ? 'ดูแผนที่' : 'View Map'}</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Direct Turn-by-Turn GPS Navigation Button */}
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.customer.latitude},${order.customer.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-transform active:scale-95 cursor-pointer"
                                  >
                                    <Navigation className="w-4 h-4 text-white" />
                                    <span>{language === 'th' ? '🚀 เริ่มนำทาง (Google Maps)' : 'Start GPS Navigation'}</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                  </a>

                                  {/* Pin on Google Maps */}
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-4 h-4 text-orange-400" />
                                    <span>{language === 'th' ? 'ดูหมุดบน Google Maps' : 'View Pin on Google Maps'}</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                  </a>
                                </div>
                              </>
                            ) : (
                              /* Fallback text search if no GPS pin */
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  order.customer?.deliveryAddress || ''
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                              >
                                <Navigation className="w-4 h-4 text-blue-400" />
                                <span>{language === 'th' ? 'เปิดแผนที่ค้นหาที่อยู่ (Google Maps)' : 'Search Address on Google Maps'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment Status Check: Cash to collect vs Paid */}
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 font-semibold">
                          {language === 'th' ? 'สถานะชำระเงิน:' : 'Payment:'}
                        </span>
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-black flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{language === 'th' ? 'ชำระเงินเรียบร้อยแล้ว (ไม่ต้องเก็บเงิน)' : 'PAID (Do not collect)'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500/40 text-amber-300 font-black flex items-center gap-1.5 animate-pulse">
                            <Banknote className="w-3.5 h-3.5" />
                            <span>
                              {language === 'th'
                                ? `เก็บเงินสด ฿${order.total.toLocaleString()}`
                                : `Collect Cash ฿${order.total.toLocaleString()}`}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Food Items Accordion (so rider knows what bags to carry) */}
                    <div className="bg-neutral-950/40 border border-neutral-800 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleItemsExpand(order.id)}
                        className="w-full p-3 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-orange-400" />
                          <span>
                            {language === 'th' ? 'รายการอาหารในกล่อง' : 'Dishes in order'} ({order.items?.length || 0})
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 pt-0 border-t border-neutral-800/60 space-y-2 text-xs">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-start justify-between py-1 border-b border-neutral-800/40 last:border-0">
                              <div>
                                <span className="font-bold text-white">
                                  {language === 'th' ? (item.name.th || item.name.en) : item.name.en}
                                </span>
                                {item.selectedMainOption && (
                                  <span className="text-[11px] text-orange-400 font-bold block">
                                    • {language === 'th' ? 'ตัวเลือกหลัก' : 'Main'}: {language === 'th' ? (item.selectedMainOption.name.th || item.selectedMainOption.name.en) : (item.selectedMainOption.name.en || item.selectedMainOption.name.th)}
                                  </span>
                                )}
                                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                  <span className="text-[11px] text-neutral-400 block">
                                    + {item.selectedModifiers.map((m) => language === 'th' ? m.optionName.th : m.optionName.en).join(', ')}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-black text-orange-400 shrink-0 ml-2">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PRIMARY ACTION BUTTON: "ส่งเรียบร้อยแล้ว" */}
                    <div className="pt-2">
                      <button
                        type="button"
                        id={`btn-rider-delivered-${order.id}`}
                        disabled={isSubmitting}
                        onClick={() => handleMarkAsDelivered(order)}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 active:scale-[0.99] text-white font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 border border-emerald-400/40 transition-all cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>{language === 'th' ? 'กำลังบันทึก...' : 'Updating...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                            <span>{language === 'th' ? 'ส่งเรียบร้อยแล้ว' : 'Delivered (Job Done)'}</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-center text-neutral-400 mt-2">
                        {language === 'th'
                          ? '💡 เมื่อกดปุ่มนี้ ระบบจะอัปเดตสถานะที่ร้านค้าเป็น JOB DONE ทันที'
                          : '💡 Clicking this updates the restaurant app status to JOB DONE immediately.'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ---------------- COMPLETED DELIVERIES TODAY TAB ---------------- */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedTodayOrders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-neutral-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  {language === 'th' ? 'ยังไม่มีออเดอร์ที่ส่งเสร็จในวันนี้' : 'No completed deliveries today'}
                </h4>
              </div>
            ) : (
              completedTodayOrders.map((order) => {
                const completedTime = order.completedAt
                  ? new Date(order.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '-';
                return (
                  <div
                    key={order.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {order.orderNumberFormatted}
                        </span>
                        <span className="font-bold text-white">{order.customer?.name}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 block line-clamp-1">
                        📍 {order.customer?.deliveryAddress || '-'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-black text-[11px]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>JOB DONE</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-1">
                        {completedTime}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* In-App Interactive Map Modal for Rider */}
      {mapModalOrder && (
        <InteractiveMapModal
          isOpen={Boolean(mapModalOrder)}
          onClose={() => setMapModalOrder(null)}
          initialLat={mapModalOrder.customer?.latitude}
          initialLng={mapModalOrder.customer?.longitude}
          isViewOnly={true}
          title={
            language === 'th'
              ? `หมุดจัดส่งของออเดอร์ ${mapModalOrder.orderNumberFormatted}`
              : `Delivery Pin for ${mapModalOrder.orderNumberFormatted}`
          }
          addressText={mapModalOrder.customer?.deliveryAddress}
          language={language}
        />
      )}
    </div>
  );
};
