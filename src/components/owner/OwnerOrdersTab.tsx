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
} from 'lucide-react';

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

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
      // NOTE: Do not call muteAlarm() here. If other pending orders remain, the alarm continues!
      // If no pending orders remain, RestaurantContext's snapshot listener automatically stops the alarm.
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
        ((o.status === 'pending' && o.paymentStatus !== 'paid') || o.status === 'accepted') &&
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

    return allOrders.filter((order) => {
      // Date filter
      if (activeDateFilter === 'today') {
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
        if (order.status === 'pending') {
          if (order.paymentStatus === 'paid') return false;
          return true;
        }
        if (order.status === 'accepted') {
          return true;
        }
        return false;
      } else if (statusFilter === 'on_the_way') {
        if (
          order.status !== 'on_the_way' ||
          order.orderNumber === 1027 ||
          order.orderNumberFormatted === '#1027'
        ) {
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
  }, [allOrders, activeDateFilter, sourceFilter, statusFilter, typeFilter, searchQuery]);

  const latestPendingOrder = useMemo(() => {
    return allOrders.find(
      (o) =>
        o.status === 'pending' &&
        o.paymentStatus !== 'paid' &&
        o.orderNumber !== 1027 &&
        o.orderNumberFormatted !== '#1027'
    );
  }, [allOrders]);

  const handlePrintReceipt = (order: RestaurantOrder) => {
    setSelectedOrderForPrint(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="owner-orders-tab">
      {/* ⚠️ HIGH-VISIBILITY NEW ORDER ALERT BANNER (Active when alarm rings or pending orders exist) */}
      {(isAlarmActive || pendingOrdersCount > 0) && (
        <div
          id="active-alarm-banner"
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white shadow-2xl shadow-red-500/30 border-2 border-yellow-300/60 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Bell className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-white text-red-700 text-xs font-black uppercase tracking-wider">
                  🔔 {t('newOrderAlertTitle')}
                </span>
                {latestPendingOrder && (
                  <span className="px-2 py-0.5 rounded-md bg-black/40 text-yellow-300 font-mono text-xs font-black">
                    {latestPendingOrder.orderNumberFormatted}
                  </span>
                )}
              </div>
              <h4 className="text-sm sm:text-base font-extrabold mt-0.5">
                {latestPendingOrder
                  ? `${latestPendingOrder.customer?.name || 'Customer'} (${(latestPendingOrder.orderType || '').toUpperCase()}) • ฿${(latestPendingOrder.total || 0).toLocaleString()}`
                  : `${pendingOrdersCount} ${t('pendingInAppOrdersAlert')}`}
              </h4>
              <p className="text-xs text-white/90">
                {pendingOrdersCount} {t('pendingInAppOrdersAlert')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            {latestPendingOrder && (
              <button
                id="btn-accept-order-top-banner"
                type="button"
                onClick={() => handleStatusChange(latestPendingOrder.id, 'accepted')}
                className="flex-1 md:flex-initial py-2.5 px-5 rounded-xl bg-white hover:bg-neutral-100 text-emerald-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{t('acceptOrderBtn')} ({latestPendingOrder.orderNumberFormatted})</span>
              </button>
            )}

            <button
              id="btn-mute-alarm-banner"
              onClick={muteAlarm}
              className="py-2.5 px-4 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            >
              <VolumeX className="w-4 h-4 stroke-[2.5]" />
              <span>{t('muteAlarmBtn')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header: Sound Configuration, Quick Stats & Action Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Real-time Order Stats */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              {t('orderMetrics')}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {t('liveSyncActive')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 text-center">
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                {t('pendingTab')}
              </span>
              <span className="text-xl font-mono font-black text-amber-400">
                {
                  allOrders.filter(
                    (o) =>
                      o.status === 'pending' &&
                      o.paymentStatus !== 'paid' &&
                      o.orderNumber !== 1027 &&
                      o.orderNumberFormatted !== '#1027'
                  ).length
                }
              </span>
            </div>
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                {t('acceptedTab')}
              </span>
              <span className="text-xl font-mono font-black text-blue-400">
                {allOrders.filter((o) => o.status === 'accepted' || o.status === 'on_the_way').length}
              </span>
            </div>
            <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                {t('completedTab')}
              </span>
              <span className="text-xl font-mono font-black text-emerald-400">
                {allOrders.filter((o) => o.status === 'completed').length}
              </span>
            </div>
          </div>
        </div>

        {/* Kitchen Alarm Sound Settings */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-800 gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {t('kitchenSoundSettings')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAudioAndNotifications}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bell className="w-3 h-3 text-yellow-400" />
                <span>{notificationStatus === 'granted' ? t('pushNotificationsEnabled') : t('enableSoundNotifications')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
            {/* Sound 1: Chime */}
            <div
              id="sound-opt-sound1"
              role="button"
              tabIndex={0}
              onClick={() => handleSoundChange('sound1')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSoundChange('sound1');
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer select-none ${
                currentSound === 'sound1'
                  ? 'border-orange-500 bg-orange-500/10 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t('soundChime')}</p>
                <p className="text-[10px] text-neutral-400">Two-tone kitchen ding</p>
              </div>
              <button
                type="button"
                title="Preview"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestSound('sound1');
                }}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sound 2: Service Bell */}
            <div
              id="sound-opt-sound2"
              role="button"
              tabIndex={0}
              onClick={() => handleSoundChange('sound2')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSoundChange('sound2');
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer select-none ${
                currentSound === 'sound2'
                  ? 'border-orange-500 bg-orange-500/10 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t('soundBell')}</p>
                <p className="text-[10px] text-neutral-400">Classic digital bell</p>
              </div>
              <button
                type="button"
                title="Preview"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestSound('sound2');
                }}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sound 3: Alert */}
            <div
              id="sound-opt-sound3"
              role="button"
              tabIndex={0}
              onClick={() => handleSoundChange('sound3')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSoundChange('sound3');
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer select-none ${
                currentSound === 'sound3'
                  ? 'border-orange-500 bg-orange-500/10 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t('soundAlert')}</p>
                <p className="text-[10px] text-neutral-400">High-urgency beeps</p>
              </div>
              <button
                type="button"
                title="Preview"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestSound('sound3');
                }}
                className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

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

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Multi-category filter tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <span className="text-neutral-500 text-[11px] font-semibold uppercase mr-1">
              {t('status')}:
            </span>

            {/* 1. Pending, Accepted button */}
            <button
              id="status-filter-pending-accepted"
              type="button"
              onClick={() => setStatusFilter('pending_accepted')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'pending_accepted'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              <span>Pending, Accepted</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'pending_accepted'
                    ? 'bg-neutral-950 text-amber-400 font-bold'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {pendingAcceptedCount}
              </span>
            </button>

            {/* 2. On the way / Ready button */}
            <button
              id="status-filter-on-the-way"
              type="button"
              onClick={() => setStatusFilter('on_the_way')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'on_the_way'
                  ? 'bg-orange-500 text-neutral-950 shadow-md shadow-orange-500/20'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              <span>On the way / Ready</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'on_the_way'
                    ? 'bg-neutral-950 text-orange-400 font-bold'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {onTheWayReadyCount}
              </span>
            </button>

            {/* 2. Completed button */}
            <button
              id="status-filter-completed"
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              <span>{t('status_completed')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-950 text-emerald-200'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {completedOrdersCount}
              </span>
            </button>

            {/* 3. Cancelled button */}
            <button
              id="status-filter-cancelled"
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              <span>{t('status_cancelled')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'cancelled'
                    ? 'bg-red-950 text-red-200'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {cancelledOrdersCount}
              </span>
            </button>

            {/* 4. All button (moved to the end, after Cancelled) */}
            <button
              id="status-filter-all"
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-neutral-700 text-white border border-neutral-600'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
              }`}
            >
              <span>{t('all')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'all'
                    ? 'bg-neutral-900 text-neutral-200'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {allOrdersCount}
              </span>
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

          {/* Source Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <span className="text-neutral-500 text-[11px] font-semibold uppercase mr-1">
              {t('source')}:
            </span>
            {(['all', 'in_app', 'whatsapp', 'line'] as const).map((source) => (
              <button
                key={source}
                id={`source-filter-${source}`}
                onClick={() => setSourceFilter(source)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer shrink-0 ${
                  sourceFilter === source
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-neutral-400 hover:text-white bg-neutral-950/60'
                }`}
              >
                {source === 'all' ? t('all') : source.replace('_', '-')}
              </button>
            ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'pending';
            const isAccepted = order.status === 'accepted';
            const isOnTheWay = order.status === 'on_the_way';
            const isCompleted = order.status === 'completed';
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
                className={`bg-neutral-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all ${
                  isPending
                    ? 'border-amber-500/60 ring-2 ring-amber-500/20 shadow-amber-500/10'
                    : isOnTheWay
                    ? 'border-orange-500/50'
                    : isAccepted
                    ? 'border-blue-500/40'
                    : isCompleted
                    ? 'border-neutral-800 opacity-90'
                    : 'border-neutral-800/80 opacity-70'
                }`}
              >
                {/* Card Top: Order Number, Time & Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-neutral-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-white">
                          {order.orderNumberFormatted}
                        </span>
                        {/* Channel Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.source === 'in_app'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : order.source === 'whatsapp'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}
                        >
                          {order.source.replace('_', '-')}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {formattedTime} • {formattedDate}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          : isOnTheWay
                          ? isDelivery
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : isAccepted
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {isOnTheWay
                        ? isDelivery
                          ? t('statusStepOnTheWay')
                          : t('statusStepYourFoodReady')
                        : isAccepted
                        ? t('statusStepAccepted')
                        : isPending
                        ? t('statusStepConfirmed')
                        : isCompleted
                        ? t('statusStepCompleted')
                        : t('statusStepCancelled')}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 space-y-1.5 text-xs text-neutral-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {order.customer?.name || 'Customer'}
                      </span>
                      {order.customer?.phone && order.customer.phone !== '-' ? (
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-orange-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.customer.phone}</span>
                        </a>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        {isDelivery ? (
                          <Bike className="w-3.5 h-3.5 text-orange-400" />
                        ) : (
                          <Store className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {isDelivery ? t('delivery') : t('pickup')}
                      </span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(order)}
                        className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          order.paymentStatus === 'paid'
                            ? 'text-emerald-400'
                            : 'text-amber-400 hover:underline'
                        }`}
                      >
                        {order.paymentMethod === 'qr_payment' ? (
                          <CreditCard className="w-3.5 h-3.5" />
                        ) : (
                          <Banknote className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {order.paymentMethod === 'qr_payment' ? t('qrPayment') : t('cash')} (
                          {(order.paymentStatus || 'pending').toUpperCase()})
                        </span>
                      </button>
                    </div>

                    {isDelivery && order.customer.deliveryAddress && (
                      <div className="pt-1.5 border-t border-neutral-800/60 flex items-start gap-1.5 text-[11px] text-neutral-300">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{order.customer.deliveryAddress}</span>
                      </div>
                    )}

                    {order.customer.notes && (
                      <div className="pt-1 text-[11px] text-amber-300/90 italic">
                        Note: "{order.customer.notes}"
                      </div>
                    )}
                  </div>

                  {/* Items List Snapshot */}
                  <div className="space-y-1.5 py-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                      {t('items')} ({order.items.length})
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {order.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className="flex justify-between items-start text-xs text-neutral-300 bg-neutral-950/30 p-1.5 rounded-lg"
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-semibold text-white">
                              <span className="text-orange-400 font-bold mr-1.5">
                                {item.quantity}×
                              </span>
                              {item.name?.[language] || item.name?.en || (typeof item.name === 'string' ? item.name : 'Custom Item')}
                            </div>
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                              <div className="text-[10px] text-neutral-400 pl-4 space-y-0.5">
                                {item.selectedModifiers.map((m, mIdx) => (
                                   <div key={mIdx}>
                                    + {m.optionName?.[language] || m.optionName?.en || (typeof m.optionName === 'string' ? m.optionName : '')}
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.specialRequest && (
                              <p className="text-[10px] text-amber-300/80 italic pl-4">
                                "{item.specialRequest}"
                              </p>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-neutral-200">
                            ฿{item.subtotal.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3 border-t border-neutral-800 space-y-2.5 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs font-bold text-neutral-400">{t('total')}:</span>
                    <span className="font-mono text-base font-black text-orange-400">
                      ฿{order.total.toLocaleString()}
                    </span>
                  </div>

                  {/* Action Buttons based on Status */}
                  <div className="space-y-1.5">
                    {isPending && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id={`btn-accept-order-${order.id}`}
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => handleStatusChange(order.id, 'accepted')}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('acceptOrderBtn')}</span>
                        </button>

                        <button
                          id={`btn-cancel-order-${order.id}`}
                          type="button"
                          disabled={isUpdatingStatus === order.id}
                          onClick={() => setCancellingOrderId(order.id)}
                          className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-neutral-700 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t('cancelOrderBtn')}</span>
                        </button>
                      </div>
                    )}

                    {isAccepted && (
                      <button
                        id={`btn-ontheway-order-${order.id}`}
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                          isDelivery
                            ? 'bg-orange-500 hover:bg-orange-600 text-neutral-950 shadow-orange-500/20'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                        }`}
                      >
                        {isDelivery ? <Bike className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                        <span>
                          {isDelivery
                            ? `${t('onTheWayBtn')} / ${t('completeOrderBtn')}`
                            : `${t('yourFoodReadyBtn')} / ${t('completeOrderBtn')}`}
                        </span>
                      </button>
                    )}

                    {isOnTheWay && (
                      <button
                        id={`btn-complete-ontheway-${order.id}`}
                        type="button"
                        disabled={isUpdatingStatus === order.id}
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isDelivery ? t('markDeliveredCompleted') : t('markPickedUpCompleted')}</span>
                      </button>
                    )}

                    {/* Print Receipt button */}
                    <button
                      id={`btn-print-receipt-${order.id}`}
                      type="button"
                      onClick={() => handlePrintReceipt(order)}
                      className="w-full py-1.5 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 border border-neutral-800/80 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>{t('printReceipt')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
};
