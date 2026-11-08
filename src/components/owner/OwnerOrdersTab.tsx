import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  RestaurantOrder,
  OrderStatus,
  OrderSource,
  NotificationSoundType,
  OrderType,
  PaymentMethod,
} from '../../types';
import {
  updateOrderStatus,
  updateOrderPaymentStatus,
  createRestaurantOrder,
} from '../../utils/orderSync';
import {
  playNotificationSound,
  unlockAudioContext,
  requestNotificationPermission,
} from '../../utils/soundAlarm';
import { getRiderShareUrl } from '../../utils/navigation';
import {
  Bell,
  Volume2,
  VolumeX,
  Search,
  CheckCircle2,
  Bike,
  Store,
  XCircle,
  AlertTriangle,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  Printer,
  ShoppingBag,
  Plus,
  X,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Copy,
  ExternalLink,
  HardDrive,
  Navigation,
} from 'lucide-react';
import { OwnerOrderHistoryModal } from './OwnerOrderHistoryModal';
import { POSPrinterModal } from './POSPrinterModal';
import { posPrinterService } from '../../services/posPrinterService';

export const OwnerOrdersTab: React.FC = () => {
  const {
    allOrders,
    pendingOrdersCount,
    isAlarmActive,
    muteAlarm,
    settings,
    updateSettings,
    language,
    t,
  } = useRestaurant();

  // Filter States
  const [sourceFilter, setSourceFilter] = useState<'all' | OrderSource>('all');
  const [statusFilter, setStatusFilter] = useState<'pending_accepted' | 'on_the_way' | 'completed' | 'cancelled' | 'all'>('pending_accepted');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDateFilter, setActiveDateFilter] = useState<'today' | 'all'>('today');

  // Selected Order for Receipt Printing or Detailed Modal
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<RestaurantOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<RestaurantOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isOwnerHistoryModalOpen, setIsOwnerHistoryModalOpen] = useState<boolean>(false);
  const [isPOSPrinterModalOpen, setIsPOSPrinterModalOpen] = useState<boolean>(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);

  // Rider link copy status
  const [copiedRiderLink, setCopiedRiderLink] = useState(false);

  const handleCopyRiderLink = async () => {
    const url = getRiderShareUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedRiderLink(true);
      setTimeout(() => setCopiedRiderLink(false), 3000);
    } catch {
      setCopiedRiderLink(true);
      setTimeout(() => setCopiedRiderLink(false), 3000);
    }
  };

  // Reorderable Status Filter Tabs State (Supports Mouse Drag & Drop and Left-Right Arrow Reordering)
  type StatusTabKey = 'pending_accepted' | 'on_the_way' | 'completed' | 'cancelled' | 'all';
  const INITIAL_STATUS_TABS: StatusTabKey[] = [
    'pending_accepted',
    'on_the_way',
    'completed',
    'cancelled',
    'all',
  ];

  const [statusTabsOrder, setStatusTabsOrder] = useState<StatusTabKey[]>(() => {
    if (typeof window === 'undefined') return INITIAL_STATUS_TABS;
    try {
      const saved = localStorage.getItem('tk_status_tabs_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === INITIAL_STATUS_TABS.length) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_STATUS_TABS;
  });

  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);

  const moveStatusTab = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= statusTabsOrder.length) return;
    const newOrder = [...statusTabsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setStatusTabsOrder(newOrder);
    try {
      localStorage.setItem('tk_status_tabs_order', JSON.stringify(newOrder));
    } catch {}
  };

  const handleTabDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTabDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedTabIndex === null || draggedTabIndex === dropIndex) return;
    const newOrder = [...statusTabsOrder];
    const [removed] = newOrder.splice(draggedTabIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    setStatusTabsOrder(newOrder);
    setDraggedTabIndex(null);
    try {
      localStorage.setItem('tk_status_tabs_order', JSON.stringify(newOrder));
    } catch {}
  };

  // Add External Order Modal State
  const [isAddExternalModalOpen, setIsAddExternalModalOpen] = useState<boolean>(false);
  const [externalSource, setExternalSource] = useState<'line' | 'whatsapp'>('line');
  const [externalOrderType, setExternalOrderType] = useState<OrderType>('pickup');
  const [externalCustomerName, setExternalCustomerName] = useState<string>('');
  const [externalCustomerPhone, setExternalCustomerPhone] = useState<string>('');
  const [externalDeliveryAddress, setExternalDeliveryAddress] = useState<string>('');
  const [externalItemsSummary, setExternalItemsSummary] = useState<string>('');
  const [externalTotal, setExternalTotal] = useState<string>('');
  const [externalPaymentMethod, setExternalPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmittingExternal, setIsSubmittingExternal] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Sound settings
  const currentSound: NotificationSoundType = settings.notificationSound || 'sound1';

  const handleSoundChange = (newSound: NotificationSoundType) => {
    updateSettings({ notificationSound: newSound });
    playNotificationSound(newSound);
  };

  const handleTestSound = (sound: NotificationSoundType) => {
    playNotificationSound(sound);
  };

  const handleEnableAudioAndNotifications = async () => {
    await unlockAudioContext();
    playNotificationSound(currentSound);
    const perm = await requestNotificationPermission();
    setNotificationStatus(perm === 'granted' ? 'granted' : 'denied');
  };

  // Status update actions
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    try {
      setIsUpdatingStatus(orderId);
      await updateOrderStatus(orderId, newStatus, reason ? { cancelReason: reason } : undefined);

      // Auto-print order immediately when store clicks Accept Order if POS printer is connected!
      if (newStatus === 'accepted') {
        const targetOrder = allOrders.find((o) => o.id === orderId);
        if (targetOrder && posPrinterService.isConnected()) {
          try {
            const printRes = await posPrinterService.printOrder(targetOrder);
            if (printRes.success) {
              setPrintSuccessNotice(
                language === 'th'
                  ? `รับออเดอร์และพิมพ์ใบออเดอร์ ${targetOrder.orderNumberFormatted || '#' + targetOrder.orderNumber} ไปยังเครื่องพิมพ์ POS เรียบร้อยแล้ว!`
                  : `Order ${targetOrder.orderNumberFormatted || '#' + targetOrder.orderNumber} accepted & printed directly to POS printer!`
              );
              setTimeout(() => setPrintSuccessNotice(null), 3500);
            }
          } catch (printErr) {
            console.warn('POS auto-print notice:', printErr);
          }
        }
      }

      if (cancellingOrderId === orderId) {
        setCancellingOrderId(null);
        setCancelReason('');
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      alert(err?.message || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleTogglePayment = async (order: RestaurantOrder) => {
    const nextStatus = order.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await updateOrderPaymentStatus(order.id, nextStatus);
    } catch (err: any) {
      console.error('Failed to update payment status:', err);
    }
  };

  // Handle Manual External Order Submission
  const handleCreateExternalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalCustomerName.trim() || !externalTotal.trim()) return;

    try {
      setIsSubmittingExternal(true);
      const totalNum = parseFloat(externalTotal) || 0;

      await createRestaurantOrder({
        source: externalSource,
        orderType: externalOrderType,
        paymentMethod: externalPaymentMethod,
        customer: {
          name: externalCustomerName.trim(),
          phone: externalCustomerPhone.trim() || '-',
          deliveryAddress: externalOrderType === 'delivery' ? externalDeliveryAddress.trim() : '',
          notes: externalItemsSummary.trim(),
        },
        items: [
          {
            menuItemId: 'external_manual_item',
            name: {
              en: externalItemsSummary.trim() || `${externalSource.toUpperCase()} Order`,
              th: externalItemsSummary.trim() || `ออเดอร์ผ่าน ${externalSource.toUpperCase()}`,
            },
            basePrice: totalNum,
            unitPrice: totalNum,
            quantity: 1,
            subtotal: totalNum,
            selectedModifiers: [],
            specialRequest: externalItemsSummary.trim(),
          },
        ],
        subtotal: totalNum,
        total: totalNum,
        currencySymbol: '฿',
        clientToken: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });

      // Reset form & close modal
      setExternalCustomerName('');
      setExternalCustomerPhone('');
      setExternalDeliveryAddress('');
      setExternalItemsSummary('');
      setExternalTotal('');
      setIsAddExternalModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create external order:', err);
      alert(err?.message || 'Failed to record external order');
    } finally {
      setIsSubmittingExternal(false);
    }
  };

  // Status category counts for badges
  const pendingAcceptedCount = useMemo(() => {
    return allOrders.filter(
      (o) =>
        (o.status === 'pending' || o.status === 'accepted') &&
        o.orderNumber !== 1027 &&
        o.orderNumberFormatted !== '#1027'
    ).length;
  }, [allOrders]);

  const onTheWayReadyCount = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.status === 'on_the_way' &&
        o.orderNumber !== 1027 &&
        o.orderNumberFormatted !== '#1027'
    ).length;
  }, [allOrders]);

  const completedOrdersCount = useMemo(() => {
    return allOrders.filter(
      (o) => o.status === 'completed' && o.orderNumber !== 1027 && o.orderNumberFormatted !== '#1027'
    ).length;
  }, [allOrders]);

  const cancelledOrdersCount = useMemo(() => {
    return allOrders.filter((o) => o.status === 'cancelled').length;
  }, [allOrders]);

  const allOrdersCount = useMemo(() => {
    return allOrders.filter((o) => o.orderNumber !== 1027 && o.orderNumberFormatted !== '#1027').length;
  }, [allOrders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const result = allOrders.filter((order) => {
      // Date filter (active pending/accepted orders in the kitchen are always visible)
      if (activeDateFilter === 'today' && order.status !== 'pending' && order.status !== 'accepted') {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDate !== today) return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && order.source !== sourceFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'pending_accepted') {
        if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') {
          return false;
        }
        return order.status === 'pending' || order.status === 'accepted';
      } else if (statusFilter === 'on_the_way') {
        if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') {
          return false;
        }
        if (order.status !== 'on_the_way') {
          return false;
        }
      } else if (statusFilter === 'completed') {
        if (order.status !== 'completed' || order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') {
          return false;
        }
      } else if (statusFilter === 'cancelled') {
        if (order.status !== 'cancelled') {
          return false;
        }
      } else if (statusFilter === 'all') {
        if (order.orderNumber === 1027 || order.orderNumberFormatted === '#1027') {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && order.orderType !== typeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = (order.orderNumberFormatted || '').toLowerCase().includes(q);
        const matchesName = (order.customer?.name || '').toLowerCase().includes(q);
        const matchesPhone = (order.customer?.phone || '').toLowerCase().includes(q);
        const matchesItem = (order.items || []).some(
          (i) => {
            const enName = i.name?.en || (typeof i.name === 'string' ? i.name : '');
            const thName = i.name?.th || '';
            return enName.toLowerCase().includes(q) || thName.toLowerCase().includes(q);
          }
        );
        if (!matchesNumber && !matchesName && !matchesPhone && !matchesItem) {
          return false;
        }
      }

      return true;
    });

    // สำหรับหมวด "เสร็จสิ้น" (completed): เรียงลำดับจากเลขมากไปน้อย หรือออเดอร์ที่เสร็จล่าสุดอยู่บนสุด
    if (statusFilter === 'completed') {
      return result.sort((a, b) => {
        const timeA = new Date(a.completedAt || a.createdAt).getTime();
        const timeB = new Date(b.completedAt || b.createdAt).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA;
        }
        return (b.orderNumber || 0) - (a.orderNumber || 0);
      });
    }

    // หมวดอื่นๆ: เรียงลำดับ มาก่อน อยู่บน มาใหม่อยู่ล่าง (Oldest on top, newly arrived orders at bottom)
    return result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.orderNumber || 0) - (b.orderNumber || 0);
    });
  }, [allOrders, activeDateFilter, sourceFilter, statusFilter, typeFilter, searchQuery]);

  const latestPendingOrder = useMemo(() => {
    return allOrders
      .filter(
        (o) =>
          o.status === 'pending' &&
          o.orderNumber !== 1027 &&
          o.orderNumberFormatted !== '#1027'
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  }, [allOrders]);

  const handlePrintReceipt = async (order: RestaurantOrder) => {
    // 1. If POS thermal printer is connected via Web Serial/USB, print directly without Windows dialog!
    if (posPrinterService.isConnected()) {
      const res = await posPrinterService.printOrder(order);
      if (res.success) {
        setPrintSuccessNotice(
          language === 'th'
            ? `พิมพ์ใบออเดอร์ ${order.orderNumberFormatted || '#' + order.orderNumber} ไปยังเครื่องพิมพ์ POS เรียบร้อยแล้ว!`
            : `Order ${order.orderNumberFormatted || '#' + order.orderNumber} printed directly to POS printer!`
        );
        setTimeout(() => setPrintSuccessNotice(null), 3500);
        return;
      }
    }

    // 2. Fallback to standard print dialog
    setSelectedOrderForPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="owner-orders-tab">
      {/* Top alert banner removed per user request: alerts are now placed directly on the incoming order cards */}

      {/* POS Direct Print Success Toast Banner */}
      {printSuccessNotice && (
        <div className="p-3.5 bg-emerald-500 text-neutral-950 font-extrabold text-xs rounded-2xl flex items-center gap-2.5 shadow-lg border border-emerald-400 animate-fade-in">
          <Printer className="w-4 h-4 stroke-[2.5]" />
          <span>{printSuccessNotice}</span>
        </div>
      )}

      {/* Filter Bar & Add External Order Action (Search input removed per owner request) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Toggle */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
            <button
              id="filter-date-today"
              type="button"
              onClick={() => setActiveDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeDateFilter === 'today'
                  ? 'bg-orange-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('todayOrders')}
            </button>
            <button
              id="filter-date-all"
              type="button"
              onClick={() => setActiveDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeDateFilter === 'all'
                  ? 'bg-orange-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('allTimeOrders')}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Rider Link Button */}
            <button
              id="btn-copy-rider-link"
              type="button"
              onClick={handleCopyRiderLink}
              title={getRiderShareUrl()}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                copiedRiderLink
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-orange-400 border-neutral-700'
              }`}
            >
              {copiedRiderLink ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{language === 'th' ? 'คัดลอกลิงก์ Rider แล้ว!' : 'Copied Rider Link!'}</span>
                </>
              ) : (
                <>
                  <Bike className="w-4 h-4" />
                  <span>{language === 'th' ? 'ลิงก์สำหรับ Rider' : 'Rider Link'}</span>
                  <Copy className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>

            {/* + Add External Order Button */}
            <button
              id="btn-add-external-order"
              type="button"
              onClick={() => setIsAddExternalModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('logExternalOrder')}</span>
            </button>

            {/* Local Device History Ledger Button */}
            <button
              id="btn-owner-local-history"
              type="button"
              onClick={() => setIsOwnerHistoryModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 shrink-0"
              title={language === 'th' ? 'ประวัติออเดอร์ในเครื่องร้านค้า (บันทึกไว้อย่างน้อย 20 รายการ)' : 'Store Local Ledger (20+ orders)'}
            >
              <HardDrive className="w-4 h-4 text-orange-400" />
              <span>{language === 'th' ? 'ประวัติในเครื่อง (20+)' : 'Local Ledger (20+)'}</span>
            </button>

            {/* POS Thermal Printer Settings Button */}
            <button
              id="btn-pos-printer-settings"
              type="button"
              onClick={() => setIsPOSPrinterModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 shrink-0"
              title={language === 'th' ? 'ตั้งค่าเครื่องพิมพ์ใบเสร็จ POS (ESC/POS)' : 'POS Printer Setup'}
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>{language === 'th' ? 'เครื่องพิมพ์ POS' : 'POS Printer'}</span>
              {posPrinterService.isConnected() && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Multi-category filter tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Status Filter - Reorderable via Mouse Drag & Drop AND Left-Right Arrow Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <span className="text-neutral-500 text-[11px] font-semibold uppercase mr-1 shrink-0">
              {t('status')}:
            </span>

            {statusTabsOrder.map((tabKey, idx) => {
              if (tabKey === 'pending_accepted') {
                const isActive = statusFilter === 'pending_accepted';
                return (
                  <div
                    key={tabKey}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, idx)}
                    onDragOver={handleTabDragOver}
                    onDrop={(e) => handleTabDrop(e, idx)}
                    className={`flex items-center rounded-xl transition-all select-none shrink-0 ${
                      draggedTabIndex === idx ? 'opacity-40 ring-2 ring-orange-400' : ''
                    } ${
                      isActive
                        ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                        : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
                    }`}
                  >
                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'left');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <button
                      id="status-filter-pending-accepted"
                      type="button"
                      onClick={() => setStatusFilter('pending_accepted')}
                      className="px-2 py-1.5 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Pending, Accepted</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-neutral-950 text-amber-400 font-bold'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {pendingAcceptedCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                      disabled={idx === statusTabsOrder.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'right');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              if (tabKey === 'on_the_way') {
                const isActive = statusFilter === 'on_the_way';
                return (
                  <div
                    key={tabKey}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, idx)}
                    onDragOver={handleTabDragOver}
                    onDrop={(e) => handleTabDrop(e, idx)}
                    className={`flex items-center rounded-xl transition-all select-none shrink-0 ${
                      draggedTabIndex === idx ? 'opacity-40 ring-2 ring-orange-400' : ''
                    } ${
                      isActive
                        ? 'bg-orange-500 text-neutral-950 shadow-md shadow-orange-500/20'
                        : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
                    }`}
                  >
                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'left');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <button
                      id="status-filter-on-the-way"
                      type="button"
                      onClick={() => setStatusFilter('on_the_way')}
                      className="px-2 py-1.5 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>On the way</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-neutral-950 text-orange-400 font-bold'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {onTheWayReadyCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                      disabled={idx === statusTabsOrder.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'right');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              if (tabKey === 'completed') {
                const isActive = statusFilter === 'completed';
                return (
                  <div
                    key={tabKey}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, idx)}
                    onDragOver={handleTabDragOver}
                    onDrop={(e) => handleTabDrop(e, idx)}
                    className={`flex items-center rounded-xl transition-all select-none shrink-0 ${
                      draggedTabIndex === idx ? 'opacity-40 ring-2 ring-orange-400' : ''
                    } ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
                    }`}
                  >
                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'left');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <button
                      id="status-filter-completed"
                      type="button"
                      onClick={() => setStatusFilter('completed')}
                      className="px-2 py-1.5 text-[11px] font-bold capitalize flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t('status_completed')}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-200'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {completedOrdersCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                      disabled={idx === statusTabsOrder.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'right');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              if (tabKey === 'cancelled') {
                const isActive = statusFilter === 'cancelled';
                return (
                  <div
                    key={tabKey}
                    draggable
                    onDragStart={(e) => handleTabDragStart(e, idx)}
                    onDragOver={handleTabDragOver}
                    onDrop={(e) => handleTabDrop(e, idx)}
                    className={`flex items-center rounded-xl transition-all select-none shrink-0 ${
                      draggedTabIndex === idx ? 'opacity-40 ring-2 ring-orange-400' : ''
                    } ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
                    }`}
                  >
                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'left');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <button
                      id="status-filter-cancelled"
                      type="button"
                      onClick={() => setStatusFilter('cancelled')}
                      className="px-2 py-1.5 text-[11px] font-bold capitalize flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t('status_cancelled')}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-red-950 text-red-200'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {cancelledOrdersCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                      disabled={idx === statusTabsOrder.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveStatusTab(idx, 'right');
                      }}
                      className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              // tabKey === 'all'
              const isActive = statusFilter === 'all';
              return (
                <div
                  key={tabKey}
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, idx)}
                  onDragOver={handleTabDragOver}
                  onDrop={(e) => handleTabDrop(e, idx)}
                  className={`flex items-center rounded-xl transition-all select-none shrink-0 ${
                    draggedTabIndex === idx ? 'opacity-40 ring-2 ring-orange-400' : ''
                  } ${
                    isActive
                      ? 'bg-neutral-700 text-white border border-neutral-600'
                      : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
                  }`}
                >
                  <button
                    type="button"
                    title={language === 'th' ? 'เลื่อนซ้าย' : 'Move Left'}
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStatusTab(idx, 'left');
                    }}
                    className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>

                  <button
                    id="status-filter-all"
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="px-2 py-1.5 text-[11px] font-bold capitalize flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{t('all')}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-neutral-900 text-neutral-200'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {allOrdersCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    title={language === 'th' ? 'เลื่อนขวา' : 'Move Right'}
                    disabled={idx === statusTabsOrder.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStatusTab(idx, 'right');
                    }}
                    className="px-1 py-1.5 text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500 text-[11px] font-semibold uppercase mr-1">
              {t('type')}:
            </span>
            {(['all', 'pickup', 'delivery'] as const).map((type) => (
              <button
                key={type}
                id={`type-filter-${type}`}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                  typeFilter === type
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                }`}
              >
                {type === 'all' ? t('all') : t(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white">
            {t('noOrdersFound')}
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {t('noOrdersFoundDesc')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isAccepted = order.status === 'accepted';
            const isOnTheWay = order.status === 'on_the_way';
            const isCompleted = order.status === 'completed';
            const isCancelled = order.status === 'cancelled';
            const isDelivery = order.orderType === 'delivery';

            const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const formattedDate = new Date(order.createdAt).toLocaleDateString();

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                onClick={() => setSelectedOrderForDetail(order)}
                className={`bg-neutral-900 border rounded-2xl p-4 sm:p-5 shadow-lg transition-all cursor-pointer hover:border-orange-500/50 group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending
                    ? 'border-2 border-red-500 ring-2 ring-red-500/30 shadow-xl shadow-red-500/20 animate-pulse'
                    : isOnTheWay
                    ? 'border-orange-500/50'
                    : isAccepted
                    ? 'border-blue-500/40'
                    : isCompleted
                    ? 'border-neutral-800 opacity-90'
                    : 'border-neutral-800/80 opacity-70'
                }`}
              >
                {/* 1. Left/Center: Order Number, Alert Badge (if pending), and Customer Name */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
                  {/* Order Number & Alert Notification Badge on Card */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono text-xl sm:text-2xl font-black text-white group-hover:text-orange-400 transition-colors">
                      {order.orderNumberFormatted || `#${order.orderNumber}`}
                    </span>
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 animate-bounce shrink-0">
                        <Bell className="w-3.5 h-3.5 fill-current" />
                        <span>{language === 'th' ? 'ออเดอร์ใหม่!' : 'NEW ORDER!'}</span>
                      </span>
                    )}
                  </div>

                  {/* Customer Name */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      {language === 'th' ? 'ชื่อลูกค้า' : 'Customer'}
                    </span>
                    <span className="font-extrabold text-white text-base sm:text-lg truncate block">
                      {order.customer?.name || (language === 'th' ? 'ลูกค้า' : 'Customer')}
                    </span>
                  </div>
                </div>

                {/* 2. Right: Total & Action Buttons */}
                <div
                  className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Food Total */}
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      {t('total')}
                    </span>
                    <span className="font-mono text-lg sm:text-2xl font-black text-orange-400">
                      ฿{order.total.toLocaleString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <>
                        <button
                          id={`btn-accept-order-${order.id}`}
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleStatusChange(order.id, 'accepted')}
                          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>{t('acceptOrderBtn')}</span>
                        </button>

                        <button
                          id={`btn-cancel-order-${order.id}`}
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => setCancellingOrderId(order.id)}
                          className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-red-950 hover:text-red-400 active:scale-95 text-neutral-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t('cancelOrderBtn')}</span>
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        id={`btn-ontheway-order-${order.id}`}
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleStatusChange(order.id, 'on_the_way')}
                        className="py-2 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md bg-orange-500 hover:bg-orange-600 text-neutral-950 transition-all cursor-pointer"
                      >
                        <Bike className="w-4 h-4" />
                        <span>On the way</span>
                      </button>
                    )}

                    {isOnTheWay && (
                      <button
                        id={`btn-complete-ontheway-${order.id}`}
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete</span>
                      </button>
                    )}

                    {/* In completed tab, only order number, customer name, and total are shown */}

                    {isCancelled && (
                      <span className="px-3 py-1.5 rounded-xl bg-red-950/80 text-red-400 border border-red-500/30 font-bold text-xs flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'ยกเลิกแล้ว' : 'Cancelled'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📄 ORDER DETAILS MODAL (แสดงรายละเอียดทั้งหมด พร้อมปุ่ม Print ใบ Order และ ปุ่ม ปิดหน้าต่าง) */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{language === 'th' ? 'รายละเอียดใบออเดอร์' : 'Order Details'}</span>
                    <span className="font-mono text-orange-400">{selectedOrderForDetail.orderNumberFormatted}</span>
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {new Date(selectedOrderForDetail.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForDetail(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              {/* Customer Info Card */}
              <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      {language === 'th' ? 'ชื่อลูกค้า' : 'Customer Name'}
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {selectedOrderForDetail.customer?.name || 'Customer'}
                    </span>
                  </div>
                  {selectedOrderForDetail.customer?.phone && selectedOrderForDetail.customer.phone !== '-' && (
                    <a
                      href={`tel:${selectedOrderForDetail.customer.phone}`}
                      className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-orange-400 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedOrderForDetail.customer.phone}</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">{language === 'th' ? 'วิธีรับ' : 'Order Type'}:</span>
                    <span className="font-bold text-white capitalize">
                      {selectedOrderForDetail.orderType === 'delivery' ? t('delivery') : t('pickup')}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">{language === 'th' ? 'การชำระเงิน' : 'Payment'}:</span>
                    <span className="font-bold text-white uppercase">
                      {selectedOrderForDetail.paymentMethod} ({(selectedOrderForDetail.paymentStatus || 'pending')})
                    </span>
                  </div>
                </div>

                {selectedOrderForDetail.orderType === 'delivery' && selectedOrderForDetail.customer?.deliveryAddress && (
                  <div className="pt-2 border-t border-neutral-800/80 text-[11px] space-y-1">
                    <span className="text-neutral-500 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-400" />
                        {language === 'th' ? 'ที่อยู่จัดส่ง' : 'Delivery Address'}:
                      </span>
                      {(selectedOrderForDetail.customer.mapsUrl || selectedOrderForDetail.customer.latitude) && (
                        <a
                          href={
                            selectedOrderForDetail.customer.mapsUrl ||
                            `https://www.google.com/maps/search/?api=1&query=${selectedOrderForDetail.customer.latitude},${selectedOrderForDetail.customer.longitude}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[10px]"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{language === 'th' ? '📍 ดูหมุด GPS' : '📍 View GPS'}</span>
                        </a>
                      )}
                    </span>
                    <span className="text-neutral-200 block">{selectedOrderForDetail.customer.deliveryAddress}</span>
                  </div>
                )}

                {selectedOrderForDetail.customer?.notes && (
                  <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-amber-300 italic">
                    Note: "{selectedOrderForDetail.customer.notes}"
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block">
                  {language === 'th' ? 'รายการอาหารที่สั่ง' : 'Ordered Food Items'} ({selectedOrderForDetail.items?.length || 0})
                </span>
                <div className="space-y-1.5">
                  {selectedOrderForDetail.items?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-white text-xs sm:text-sm">
                          <span className="text-orange-400 mr-2">{item.quantity}×</span>
                          {item.name?.[language] || item.name?.en || (typeof item.name === 'string' ? item.name : 'Custom Item')}
                        </div>
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="text-[11px] text-neutral-400 pl-4 mt-1 space-y-0.5">
                            {item.selectedModifiers.map((m, mIdx) => (
                              <div key={mIdx}>
                                + {m.optionName?.[language] || m.optionName?.en || (typeof m.optionName === 'string' ? m.optionName : '')}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.specialRequest && (
                          <p className="text-[11px] text-amber-300 italic pl-4 mt-0.5">
                            "{item.specialRequest}"
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-sm text-neutral-200">
                        ฿{item.subtotal?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between text-base">
                <span className="font-bold text-neutral-400">{language === 'th' ? 'ยอดรวมทั้งหมด' : 'Grand Total'}:</span>
                <span className="font-mono text-xl font-black text-orange-400">
                  ฿{selectedOrderForDetail.total?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modal Bottom Buttons: Print ใบ Order & ปิดหน้าต่าง */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center gap-3">
              <button
                type="button"
                id="modal-btn-print-order"
                onClick={() => handlePrintReceipt(selectedOrderForDetail)}
                className="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-neutral-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'th' ? 'Print ใบ Order' : 'Print Order Receipt'}</span>
              </button>

              <button
                type="button"
                id="modal-btn-close-order"
                onClick={() => setSelectedOrderForDetail(null)}
                className="py-3 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add External Order Modal (LINE, WhatsApp) */}
      {isAddExternalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{t('addExternalOrderModalTitle')}</h4>
                  <p className="text-[11px] text-neutral-400">{t('addExternalOrderModalDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExternalModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExternalOrder} className="space-y-3.5 text-xs">
              {/* Channel Selector */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  {t('orderChannelLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExternalSource('line')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      externalSource === 'line'
                        ? 'bg-green-500/20 text-green-400 border-green-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>LINE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExternalSource('whatsapp')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      externalSource === 'whatsapp'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  {t('orderType')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExternalOrderType('pickup')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      externalOrderType === 'pickup'
                        ? 'bg-orange-500 text-neutral-950 border-orange-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>{t('pickup')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExternalOrderType('delivery')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      externalOrderType === 'delivery'
                        ? 'bg-orange-500 text-neutral-950 border-orange-500'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>{t('delivery')}</span>
                  </button>
                </div>
              </div>

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={externalCustomerName}
                    onChange={(e) => setExternalCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    {t('phoneNumber')}
                  </label>
                  <input
                    type="tel"
                    value={externalCustomerPhone}
                    onChange={(e) => setExternalCustomerPhone(e.target.value)}
                    placeholder="081-234-5678"
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Delivery Address (if delivery) */}
              {externalOrderType === 'delivery' && (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    {t('deliveryAddress')} *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={externalDeliveryAddress}
                    onChange={(e) => setExternalDeliveryAddress(e.target.value)}
                    placeholder="House/Room No., Street, Landmark..."
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>
              )}

              {/* Items Summary & Total */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                  {t('orderItemsSummaryLabel')}
                </label>
                <textarea
                  rows={2}
                  value={externalItemsSummary}
                  onChange={(e) => setExternalItemsSummary(e.target.value)}
                  placeholder={t('orderItemsSummaryPlaceholder')}
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    {t('orderTotalLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={externalTotal}
                    onChange={(e) => setExternalTotal(e.target.value)}
                    placeholder="350"
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                    {t('paymentMethod')}
                  </label>
                  <select
                    value={externalPaymentMethod}
                    onChange={(e) => setExternalPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="cash">{t('cash')}</option>
                    <option value="qr_payment">{t('qrPayment')}</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingExternal}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingExternal ? 'Recording...' : t('logExternalOrder')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExternalModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{t('cancelOrderReasonTitle')}</span>
            </h4>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('cancelOrderReasonPlaceholder')}
              className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange(cancellingOrderId, 'cancelled', cancelReason)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                {t('confirmCancellation')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancellingOrderId(null);
                  setCancelReason('');
                }}
                className="py-2 px-3 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Hidden Element (For window.print()) */}
      {selectedOrderForPrint && (
        <div id="printable-kitchen-receipt" className="hidden print:block fixed inset-0 bg-white text-black p-6 font-mono text-sm">
          <div className="text-center pb-4 border-b border-dashed border-black">
            <h2 className="text-xl font-bold">TONY'S KITCHEN</h2>
            <p className="text-xs">ORDER {selectedOrderForPrint.orderNumberFormatted}</p>
            <p className="text-xs">{new Date(selectedOrderForPrint.createdAt).toLocaleString()}</p>
          </div>
          <div className="py-2 border-b border-dashed border-black text-xs space-y-1">
            <p><strong>Customer:</strong> {selectedOrderForPrint.customer?.name || 'Customer'}</p>
            <p><strong>Phone:</strong> {selectedOrderForPrint.customer?.phone || '-'}</p>
            <p><strong>Type:</strong> {(selectedOrderForPrint.orderType || '').toUpperCase()}</p>
            {selectedOrderForPrint.customer?.deliveryAddress && (
              <p><strong>Address:</strong> {selectedOrderForPrint.customer.deliveryAddress}</p>
            )}
            <p><strong>Payment:</strong> {(selectedOrderForPrint.paymentMethod || '').toUpperCase()} ({(selectedOrderForPrint.paymentStatus || 'pending').toUpperCase()})</p>
          </div>
          <div className="py-2 border-b border-dashed border-black space-y-2">
            {selectedOrderForPrint.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <div>
                  <p><strong>{item.quantity}x {item.name?.en || (typeof item.name === 'string' ? item.name : 'Custom Item')}</strong></p>
                  {item.selectedModifiers?.map((m, mIdx) => (
                    <p key={mIdx} className="pl-2">+ {m.optionName?.en || (typeof m.optionName === 'string' ? m.optionName : '')}</p>
                  ))}
                  {item.specialRequest && <p className="pl-2 italic">"{item.specialRequest}"</p>}
                </div>
                <span>฿{item.subtotal}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 text-right font-bold text-base">
            TOTAL: ฿{selectedOrderForPrint.total}
          </div>
        </div>
      )}

      {/* 📜 Store On-Device Local History Modal (at least 20 orders preserved locally) */}
      <OwnerOrderHistoryModal
        isOpen={isOwnerHistoryModalOpen}
        onClose={() => setIsOwnerHistoryModalOpen(false)}
      />

      {/* 🖨️ POS Thermal Receipt Printer Modal */}
      <POSPrinterModal
        isOpen={isPOSPrinterModalOpen}
        onClose={() => setIsPOSPrinterModalOpen(false)}
      />
    </div>
  );
};
