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
  ArrowLeft,
} from 'lucide-react';
import { RiderRouteMapModal } from './RiderRouteMapModal';
import {
  toLatLng,
  extractCoordsFromMapsUrl,
  buildGoogleMapsNavigationUrl,
} from '../../utils/geolocation';

export function filterActiveRiderOrders(orders: RestaurantOrder[]): RestaurantOrder[] {
  return orders
    .filter((order) => {
      if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') return false;
      return order.orderType === 'delivery' && order.status === 'on_the_way';
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export const RiderDashboard: React.FC = () => {
  const { allOrders, language } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'delivering' | 'completed'>('delivering');
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [justCompletedOrderId, setJustCompletedOrderId] = useState<string | null>(null);
  const [navigatingOrderId, setNavigatingOrderId] = useState<string | null>(null);
  const [mapModalOrder, setMapModalOrder] = useState<RestaurantOrder | null>(null);

  // Active deliveries: strictly delivery orders ONLY after the restaurant presses "On the way"
  const activeDeliveryOrders = useMemo(() => {
    return filterActiveRiderOrders(allOrders);
  }, [allOrders]);

  const navigatingOrder = useMemo(() => {
    if (!navigatingOrderId) return null;
    return activeDeliveryOrders.find((order) => order.id === navigatingOrderId) || null;
  }, [activeDeliveryOrders, navigatingOrderId]);

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

  // Track which order is being navigated in external Google Maps without unloading/replacing
  // the Rider window (preserving target="_blank" so iOS/Android Back returns straight here for Job Done).
  const handleDirectGoogleMapsNav = (orderId: string) => {
    setNavigatingOrderId(orderId);
  };

  // Handle Rider marking the order as Delivered
  const handleMarkAsDelivered = async (order: RestaurantOrder) => {
    if (submittingOrderId) return;
    setSubmittingOrderId(order.id);

    try {
      // 1. Update order status to 'completed' in Firestore and BroadcastChannel
      await updateOrderStatus(order.id, 'completed');
      setJustCompletedOrderId(order.id);
      if (navigatingOrderId === order.id) {
        setNavigatingOrderId(null);
      }
      if (mapModalOrder?.id === order.id) {
        setMapModalOrder(null);
      }

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
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] pb-16">
      {/* 1. Rider Top Banner / Header (Opaque solid surface prevents scroll overlap on iOS) */}
      <header className="sticky top-0 z-40 bg-[#171717] border-b border-[#262626] px-4 py-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F97316] flex items-center justify-center text-[#0A0A0A] shadow-md shrink-0">
              <Bike className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FB923C]">
                  Rider Delivery View
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#34D399] bg-[#064E3B] px-2 py-0.5 rounded-full border border-[#10B981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-ping" />
                  Live Sync
                </span>
              </div>
              <h1 className="text-sm sm:text-lg font-black text-[#FFFFFF] leading-tight truncate">
                {language === 'th' ? "Tony's Kitchen - ส่งอาหาร" : "Tony's Kitchen - Rider"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-[#A3A3A3] block font-semibold">
                {language === 'th' ? 'ออเดอร์ต้องส่ง' : 'Active'}
              </span>
              <span className="text-xl font-mono font-black text-[#FB923C]">
                {activeDeliveryOrders.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Active Navigation Return & Quick Job Done Banner (stays ready when returning from full-screen Google Maps) */}
        {navigatingOrder && (
          <div
            id="rider-nav-return-banner"
            className="p-4 rounded-2xl bg-[#1E3A8A] border-2 border-[#60A5FA] text-[#FFFFFF] space-y-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#2563EB] text-[#FFFFFF] font-mono font-black text-xs">
                    {navigatingOrder.orderNumberFormatted}
                  </span>
                  <span className="text-xs font-black text-[#DBEAFE]">
                    {language === 'th' ? 'กำลังนำทางผ่าน Google Maps' : 'Navigating in Google Maps'}
                  </span>
                </div>
                <p className="text-sm font-extrabold text-[#FFFFFF] mt-1 truncate">
                  {navigatingOrder.customer?.name || 'Customer'}
                </p>
                <p className="text-[11px] text-[#BFDBFE] mt-0.5 leading-snug">
                  {language === 'th'
                    ? 'หลังนำทางเสร็จ กดปุ่ม Back / เสร็จสิ้น (Done) กลับมาหน้านี้เพื่อกดปุ่มส่งเรียบร้อยแล้ว (Job Done)'
                    : 'Return from Google Maps using Back / Done, then tap Delivered (Job Done) below.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-rider-nav-back"
                onClick={() => {
                  setNavigatingOrderId(null);
                  setActiveTab('delivering');
                }}
                className="py-2.5 px-3 rounded-xl bg-[#262626] hover:bg-[#404040] border border-[#525252] text-[#FFFFFF] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'th' ? 'ย้อนกลับหน้ารายการ' : 'Back to Rider'}</span>
              </button>

              <button
                type="button"
                id="btn-rider-nav-job-done"
                disabled={submittingOrderId === navigatingOrder.id}
                onClick={() => handleMarkAsDelivered(navigatingOrder)}
                className="py-2.5 px-3 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:bg-[#065F46] border border-[#34D399] text-[#FFFFFF] font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'th' ? 'ส่งเรียบร้อยแล้ว (Job Done)' : 'Delivered (Job Done)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Alert Banner when order completed */}
        {justCompletedOrderId && (
          <div className="p-4 rounded-2xl bg-[#064E3B] border border-[#10B981] text-[#FFFFFF] flex items-center gap-3 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] text-[#0A0A0A] flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[#FFFFFF]">
                {language === 'th' ? 'ส่งอาหารเรียบร้อยแล้ว!' : 'Order Delivered Successfully!'}
              </h4>
              <p className="text-xs text-[#A7F3D0]">
                {language === 'th'
                  ? 'ระบบเปลี่ยนปุ่มที่หน้าร้านเป็น JOB DONE เรียบร้อยแล้ว'
                  : 'Shop dashboard has automatically updated to JOB DONE.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher: Active vs Delivered Today */}
        <div className="grid grid-cols-2 gap-2 bg-[#171717] p-1.5 rounded-2xl border border-[#262626]">
          <button
            type="button"
            onClick={() => setActiveTab('delivering')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'delivering'
                ? 'bg-[#F97316] text-[#0A0A0A] shadow-md'
                : 'bg-[#171717] text-[#A3A3A3] hover:text-[#FFFFFF]'
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
                ? 'bg-[#059669] text-[#FFFFFF] shadow-md'
                : 'bg-[#171717] text-[#A3A3A3] hover:text-[#FFFFFF]'
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
              <div className="bg-[#171717] border border-[#262626] rounded-3xl p-10 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#262626] text-[#737373] flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-base font-bold text-[#FFFFFF]">
                  {language === 'th' ? 'ไม่มีออเดอร์ที่ต้องไปส่งในขณะนี้' : 'No active deliveries right now'}
                </h3>
                <p className="text-xs text-[#A3A3A3] max-w-xs mx-auto">
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

                const customerCoords =
                  toLatLng(order.customer?.latitude, order.customer?.longitude) ||
                  extractCoordsFromMapsUrl(order.customer?.mapsUrl);
                const hasMapInfo = Boolean(
                  order.customer?.deliveryAddress || order.customer?.mapsUrl || customerCoords
                );
                const googleNavUrl = buildGoogleMapsNavigationUrl({
                  latitude: customerCoords?.lat,
                  longitude: customerCoords?.lng,
                  mapsUrl: order.customer?.mapsUrl,
                  address: order.customer?.deliveryAddress,
                });

                return (
                  <div
                    key={order.id}
                    className="bg-[#171717] border-2 border-[#EA580C] rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden"
                  >
                    {/* Top Status & Order Number Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#262626] pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xl sm:text-2xl font-black text-[#FB923C] tracking-tight">
                            {order.orderNumberFormatted}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#431407] text-[#FB923C] border border-[#EA580C] text-xs font-black uppercase">
                            {order.status === 'on_the_way'
                              ? (language === 'th' ? 'กำลังเดินทางไปส่ง' : 'On the way')
                              : (language === 'th' ? 'เตรียมจัดส่ง' : 'Ready for delivery')}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#A3A3A3] font-mono mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{language === 'th' ? 'รับออเดอร์เมื่อ' : 'Ordered at'} {formattedTime}</span>
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase text-[#A3A3A3] block">
                          {language === 'th' ? 'ยอดรวม' : 'Total'}
                        </span>
                        <span className="font-mono text-xl font-black text-[#FFFFFF]">
                          ฿{order.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info Card: Name, Call, Address, Maps */}
                    <div className="space-y-3 bg-[#0F0F0F] p-4 rounded-2xl border border-[#262626]">
                      {/* Customer Name & Phone Call Button */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase text-[#A3A3A3] block">
                            {language === 'th' ? 'ลูกค้าผู้รับ' : 'Customer'}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-[#FFFFFF] truncate">
                            {order.customer?.name || 'Customer'}
                          </h3>
                        </div>

                        {order.customer?.phone && order.customer.phone !== '-' && (
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#10B981] text-[#FFFFFF] font-extrabold text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95 shrink-0"
                          >
                            <Phone className="w-4 h-4 stroke-[2.5]" />
                            <span>{language === 'th' ? 'โทรหาลูกค้า' : 'Call'}</span>
                          </a>
                        )}
                      </div>

                      {/* Delivery Address & Google Maps Auto-Navigation */}
                      <div className="pt-2 border-t border-[#262626] space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-[#FB923C] shrink-0 mt-0.5" />
                          <div className="text-xs text-[#E5E5E5]">
                            <span className="font-bold text-[#FFFFFF] block">
                              {language === 'th' ? 'ที่อยู่จัดส่ง:' : 'Delivery Address:'}
                            </span>
                            <p className="mt-0.5 leading-relaxed font-medium text-[#E5E5E5]">
                              {order.customer?.deliveryAddress || (language === 'th' ? 'ไม่ระบุที่อยู่ชัดเจน' : 'No address specified')}
                            </p>
                          </div>
                        </div>

                        {/* Note to Rider if any */}
                        {order.customer?.notes && (
                          <div className="p-2.5 rounded-xl bg-[#451A03] border border-[#D97706] text-xs text-[#FDE68A]">
                            <span className="font-bold">{language === 'th' ? 'หมายเหตุจากลูกค้า: ' : 'Customer Note: '}</span>
                            {order.customer.notes}
                          </div>
                        )}

                        {/* 1-Tap Fullscreen Auto-Navigation Map (with Back + Job Done paired at bottom) + External Google Maps */}
                        {hasMapInfo && (
                          <div className="space-y-2 pt-1">
                            {customerCoords ? (
                              <>
                                <div className="p-2.5 rounded-xl bg-[#064E3B] border border-[#10B981] text-[#D1FAE5] text-xs flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-ping shrink-0" />
                                    <div className="min-w-0">
                                      <span className="font-black text-[#FFFFFF] block">
                                        {language === 'th' ? '📍 เชื่อมโยงหมุด GPS ตรงจุดจากลูกค้า' : '📍 Linked Exact Customer GPS Pin'}
                                      </span>
                                      <span className="font-mono text-[10px] text-[#6EE7B7] block truncate">
                                        {customerCoords.lat.toFixed(6)}, {customerCoords.lng.toFixed(6)}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md bg-[#047857] text-[#D1FAE5] font-bold text-[10px] shrink-0">
                                    GPS Ready
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Primary Fullscreen Auto-Navigation Map Modal */}
                                  <button
                                    type="button"
                                    id={`btn-rider-open-map-${order.id}`}
                                    onClick={() => setMapModalOrder(order)}
                                    className="py-3 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] border border-[#60A5FA] font-black text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
                                  >
                                    <Navigation className="w-4 h-4 text-[#FFFFFF]" />
                                    <span>{language === 'th' ? '🚀 เปิดแผนที่ & เริ่มนำทาง' : 'Open Route Map & Navigate'}</span>
                                  </button>

                                  {/* External Google Maps App Turn-by-Turn */}
                                  <a
                                    id={`btn-rider-ext-map-${order.id}`}
                                    href={googleNavUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleDirectGoogleMapsNav(order.id)}
                                    className="py-3 px-3 rounded-xl bg-[#262626] hover:bg-[#404040] border border-[#404040] text-[#F5F5F5] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-4 h-4 text-[#FB923C]" />
                                    <span>{language === 'th' ? 'เปิดแอป Google Maps' : 'Open Google Maps App'}</span>
                                    <ExternalLink className="w-3 h-3 opacity-80" />
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="space-y-2">
                                {/* Primary Button: Opens Fullscreen Auto-Resizing Map, Geocodes Address & Auto-Starts Turn-by-Turn Navigation */}
                                <button
                                  type="button"
                                  id={`btn-rider-open-map-${order.id}`}
                                  onClick={() => setMapModalOrder(order)}
                                  className="w-full py-3 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] border border-[#60A5FA] text-[#FFFFFF] font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                                >
                                  <Navigation className="w-4 h-4 text-[#FFFFFF]" />
                                  <span>{language === 'th' ? '🚀 เปิดแผนที่ค้นหาที่อยู่ & เริ่มนำทาง' : 'Open Route Map & Auto Navigate'}</span>
                                </button>

                                {/* Secondary External Google Maps Navigation Link */}
                                <a
                                  id={`btn-rider-ext-map-${order.id}`}
                                  href={googleNavUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleDirectGoogleMapsNav(order.id)}
                                  className="w-full py-2 px-3 rounded-xl bg-[#262626] hover:bg-[#333333] border border-[#404040] text-[#E5E5E5] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Map className="w-3.5 h-3.5 text-[#FB923C]" />
                                  <span>{language === 'th' ? 'เปิดในแอป Google Maps (ภายนอก)' : 'Open in External Google Maps'}</span>
                                  <ExternalLink className="w-3 h-3 opacity-80" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment Status Check: Cash to collect vs Paid */}
                      <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#A3A3A3] font-semibold">
                          {language === 'th' ? 'สถานะชำระเงิน:' : 'Payment:'}
                        </span>
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#064E3B] border border-[#10B981] text-[#6EE7B7] font-black flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{language === 'th' ? 'ชำระเงินเรียบร้อยแล้ว (ไม่ต้องเก็บเงิน)' : 'PAID (Do not collect)'}</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-[#451A03] border border-[#F59E0B] text-[#FDE68A] font-black flex items-center gap-1.5">
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
                    <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleItemsExpand(order.id)}
                        className="w-full p-3 flex items-center justify-between text-xs font-bold text-[#E5E5E5] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-[#FB923C]" />
                          <span>
                            {language === 'th' ? 'รายการอาหารในกล่อง' : 'Dishes in order'} ({order.items?.length || 0})
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 pt-2 border-t border-[#262626] space-y-2 text-xs bg-[#121212]">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-start justify-between py-1 border-b border-[#262626] last:border-0">
                              <div>
                                <span className="font-bold text-[#FFFFFF]">
                                  {language === 'th' ? (item.name.th || item.name.en) : item.name.en}
                                </span>
                                {item.selectedMainOption && (
                                  <span className="text-[11px] text-[#FB923C] font-bold block">
                                    • {language === 'th' ? 'ตัวเลือกหลัก' : 'Main'}: {language === 'th' ? (item.selectedMainOption.name.th || item.selectedMainOption.name.en) : (item.selectedMainOption.name.en || item.selectedMainOption.name.th)}
                                  </span>
                                )}
                                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                  <span className="text-[11px] text-[#A3A3A3] block">
                                    + {item.selectedModifiers.map((m) => language === 'th' ? m.optionName.th : m.optionName.en).join(', ')}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-black text-[#FB923C] shrink-0 ml-2">
                                x{item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PRIMARY ACTION BUTTON: "ส่งเรียบร้อยแล้ว / Delivered (Job Done)" */}
                    <div className="pt-2">
                      <button
                        type="button"
                        id={`btn-rider-delivered-${order.id}`}
                        disabled={isSubmitting}
                        onClick={() => handleMarkAsDelivered(order)}
                        className="w-full py-4 px-6 rounded-2xl bg-[#059669] hover:bg-[#047857] disabled:bg-[#065F46] active:scale-[0.99] text-[#FFFFFF] font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl border-2 border-[#34D399] transition-all cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin text-[#FFFFFF]" />
                            <span className="text-[#FFFFFF]">{language === 'th' ? 'กำลังบันทึก...' : 'Updating...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-6 h-6 stroke-[3] text-[#FFFFFF]" />
                            <span className="text-[#FFFFFF]">{language === 'th' ? 'ส่งเรียบร้อยแล้ว' : 'Delivered (Job Done)'}</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-center text-[#A3A3A3] mt-2">
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
              <div className="bg-[#171717] border border-[#262626] rounded-3xl p-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#525252] mx-auto" />
                <h4 className="text-sm font-bold text-[#FFFFFF]">
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
                    className="bg-[#171717] border border-[#262626] rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#34D399] text-sm">
                          {order.orderNumberFormatted}
                        </span>
                        <span className="font-bold text-[#FFFFFF] truncate">{order.customer?.name}</span>
                      </div>
                      <span className="text-[11px] text-[#A3A3A3] block line-clamp-1">
                        📍 {order.customer?.deliveryAddress || '-'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#064E3B] border border-[#10B981] text-[#6EE7B7] font-black text-[11px]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>JOB DONE</span>
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] block mt-1">
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

      {/* Fullscreen In-App Route Map Modal for Rider */}
      {mapModalOrder && (
        <RiderRouteMapModal
          isOpen={Boolean(mapModalOrder)}
          onClose={() => setMapModalOrder(null)}
          order={mapModalOrder}
          language={language}
          onMarkDelivered={handleMarkAsDelivered}
          isSubmittingDelivered={submittingOrderId === mapModalOrder.id}
        />
      )}
    </div>
  );
};

