import React, { useState, useRef, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  AvailabilityStatus,
  Category,
  DailySchedule,
  MenuItem,
  ModifierGroup,
  ModifierOption,
  RestaurantOrder,
  SpecialHoliday,
  StoreSettings,
} from '../../types';
import { formatCurrency } from '../../utils/pricing';
import { normalizeHolidayDateStr } from '../../utils/availabilityEngine';
import { processFoodImageFile } from '../../utils/imageUtils';
import { defaultSettings } from '../../data/defaultSettings';
import { HolidayCalendarModal } from './HolidayCalendarModal';
import { OwnerOrdersTab } from './OwnerOrdersTab';
import { NewOrderAlertModal } from './NewOrderAlertModal';
import { OwnerSoundSettingsCard } from './OwnerSoundSettingsCard';
import { orderNotificationService } from '../../services/orderNotificationService';
import {
  X,
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  Sliders,
  Clock,
  Calendar,
  AlertOctagon,
  Store,
  Share2,
  Database,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  Save,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
  Flame,
  AlertTriangle,
  ImageOff,
  ShoppingBag,
  Bell,
  Loader2,
} from 'lucide-react';

type OwnerTab =
  | 'orders'
  | 'overview'
  | 'menu'
  | 'categories'
  | 'modifiers'
  | 'hours'
  | 'holidays'
  | 'emergency'
  | 'settings'
  | 'notifications'
  | 'channels'
  | 'data';

export const OwnerDashboard: React.FC = () => {
  const {
    isOwnerMode,
    setIsOwnerMode,
    settings,
    updateSettings,
    categories,
    setCategories,
    menuItems,
    setMenuItems,
    modifierGroups,
    setModifierGroups,
    storeAvailability,
    refreshAvailability,
    resetDemoData,
    exportDataJson,
    importDataJson,
    language,
    allOrders,
    pendingOrdersCount,
    isAlarmActive,
    muteAlarm,
    t,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<OwnerTab>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState<'brand' | 'notifications'>('brand');

  // New Orders Alert Queue for visual banner/modal
  const [newOrdersAlertQueue, setNewOrdersAlertQueue] = useState<RestaurantOrder[]>([]);

  // Activate owner mode in orderNotificationService
  useEffect(() => {
    orderNotificationService.setOwnerModeActive(isOwnerMode);
    return () => {
      orderNotificationService.setOwnerModeActive(false);
    };
  }, [isOwnerMode]);

  // Subscribe to new order detection events
  useEffect(() => {
    const unsubscribe = orderNotificationService.subscribeToNewOrders((newOrders) => {
      setNewOrdersAlertQueue((prev) => {
        const existingIds = new Set(prev.map((o) => o.id));
        const additions = newOrders.filter((o) => !existingIds.has(o.id));
        return [...prev, ...additions];
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Process live order snapshots for new order arrivals
  useEffect(() => {
    if (isOwnerMode && allOrders && allOrders.length > 0) {
      orderNotificationService.processOrdersList(allOrders);
    }
  }, [allOrders, isOwnerMode]);

  const handleViewOrderFromAlert = (order: RestaurantOrder) => {
    setNewOrdersAlertQueue((prev) => prev.filter((o) => o.id !== order.id));
    setActiveTab('orders');
  };

  const handleDismissAlertOrder = (orderId: string) => {
    setNewOrdersAlertQueue((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleDismissAllAlerts = () => {
    setNewOrdersAlertQueue([]);
  };

  // Menu Item Editor Modal state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const foodFileInputRef = useRef<HTMLInputElement>(null);
  const [foodImageError, setFoodImageError] = useState<string | null>(null);
  const [showRemoveImageConfirm, setShowRemoveImageConfirm] = useState(false);

  // Category Editor Modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Modifier Group & Option Editor state
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Holiday Editor Modal state
  const [editingHoliday, setEditingHoliday] = useState<SpecialHoliday | null>(null);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Logo upload preview state
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Reset Demo Confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOwnerMode) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ----------------------------------------------------
  // LOGO UPLOAD & MANAGEMENT
  // ----------------------------------------------------
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const result = await processFoodImageFile(file, language, 'logo');
      if (result.error) {
        setLogoError(result.error);
      } else if (result.dataUrl) {
        setLogoPreview(result.dataUrl);
      }
    } catch (err: any) {
      console.error('Error processing logo image:', err);
      setLogoError(err?.message || 'Failed to process logo image');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveLogo = async () => {
    if (logoPreview) {
      try {
        setIsSavingLogo(true);
        setLogoError(null);
        await updateSettings({ logoUrl: logoPreview });
        setLogoPreview(null);
        showToast(
          language === 'th'
            ? 'อัปเดตโลโก้ร้านค้าเรียบร้อยแล้ว'
            : 'Restaurant logo updated successfully!'
        );
      } catch (err: any) {
        console.error('Failed to save logo to Firestore:', err);
        setLogoError(err?.message || 'Failed to sync logo to Firestore');
      } finally {
        setIsSavingLogo(false);
      }
    }
  };

  const handleCancelLogo = () => {
    setLogoPreview(null);
    setLogoError(null);
  };

  const handleResetDefaultLogo = async () => {
    try {
      setIsSavingLogo(true);
      await updateSettings({ logoUrl: defaultSettings.logoUrl });
      setLogoPreview(null);
      setLogoError(null);
      showToast(
        language === 'th'
          ? 'คืนค่าโลโก้เป็นค่าเริ่มต้นแล้ว'
          : 'Restored default restaurant logo!'
      );
    } catch (err: any) {
      console.error('Failed to reset logo:', err);
    } finally {
      setIsSavingLogo(false);
    }
  };

  // ----------------------------------------------------
  // FOOD IMAGE UPLOAD & MANAGEMENT
  // ----------------------------------------------------
  const handleFoodImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFoodImageError(null);
    if (!file) return;

    const result = await processFoodImageFile(file, language);
    if (result.error) {
      setFoodImageError(result.error);
    } else if (result.dataUrl && editingItem) {
      setEditingItem({
        ...editingItem,
        imageUrl: result.dataUrl,
      });
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  // ----------------------------------------------------
  // MENU ITEM CRUD OPERATIONS
  // ----------------------------------------------------
  const handleSaveMenuItem = (item: MenuItem) => {
    if (isAddingItem) {
      setMenuItems(prev => [...prev, item]);
      showToast(t('itemCreated'));
    } else {
      setMenuItems(prev => prev.map(i => (i.id === item.id ? item : i)));
      showToast(t('itemUpdated'));
    }
    setEditingItem(null);
    setIsAddingItem(false);
    setFoodImageError(null);
    setShowRemoveImageConfirm(false);
  };

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(i => i.id !== itemId));
    showToast(t('itemDeleted'));
  };

  const handleMoveMenuItem = (itemId: string, direction: 'up' | 'down') => {
    setMenuItems(prev => {
      const index = prev.findIndex(i => i.id === itemId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const newItems = [...prev];
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;

      // Update display orders
      return newItems.map((item, idx) => ({ ...item, displayOrder: idx + 1 }));
    });
  };

  // ----------------------------------------------------
  // CATEGORY CRUD OPERATIONS
  // ----------------------------------------------------
  const handleSaveCategory = (cat: Category) => {
    if (isAddingCategory) {
      setCategories(prev => [...prev, cat]);
    } else {
      setCategories(prev => prev.map(c => (c.id === cat.id ? cat : c)));
    }
    setEditingCategory(null);
    setIsAddingCategory(false);
    showToast('Category saved successfully.');
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
    showToast('Category deleted.');
  };

  const handleMoveCategory = (catId: string, direction: 'up' | 'down') => {
    setCategories(prev => {
      const index = prev.findIndex(c => c.id === catId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const newCats = [...prev];
      const temp = newCats[index];
      newCats[index] = newCats[targetIndex];
      newCats[targetIndex] = temp;

      return newCats.map((cat, idx) => ({ ...cat, displayOrder: idx + 1 }));
    });
  };

  // ----------------------------------------------------
  // MODIFIER GROUP & OPTION CRUD & ORDERING
  // ----------------------------------------------------
  const handleSaveModifierGroup = (group: ModifierGroup) => {
    if (isAddingGroup) {
      setModifierGroups(prev => [...prev, group]);
    } else {
      setModifierGroups(prev => prev.map(g => (g.id === group.id ? group : g)));
    }
    setEditingGroup(null);
    setIsAddingGroup(false);
    showToast('Modifier Group saved successfully.');
  };

  const handleDeleteModifierGroup = (groupId: string) => {
    setModifierGroups(prev => prev.filter(g => g.id !== groupId));
    showToast('Modifier Group deleted.');
  };

  const handleMoveModifierGroup = (groupId: string, direction: 'up' | 'down') => {
    setModifierGroups(prev => {
      const index = prev.findIndex(g => g.id === groupId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const newGroups = [...prev];
      const temp = newGroups[index];
      newGroups[index] = newGroups[targetIndex];
      newGroups[targetIndex] = temp;

      return newGroups.map((g, idx) => ({ ...g, displayOrder: idx + 1 }));
    });
  };

  const handleMoveModifierOption = (groupId: string, optionId: string, direction: 'up' | 'down') => {
    setModifierGroups(prev => {
      return prev.map(group => {
        if (group.id !== groupId) return group;
        const index = group.options.findIndex(o => o.id === optionId);
        if (index < 0) return group;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= group.options.length) return group;

        const newOptions = [...group.options];
        const temp = newOptions[index];
        newOptions[index] = newOptions[targetIndex];
        newOptions[targetIndex] = temp;

        return {
          ...group,
          options: newOptions.map((opt, idx) => ({ ...opt, displayOrder: idx + 1 })),
        };
      });
    });
  };

  // ----------------------------------------------------
  // SPECIAL HOLIDAYS CRUD
  // ----------------------------------------------------
  const handleSaveHoliday = (savedHoliday: SpecialHoliday) => {
    let newHolidays: SpecialHoliday[];
    if (isAddingHoliday) {
      newHolidays = [...settings.specialHolidays, savedHoliday];
      showToast(
        language === 'th'
          ? 'เพิ่มวันหยุดพิเศษเรียบร้อยแล้ว'
          : 'Holiday added successfully.'
      );
    } else {
      newHolidays = settings.specialHolidays.map(h =>
        h.id === savedHoliday.id ? savedHoliday : h
      );
      showToast(
        language === 'th'
          ? 'อัปเดตวันหยุดพิเศษเรียบร้อยแล้ว'
          : 'Holiday updated successfully.'
      );
    }
    updateSettings({ specialHolidays: newHolidays });
    refreshAvailability();
    setEditingHoliday(null);
    setIsAddingHoliday(false);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    const newHolidays = settings.specialHolidays.filter(h => h.id !== holidayId);
    updateSettings({ specialHolidays: newHolidays });
    refreshAvailability();
    showToast(
      language === 'th' ? 'ลบวันหยุดพิเศษแล้ว' : 'Holiday deleted.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F6F8] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="bg-[#1A1A1A] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E65100] flex items-center justify-center font-black text-sm">
            TK
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <span>{t('ownerDashboard')}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Owner Active
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">
              {settings.restaurantName} • Zero-Cost Cloudless Management
            </p>
          </div>
        </div>

        <button
          type="button"
          id="exit-owner-mode-btn"
          onClick={() => setIsOwnerMode(false)}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          <span>{t('closeOwnerMode')}</span>
        </button>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-16 right-4 z-60 bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Layout: Left Sidebar / Tabs & Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-gray-200 shrink-0 overflow-x-auto md:overflow-y-auto no-scrollbar py-2 md:py-4">
          <nav className="flex md:flex-col gap-1 px-3">
            {[
              { id: 'orders', label: t('ordersTab'), icon: ShoppingBag, badge: pendingOrdersCount },
              { id: 'overview', label: t('dashboardTab'), icon: LayoutDashboard },
              { id: 'menu', label: t('menuTab'), icon: UtensilsCrossed },
              { id: 'categories', label: t('categoriesTab'), icon: Tags },
              { id: 'modifiers', label: t('modifiersTab'), icon: Sliders },
              { id: 'hours', label: t('hoursTab'), icon: Clock },
              { id: 'holidays', label: t('holidaysTab'), icon: Calendar },
              { id: 'emergency', label: t('emergencyTab'), icon: AlertOctagon },
              { id: 'settings', label: t('settingsTab'), icon: Store },
              { id: 'notifications', label: t('notificationsTab') || (language === 'th' ? 'เสียงแจ้งเตือน' : 'Notifications'), icon: Bell },
              { id: 'channels', label: t('channelsTab'), icon: Share2 },
              { id: 'data', label: t('systemTab'), icon: Database },
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              const badge = (tab as any).badge;
              return (
                <button
                  key={tab.id}
                  id={`owner-nav-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id as OwnerTab)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 md:w-full text-left ${
                    isSelected
                      ? 'bg-[#E65100] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isSelected
                          ? 'bg-white text-[#E65100]'
                          : 'bg-red-500 text-white animate-bounce'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* ---------------- ORDERS TAB ---------------- */}
            {activeTab === 'orders' && <OwnerOrdersTab />}

            {/* ---------------- OVERVIEW TAB ---------------- */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Live Status Card */}
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                      Live Store Status
                    </span>
                    <h2 className="text-xl font-black text-[#1A1A1A] mt-1 flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          storeAvailability.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      {storeAvailability.isOpen ? 'OPEN FOR ORDERS' : 'STORE CURRENTLY CLOSED'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {storeAvailability.reasonEn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateSettings({
                          emergencyClose: {
                            ...settings.emergencyClose,
                            enabled: !settings.emergencyClose.enabled,
                          },
                        });
                        refreshAvailability();
                      }}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 ${
                        settings.emergencyClose.enabled
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <AlertOctagon className="w-4 h-4" />
                      <span>
                        {settings.emergencyClose.enabled
                          ? 'Emergency Close: ACTIVE'
                          : 'Set Emergency Close'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400">Total Dishes</span>
                    <p className="text-2xl font-black text-[#1A1A1A] mt-1">{menuItems.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400">Categories</span>
                    <p className="text-2xl font-black text-[#1A1A1A] mt-1">{categories.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400">Modifier Groups</span>
                    <p className="text-2xl font-black text-[#1A1A1A] mt-1">{modifierGroups.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                    <span className="text-xs font-bold text-gray-400">Weekly Schedule</span>
                    <p className="text-sm font-black text-[#E65100] mt-2">Wed-Mon 10:00-21:00</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
                  <h3 className="text-sm font-black text-[#1A1A1A]">Quick Management Shortcuts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('menu');
                        setIsAddingItem(true);
                        setFoodImageError(null);
                        setShowRemoveImageConfirm(false);
                        setEditingItem({
                          id: `item_${Date.now()}`,
                          categoryId: categories[0]?.id || 'cat-rice',
                          name: { en: '', th: '' },
                          description: { en: '', th: '' },
                          imageUrl: '',
                          basePrice: 100,
                          availability: 'available',
                          isSignature: false,
                          isPopular: false,
                          displayOrder: menuItems.length + 1,
                          modifierGroupIds: [],
                        });
                      }}
                      className="p-3 rounded-2xl border border-gray-200 text-left hover:border-[#E65100] hover:bg-orange-50/50 transition-all"
                    >
                      <Plus className="w-5 h-5 text-[#E65100] mb-1" />
                      <span className="text-xs font-bold text-[#1A1A1A] block">Add New Dish</span>
                      <span className="text-[11px] text-gray-500">Add food with English & Thai names</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('hours')}
                      className="p-3 rounded-2xl border border-gray-200 text-left hover:border-[#E65100] hover:bg-orange-50/50 transition-all"
                    >
                      <Clock className="w-5 h-5 text-[#E65100] mb-1" />
                      <span className="text-xs font-bold text-[#1A1A1A] block">Adjust Store Hours</span>
                      <span className="text-[11px] text-gray-500">Edit daily opening & closing times</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="p-3 rounded-2xl border border-gray-200 text-left hover:border-[#E65100] hover:bg-orange-50/50 transition-all"
                    >
                      <Store className="w-5 h-5 text-[#E65100] mb-1" />
                      <span className="text-xs font-bold text-[#1A1A1A] block">Store Phone & LINE</span>
                      <span className="text-[11px] text-gray-500">Update phone, WhatsApp, and LINE ID</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- MENU TAB ---------------- */}
            {activeTab === 'menu' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#1A1A1A]">Menu Item Manager</h2>
                    <p className="text-xs text-gray-500">
                      Create, edit, reorder, adjust stock, and attach modifiers to dishes.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="add-dish-btn"
                    onClick={() => {
                      setIsAddingItem(true);
                      setFoodImageError(null);
                      setShowRemoveImageConfirm(false);
                      setEditingItem({
                        id: `item_${Date.now()}`,
                        categoryId: categories[0]?.id || 'cat-rice',
                        name: { en: '', th: '' },
                        description: { en: '', th: '' },
                        imageUrl: '',
                        basePrice: 100,
                        availability: 'available',
                        isSignature: false,
                        isPopular: false,
                        displayOrder: menuItems.length + 1,
                        modifierGroupIds: [],
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-extrabold hover:bg-[#D84315] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('addItem')}</span>
                  </button>
                </div>

                {/* Menu Item List */}
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
                  {menuItems.map((item, idx) => {
                    const cat = categories.find(c => c.id === item.categoryId);
                    return (
                      <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Image */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageOff className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                                {item.name?.en || (typeof item.name === 'string' ? item.name : 'Untitled')}
                              </h4>
                              <span className="text-xs text-gray-400 font-normal">
                                ({item.name?.th || ''})
                              </span>
                              {item.isSignature && (
                                <span className="bg-[#E65100] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                  Signature
                                </span>
                              )}
                              {item.isPopular && (
                                <span className="bg-[#D4AF37] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                                  Popular
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                item.availability === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {item.availability}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate max-w-md mt-0.5">
                              {cat?.name?.en || (typeof cat?.name === 'string' ? cat.name : 'Uncategorized')} • Base Price: <strong>{formatCurrency(item.basePrice, settings.currencySymbol)}</strong> • Modifiers: {item.modifierGroupIds?.length || 0} groups
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMenuItem(item.id, 'up')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === menuItems.length - 1}
                            onClick={() => handleMoveMenuItem(item.id, 'down')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingItem(false);
                              setFoodImageError(null);
                              setShowRemoveImageConfirm(false);
                              setEditingItem({
                                ...item,
                                name: {
                                  en: item.name?.en || (typeof item.name === 'string' ? item.name : ''),
                                  th: item.name?.th || ''
                                },
                                description: {
                                  en: item.description?.en || (typeof item.description === 'string' ? item.description : ''),
                                  th: item.description?.th || ''
                                }
                              });
                            }}
                            className="p-1.5 text-gray-600 hover:text-[#E65100] rounded-lg hover:bg-orange-50"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---------------- CATEGORIES TAB ---------------- */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#1A1A1A]">Category Manager</h2>
                    <p className="text-xs text-gray-500">Manage menu categories in English and Thai.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(true);
                      setEditingCategory({
                        id: `cat_${Date.now()}`,
                        name: { en: '', th: '' },
                        displayOrder: categories.length + 1,
                        visible: true,
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-extrabold hover:bg-[#D84315] transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
                  {categories.map((cat, idx) => (
                    <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                          {cat.name?.en || (typeof cat.name === 'string' ? cat.name : 'Untitled')} <span className="text-gray-400 font-normal">({cat.name?.th || ''})</span>
                        </h4>
                        <span className="text-[11px] text-gray-500">
                          Order: {cat.displayOrder} • {cat.visible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveCategory(cat.id, 'up')}
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMoveCategory(cat.id, 'down')}
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setEditingCategory({ ...cat });
                          }}
                          className="p-1.5 text-gray-600 hover:text-[#E65100] rounded-lg hover:bg-orange-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- MODIFIERS TAB ---------------- */}
            {activeTab === 'modifiers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#1A1A1A]">
                      {language === 'th' ? 'กลุ่มและตัวเลือกเสริม (Modifiers)' : 'Modifier Groups & Options'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {language === 'th'
                        ? 'ปรับแต่งกลุ่มตัวเลือก เช่น ระดับความเผ็ด เนื้อสัตว์ และท็อปปิ้ง พร้อมจัดเรียงลำดับ'
                        : 'Configure custom groups (Protein, Spiciness, Extras) with price adjustments & ordering.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGroup(true);
                      setEditingGroup({
                        id: `mod_${Date.now()}`,
                        name: { en: '', th: '' },
                        required: false,
                        minSelections: 0,
                        maxSelections: 1,
                        displayOrder: modifierGroups.length + 1,
                        enabled: true,
                        options: [
                          {
                            id: `opt_${Date.now()}_1`,
                            name: { en: 'Option 1', th: 'ตัวเลือก 1' },
                            priceAdjustment: 0,
                            availability: 'available',
                            displayOrder: 1,
                          },
                        ],
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-extrabold hover:bg-[#D84315] transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'th' ? 'เพิ่มกลุ่มตัวเลือก' : 'Add Modifier Group'}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {modifierGroups.map((group, groupIdx) => (
                    <div key={group.id} className="bg-white rounded-3xl p-4 border border-gray-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2">
                            <span>{group.name?.en || (typeof group.name === 'string' ? group.name : 'Untitled Group')}</span>
                            <span className="text-gray-400 font-normal">({group.name?.th || ''})</span>
                            <span className="text-[10px] bg-orange-100 text-[#E65100] font-bold px-2 py-0.5 rounded-full">
                              Order #{groupIdx + 1}
                            </span>
                          </h4>
                          <span className="text-[11px] text-gray-500">
                            {group.required ? 'Required' : 'Optional'} • Max Selections: {group.maxSelections}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Move Group Up */}
                          <button
                            type="button"
                            disabled={groupIdx === 0}
                            title="Move Group Up"
                            onClick={() => handleMoveModifierGroup(group.id, 'up')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          {/* Move Group Down */}
                          <button
                            type="button"
                            disabled={groupIdx === modifierGroups.length - 1}
                            title="Move Group Down"
                            onClick={() => handleMoveModifierGroup(group.id, 'down')}
                            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingGroup(false);
                              setEditingGroup({ ...group });
                            }}
                            className="p-1.5 text-gray-600 hover:text-[#E65100] rounded-lg hover:bg-orange-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteModifierGroup(group.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Options list inside group */}
                      <div className="bg-gray-50 p-2.5 rounded-2xl divide-y divide-gray-100 text-xs">
                        {group.options.map((opt, optIdx) => (
                          <div key={opt.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-gray-400 w-4 text-center">
                                {optIdx + 1}.
                              </span>
                              <span className="font-semibold text-gray-700 truncate">
                                {opt.name?.en || (typeof opt.name === 'string' ? opt.name : 'Option')} <span className="text-gray-400 font-normal">({opt.name?.th || ''})</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-[#E65100]">
                                {opt.priceAdjustment > 0
                                  ? `+${formatCurrency(opt.priceAdjustment, settings.currencySymbol)}`
                                  : '฿0'}
                              </span>

                              {/* Option Move Up */}
                              <button
                                type="button"
                                disabled={optIdx === 0}
                                title="Move Option Up"
                                onClick={() => handleMoveModifierOption(group.id, opt.id, 'up')}
                                className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              {/* Option Move Down */}
                              <button
                                type="button"
                                disabled={optIdx === group.options.length - 1}
                                title="Move Option Down"
                                onClick={() => handleMoveModifierOption(group.id, opt.id, 'down')}
                                className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-20 rounded hover:bg-gray-200 transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- HOURS TAB ---------------- */}
            {activeTab === 'hours' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1A1A]">Weekly Operating Hours</h2>
                  <p className="text-xs text-gray-500">
                    Default schedule is Wednesday-Monday 10:00-21:00, Closed Tuesday.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {settings.schedule.map((sched, idx) => (
                    <div key={sched.dayOfWeek} className="p-3 bg-gray-50 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 w-28">
                        <input
                          type="checkbox"
                          checked={sched.isOpen}
                          onChange={(e) => {
                            const newSched = [...settings.schedule];
                            newSched[idx] = { ...sched, isOpen: e.target.checked };
                            updateSettings({ schedule: newSched });
                            refreshAvailability();
                          }}
                          className="w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
                        />
                        <span className="font-bold text-[#1A1A1A]">{sched.dayName}</span>
                      </div>

                      {sched.isOpen ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={sched.openTime}
                            onChange={(e) => {
                              const newSched = [...settings.schedule];
                              newSched[idx] = { ...sched, openTime: e.target.value };
                              updateSettings({ schedule: newSched });
                              refreshAvailability();
                            }}
                            className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={sched.closeTime}
                            onChange={(e) => {
                              const newSched = [...settings.schedule];
                              newSched[idx] = { ...sched, closeTime: e.target.value };
                              updateSettings({ schedule: newSched });
                              refreshAvailability();
                            }}
                            className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs font-semibold"
                          />
                        </div>
                      ) : (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                          CLOSED ALL DAY
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- HOLIDAYS TAB ---------------- */}
            {activeTab === 'holidays' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#1A1A1A]">
                      {language === 'th' ? 'จัดการวันหยุดพิเศษ' : 'Special Holiday Closures'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {language === 'th'
                        ? 'กำหนดช่วงวันหยุดพิเศษล่วงหน้า ระบบจะปิดรับออเดอร์อัตโนมัติและเปิดใหม่อัตโนมัติเมื่อครบกำหนด'
                        : 'Configure custom multi-day or single-day closures that temporarily override normal schedule.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingHoliday(true);
                      setEditingHoliday(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-extrabold hover:bg-[#D84315] flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'th' ? 'เพิ่มวันหยุด' : 'Add Holiday'}</span>
                  </button>
                </div>

                {settings.specialHolidays.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-xs font-bold text-gray-600">
                      {language === 'th' ? 'ยังไม่มีวันหยุดพิเศษที่ตั้งไว้' : 'No special holiday closures scheduled'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {language === 'th'
                        ? 'กดปุ่ม "+ เพิ่มวันหยุด" เพื่อระบุวันปิดร้านช่วงเทศกาล เช่น สงกรานต์ หรือปีใหม่'
                        : 'Click "+ Add Holiday" to configure holiday closures like Songkran or New Year.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {settings.specialHolidays.map((holiday, idx) => {
                      const s = normalizeHolidayDateStr(holiday.startDate);
                      const e = normalizeHolidayDateStr(holiday.endDate || holiday.startDate);
                      const formatText = (dateStr: string) => {
                        if (!dateStr) return '';
                        const parts = dateStr.split('-').map(Number);
                        if (parts.length < 3) return dateStr;
                        const d = new Date(parts[0], parts[1] - 1, parts[2]);
                        return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                      };

                      return (
                        <div
                          key={holiday.id}
                          className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                            holiday.enabled
                              ? 'bg-orange-50/40 border-orange-200/80 shadow-2xs'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={holiday.enabled}
                              onChange={(e) => {
                                const newHolidays = [...settings.specialHolidays];
                                newHolidays[idx] = { ...holiday, enabled: e.target.checked };
                                updateSettings({ specialHolidays: newHolidays });
                                refreshAvailability();
                              }}
                              className="mt-0.5 w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
                            />
                            <div>
                              <h4 className="font-extrabold text-sm text-[#1A1A1A] flex items-center gap-2">
                                <span>{holiday.name}</span>
                                {holiday.enabled ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                    {language === 'th' ? 'ใช้งานอยู่' : 'Active'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                                    {language === 'th' ? 'ปิดการใช้งาน' : 'Disabled'}
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-[#E65100]" />
                                <span>
                                  {s === e ? formatText(s) : `${formatText(s)} – ${formatText(e)}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingHoliday(false);
                                setEditingHoliday({ ...holiday });
                              }}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-[#E65100] hover:border-[#E65100] rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(holiday.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ---------------- EMERGENCY TAB ---------------- */}
            {activeTab === 'emergency' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#1A1A1A]">Master Emergency Close</h2>
                    <p className="text-xs text-gray-500">
                      Highest priority: when turned ON, the store is closed immediately regardless of hours.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="emergency-close-toggle"
                      checked={settings.emergencyClose.enabled}
                      onChange={(e) => {
                        updateSettings({
                          emergencyClose: {
                            ...settings.emergencyClose,
                            enabled: e.target.checked,
                          },
                        });
                        refreshAvailability();
                      }}
                      className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <span className="text-xs font-black text-rose-700 uppercase">
                      Activate Emergency Store Closure
                    </span>
                  </label>

                  <div className="space-y-2 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">
                        English Closure Reason
                      </label>
                      <input
                        type="text"
                        value={settings.emergencyClose.reasonEn}
                        onChange={(e) => {
                          updateSettings({
                            emergencyClose: {
                              ...settings.emergencyClose,
                              reasonEn: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 block mb-1">
                        Thai Closure Reason
                      </label>
                      <input
                        type="text"
                        value={settings.emergencyClose.reasonTh}
                        onChange={(e) => {
                          updateSettings({
                            emergencyClose: {
                              ...settings.emergencyClose,
                              reasonTh: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STORE SETTINGS TAB ---------------- */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Secondary navigation: Brand vs Notifications */}
                <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-xs flex items-center gap-2">
                  <button
                    type="button"
                    id="settings-subtab-brand"
                    onClick={() => setSettingsSubTab('brand')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      settingsSubTab === 'brand'
                        ? 'bg-[#1A1A1A] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>{language === 'th' ? 'ข้อมูลร้านค้าและแบรนด์' : 'Store & Brand'}</span>
                  </button>
                  <button
                    type="button"
                    id="settings-subtab-notifications"
                    onClick={() => setSettingsSubTab('notifications')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      settingsSubTab === 'notifications'
                        ? 'bg-[#E65100] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>{language === 'th' ? 'เสียงแจ้งเตือนออเดอร์' : 'Notifications'}</span>
                  </button>
                </div>

                {settingsSubTab === 'notifications' ? (
                  <OwnerSoundSettingsCard language={language} />
                ) : (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-6">
                    <div>
                      <h2 className="text-base font-extrabold text-[#1A1A1A]">
                        {language === 'th' ? 'ข้อมูลร้านค้าและแบรนด์' : 'Store Contact & Brand Settings'}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {language === 'th'
                          ? 'จัดการโลโก้ร้านค้า เบอร์โทรศัพท์ WhatsApp LINE ID และรหัสผ่านเจ้าของร้าน'
                          : 'Manage restaurant logo, contact phone, WhatsApp number, LINE ID, and passcodes.'}
                      </p>
                    </div>

                {/* Brand Logo Section */}
                <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#E65100]" />
                        <span>{language === 'th' ? 'โลโก้ร้านค้า (Restaurant Logo)' : 'Restaurant Logo'}</span>
                      </h3>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {language === 'th'
                          ? 'อัปโหลดรูปภาพโลโก้ใหม่ (รองรับ PNG, JPG, WEBP ขนาดไม่เกิน 3MB)'
                          : 'Upload a custom restaurant logo (PNG, JPG, WEBP, max 3MB).'}
                      </p>
                    </div>

                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={handleResetDefaultLogo}
                        className="text-[11px] text-gray-500 hover:text-gray-800 font-bold underline"
                      >
                        {language === 'th' ? 'คืนค่าโลโก้เริ่มต้น' : 'Reset to Default Logo'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Active Logo / Selected Preview */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-[#E65100]/30 bg-[#1A1A1A] flex items-center justify-center shadow-md">
                        {logoPreview || settings.logoUrl ? (
                          <img
                            src={logoPreview || settings.logoUrl}
                            alt="Restaurant Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#E65100] font-black text-xl">TK</span>
                        )}
                      </div>
                      {logoPreview && (
                        <span className="absolute -top-2 -right-2 bg-[#E65100] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                          Preview
                        </span>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                          id="owner-logo-file-input"
                        />
                        <button
                          type="button"
                          disabled={isUploadingLogo || isSavingLogo}
                          onClick={() => {
                            setLogoError(null);
                            logoFileInputRef.current?.click();
                          }}
                          className="px-4 py-2 rounded-xl bg-[#E65100] hover:bg-[#D84315] disabled:opacity-50 text-white font-extrabold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                        >
                          {isUploadingLogo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{language === 'th' ? 'กำลังประมวลผล...' : 'Processing...'}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>{language === 'th' ? 'เลือกไฟล์รูปภาพโลโก้' : 'Upload New Logo'}</span>
                            </>
                          )}
                        </button>

                        {logoPreview && (
                          <>
                            <button
                              type="button"
                              disabled={isSavingLogo}
                              onClick={handleSaveLogo}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {isSavingLogo ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>{language === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>{language === 'th' ? 'บันทึกโลโก้' : 'Save Logo'}</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isSavingLogo}
                              onClick={handleCancelLogo}
                              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                            >
                              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                            </button>
                          </>
                        )}
                      </div>

                      {logoError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{logoError}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-gray-500">
                        <span>{language === 'th' ? 'หรือระบุ URL รูปภาพโดยตรง:' : 'Or direct Image URL:'}</span>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={settings.logoUrl}
                          onChange={(e) => updateSettings({ logoUrl: e.target.value })}
                          className="mt-1 w-full bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form fields for phone, line, whatsapp, restaurantName, passcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'ชื่อร้านอาหาร' : 'Restaurant Name'}
                    </label>
                    <input
                      type="text"
                      value={settings.restaurantName}
                      onChange={(e) => updateSettings({ restaurantName: e.target.value })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'เบอร์โทรศัพท์ร้าน' : 'Phone Number'}
                    </label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => updateSettings({ phone: e.target.value, phoneDisplay: e.target.value })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">LINE ID</label>
                    <input
                      type="text"
                      value={settings.lineId}
                      onChange={(e) => updateSettings({ lineId: e.target.value })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'เบอร์ WhatsApp (รหัสสากลตัวเลข เช่น 66841536498)' : 'WhatsApp International Number (digits)'}
                    </label>
                    <input
                      type="text"
                      value={settings.whatsAppIntlNumber}
                      onChange={(e) => updateSettings({ whatsAppIntlNumber: e.target.value })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'คำโปรยร้าน (อังกฤษ)' : 'Tagline (English)'}
                    </label>
                    <input
                      type="text"
                      value={settings.taglineEn || ''}
                      onChange={(e) => updateSettings({ taglineEn: e.target.value })}
                      placeholder="Authentic Thai Flavors & Fast Ordering"
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'คำโปรยร้าน (ไทย)' : 'Tagline (Thai)'}
                    </label>
                    <input
                      type="text"
                      value={settings.taglineTh || ''}
                      onChange={(e) => updateSettings({ taglineTh: e.target.value })}
                      placeholder="รสชาติไทยแท้ สั่งง่าย ส่งไว"
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'ที่อยู่ร้านค้า' : 'Store Address'}
                    </label>
                    <input
                      type="text"
                      value={settings.address || ''}
                      onChange={(e) => updateSettings({ address: e.target.value })}
                      placeholder="Bangkok, Thailand"
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'ภาษาเริ่มต้นของระบบ' : 'Default App Language'}
                    </label>
                    <select
                      value={settings.defaultLanguage || 'en'}
                      onChange={(e) => updateSettings({ defaultLanguage: e.target.value as 'en' | 'th' })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    >
                      <option value="en">English (EN)</option>
                      <option value="th">ภาษาไทย (TH)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-600 block mb-1">
                      {language === 'th' ? 'รหัสผ่านเจ้าของร้าน (Passcode)' : 'Owner Passcode'}
                    </label>
                    <input
                      type="password"
                      value={settings.ownerPasscodeHash}
                      onChange={(e) => updateSettings({ ownerPasscodeHash: e.target.value })}
                      className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- NOTIFICATIONS TAB (Direct Sidebar Access) ---------------- */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <OwnerSoundSettingsCard language={language} />
          </div>
        )}

        {/* ---------------- ORDERING CHANNELS TAB ---------------- */}
            {activeTab === 'channels' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
                <h2 className="text-base font-extrabold text-[#1A1A1A]">Ordering Channels</h2>
                <div className="space-y-3">
                  {[
                    { key: 'whatsApp', label: 'WhatsApp Direct Ordering', desc: 'Allows customers to send orders via WhatsApp' },
                    { key: 'line', label: 'LINE Ordering (Clipboard & App Handoff)', desc: 'Allows customers to copy and send orders to LINE' },
                    { key: 'pickup', label: 'Pickup (Takeaway)', desc: 'Customers pick up at Tony\'s Kitchen' },
                    { key: 'delivery', label: 'Delivery', desc: 'Food delivery to customer address' },
                  ].map(ch => (
                    <label key={ch.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.channels[ch.key as keyof typeof settings.channels]}
                        onChange={(e) => {
                          updateSettings({
                            channels: {
                              ...settings.channels,
                              [ch.key]: e.target.checked,
                            },
                          });
                        }}
                        className="mt-0.5 w-4 h-4 text-[#E65100] rounded focus:ring-[#E65100]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1A1A1A] block">{ch.label}</span>
                        <span className="text-[11px] text-gray-500">{ch.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- DATA & DEMO RESET TAB ---------------- */}
            {activeTab === 'data' && (
              <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-5">
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1A1A]">App Data & Backup Tools</h2>
                  <p className="text-xs text-gray-500">
                    Backup menu data as JSON, import from backup, or restore factory demo data.
                  </p>
                </div>

                {/* Reset Demo Card */}
                <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-orange-900 font-bold text-xs">
                    <RotateCcw className="w-4 h-4 text-[#E65100]" />
                    <span>{t('resetDemoTitle')}</span>
                  </div>
                  <p className="text-xs text-orange-800/80 leading-relaxed">
                    {t('resetDemoDesc')}
                  </p>
                  <button
                    type="button"
                    id="trigger-reset-demo-btn"
                    onClick={() => setShowResetConfirm(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-bold hover:bg-[#D84315] transition-all"
                  >
                    {t('resetDemoTitle')}
                  </button>
                </div>

                {/* Export / Import */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = exportDataJson();
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `tonys_kitchen_backup_${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      showToast('Backup JSON downloaded.');
                    }}
                    className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-left hover:bg-gray-100 flex items-center gap-3"
                  >
                    <Download className="w-5 h-5 text-[#E65100]" />
                    <div>
                      <span className="text-xs font-bold text-[#1A1A1A] block">{t('exportData')}</span>
                      <span className="text-[10px] text-gray-500">Download complete catalog file</span>
                    </div>
                  </button>

                  <label className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-left hover:bg-gray-100 flex items-center gap-3 cursor-pointer">
                    <Upload className="w-5 h-5 text-[#E65100]" />
                    <div>
                      <span className="text-xs font-bold text-[#1A1A1A] block">{t('importData')}</span>
                      <span className="text-[10px] text-gray-500">Upload and restore JSON file</span>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            if (importDataJson(content)) {
                              showToast('Data restored successfully!');
                            } else {
                              alert('Invalid JSON structure.');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ---------------- ITEM EDIT MODAL ---------------- */}
      {editingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1A1A]">
                {isAddingItem ? t('addItem') : t('editItemTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setFoodImageError(null);
                  setShowRemoveImageConfirm(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">English Name *</label>
                <input
                  type="text"
                  value={editingItem.name.en}
                  onChange={(e) => setEditingItem({ ...editingItem, name: { ...editingItem.name, en: e.target.value } })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Thai Name *</label>
                <input
                  type="text"
                  value={editingItem.name.th}
                  onChange={(e) => setEditingItem({ ...editingItem, name: { ...editingItem.name, th: e.target.value } })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">English Description *</label>
                <textarea
                  rows={2}
                  value={editingItem.description.en}
                  onChange={(e) => setEditingItem({ ...editingItem, description: { ...editingItem.description, en: e.target.value } })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Thai Description *</label>
                <textarea
                  rows={2}
                  value={editingItem.description.th}
                  onChange={(e) => setEditingItem({ ...editingItem, description: { ...editingItem.description, th: e.target.value } })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category</label>
                  <select
                    value={editingItem.categoryId}
                    onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name?.en || (typeof c.name === 'string' ? c.name : 'Category')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Internal Base Price (฿)</label>
                  <input
                    type="number"
                    value={editingItem.basePrice}
                    onChange={(e) => setEditingItem({ ...editingItem, basePrice: Number(e.target.value) || 0 })}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {/* Food Image Section */}
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">
                  {t('foodImage')}
                </label>

                <input
                  ref={foodFileInputRef}
                  type="file"
                  accept="image/jpeg, image/jpg, image/png, image/webp"
                  onChange={handleFoodImageFileChange}
                  className="hidden"
                />

                {!editingItem.imageUrl ? (
                  /* No image uploaded yet -> Add Food Image box */
                  <button
                    type="button"
                    onClick={() => {
                      setFoodImageError(null);
                      foodFileInputRef.current?.click();
                    }}
                    className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#E65100] bg-gray-50/70 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-gray-200 group-hover:border-orange-300 group-hover:scale-105 flex items-center justify-center transition-all text-[#E65100]">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 group-hover:text-[#E65100] transition-colors">
                      {t('addFoodImage')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      JPG, JPEG, PNG, WEBP (Max 5MB)
                    </span>
                  </button>
                ) : (
                  /* Image exists -> Current Food Image Preview & Actions */
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#E65100]" />
                        {t('currentFoodImage')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 shrink-0 shadow-2xs">
                        <img
                          src={editingItem.imageUrl}
                          alt="Food Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 items-center flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFoodImageError(null);
                            foodFileInputRef.current?.click();
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-[#E65100] text-gray-700 hover:text-[#E65100] font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{t('changeImage')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRemoveImageConfirm(true)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('removeImage')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation error message */}
                {foodImageError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{foodImageError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Availability State</label>
                <select
                  value={editingItem.availability}
                  onChange={(e) => setEditingItem({ ...editingItem, availability: e.target.value as AvailabilityStatus })}
                  className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                >
                  <option value="available">Available</option>
                  <option value="out_today">Out of stock today (Auto reset tomorrow)</option>
                  <option value="out_indefinitely">Out indefinitely</option>
                  <option value="hidden">Hidden from customer menu</option>
                </select>
              </div>

              {/* Modifier Groups Attached */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Attach Modifier Groups</label>
                <div className="space-y-1 bg-gray-50 p-2.5 rounded-xl">
                  {modifierGroups.map(group => {
                    const isChecked = editingItem.modifierGroupIds.includes(group.id);
                    return (
                      <label key={group.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...editingItem.modifierGroupIds, group.id]
                              : editingItem.modifierGroupIds.filter(id => id !== group.id);
                            setEditingItem({ ...editingItem, modifierGroupIds: newIds });
                          }}
                        />
                        <span>{group.name?.en || (typeof group.name === 'string' ? group.name : 'Group')} ({group.options?.length || 0} options)</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.isSignature || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isSignature: e.target.checked })}
                  />
                  <span>Mark as Signature Dish</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.isPopular || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isPopular: e.target.checked })}
                  />
                  <span>Mark as Popular</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setFoodImageError(null);
                  setShowRemoveImageConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleSaveMenuItem(editingItem)}
                className="px-4 py-2 rounded-xl bg-[#E65100] text-white text-xs font-bold hover:bg-[#D84315]"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>

          {/* Remove Food Image Confirmation Dialog */}
          {showRemoveImageConfirm && (
            <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-sm font-black text-[#1A1A1A]">
                    {t('removeImageConfirm')}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t('removeImageConfirmDesc')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRemoveImageConfirm(false)}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingItem) {
                        setEditingItem({ ...editingItem, imageUrl: '' });
                      }
                      setShowRemoveImageConfirm(false);
                      setFoodImageError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    {t('confirmRemoveImageBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- CATEGORY EDIT MODAL ---------------- */}
      {editingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-sm font-black text-[#1A1A1A]">
              {isAddingCategory ? 'Add Category' : 'Edit Category'}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">English Name</label>
              <input
                type="text"
                value={editingCategory.name.en}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: { ...editingCategory.name, en: e.target.value } })}
                className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Thai Name</label>
              <input
                type="text"
                value={editingCategory.name.th}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: { ...editingCategory.name, th: e.target.value } })}
                className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCategory(editingCategory)}
                className="px-3 py-1.5 rounded-xl bg-[#E65100] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODIFIER GROUP EDIT MODAL ---------------- */}
      {editingGroup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col p-5 space-y-3 overflow-hidden">
            <h3 className="text-sm font-black text-[#1A1A1A]">
              {isAddingGroup ? 'Add Modifier Group' : 'Edit Modifier Group'}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">English Name</label>
                  <input
                    type="text"
                    value={editingGroup.name.en}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: { ...editingGroup.name, en: e.target.value } })}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Thai Name</label>
                  <input
                    type="text"
                    value={editingGroup.name.th}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: { ...editingGroup.name, th: e.target.value } })}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingGroup.required}
                    onChange={(e) => setEditingGroup({ ...editingGroup, required: e.target.checked })}
                  />
                  <span>Required</span>
                </label>
                <div>
                  <label className="font-bold text-gray-700 mr-2">Max Selections:</label>
                  <input
                    type="number"
                    min={1}
                    value={editingGroup.maxSelections}
                    onChange={(e) => setEditingGroup({ ...editingGroup, maxSelections: Number(e.target.value) || 1 })}
                    className="w-16 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200"
                  />
                </div>
              </div>

              {/* Options list editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-gray-700">Options in this Group</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newOpt: ModifierOption = {
                        id: `opt_${Date.now()}_${editingGroup.options.length + 1}`,
                        name: { en: 'New Option', th: 'ตัวเลือกใหม่' },
                        priceAdjustment: 0,
                        availability: 'available',
                        displayOrder: editingGroup.options.length + 1,
                      };
                      setEditingGroup({ ...editingGroup, options: [...editingGroup.options, newOpt] });
                    }}
                    className="text-[11px] font-bold text-[#E65100] hover:underline"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="space-y-2">
                  {editingGroup.options.map((opt, optIdx) => (
                    <div key={opt.id} className="p-2.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="EN Name"
                          value={opt.name.en}
                          onChange={(e) => {
                            const newOpts = [...editingGroup.options];
                            newOpts[optIdx] = { ...opt, name: { ...opt.name, en: e.target.value } };
                            setEditingGroup({ ...editingGroup, options: newOpts });
                          }}
                          className="bg-white px-2 py-1 rounded-lg border border-gray-200"
                        />
                        <input
                          type="text"
                          placeholder="TH Name"
                          value={opt.name.th}
                          onChange={(e) => {
                            const newOpts = [...editingGroup.options];
                            newOpts[optIdx] = { ...opt, name: { ...opt.name, th: e.target.value } };
                            setEditingGroup({ ...editingGroup, options: newOpts });
                          }}
                          className="bg-white px-2 py-1 rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Price +฿:</span>
                          <input
                            type="number"
                            value={opt.priceAdjustment}
                            onChange={(e) => {
                              const newOpts = [...editingGroup.options];
                              newOpts[optIdx] = { ...opt, priceAdjustment: Number(e.target.value) || 0 };
                              setEditingGroup({ ...editingGroup, options: newOpts });
                            }}
                            className="w-16 bg-white px-2 py-1 rounded-lg border border-gray-200"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Move up */}
                          <button
                            type="button"
                            disabled={optIdx === 0}
                            onClick={() => {
                              const newOpts = [...editingGroup.options];
                              const temp = newOpts[optIdx];
                              newOpts[optIdx] = newOpts[optIdx - 1];
                              newOpts[optIdx - 1] = temp;
                              setEditingGroup({
                                ...editingGroup,
                                options: newOpts.map((o, i) => ({ ...o, displayOrder: i + 1 })),
                              });
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Move down */}
                          <button
                            type="button"
                            disabled={optIdx === editingGroup.options.length - 1}
                            onClick={() => {
                              const newOpts = [...editingGroup.options];
                              const temp = newOpts[optIdx];
                              newOpts[optIdx] = newOpts[optIdx + 1];
                              newOpts[optIdx + 1] = temp;
                              setEditingGroup({
                                ...editingGroup,
                                options: newOpts.map((o, i) => ({ ...o, displayOrder: i + 1 })),
                              });
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup({
                                ...editingGroup,
                                options: editingGroup.options.filter(o => o.id !== opt.id),
                              });
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModifierGroup(editingGroup)}
                className="px-3 py-1.5 rounded-xl bg-[#E65100] text-white text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- HOLIDAY CALENDAR MODAL ---------------- */}
      <HolidayCalendarModal
        isOpen={Boolean(editingHoliday || isAddingHoliday)}
        onClose={() => {
          setEditingHoliday(null);
          setIsAddingHoliday(false);
        }}
        holiday={editingHoliday}
        isAdding={isAddingHoliday}
        onSave={handleSaveHoliday}
        language={language}
      />

      {/* ---------------- RESET DEMO CONFIRMATION MODAL ---------------- */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-[#1A1A1A]">
                {t('resetDemoTitle')}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {t('resetDemoDesc')}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="confirm-reset-demo-action"
                onClick={() => {
                  resetDemoData();
                  setShowResetConfirm(false);
                  showToast(t('dataResetSuccess'));
                }}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 transition-all"
              >
                {t('resetDemoConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-all"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- NEW ORDER NOTIFICATION ALERT MODAL ---------------- */}
      <NewOrderAlertModal
        orders={newOrdersAlertQueue}
        language={language}
        onViewOrder={handleViewOrderFromAlert}
        onDismissOrder={handleDismissAlertOrder}
        onDismissAll={handleDismissAllAlerts}
      />
    </div>
  );
};
