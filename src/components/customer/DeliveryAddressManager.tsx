import React, { useState, useEffect } from 'react';
import { SavedDeliveryAddress, Language } from '../../types';
import { loadCustomerProfile, saveCustomerProfile } from '../../utils/storage';
import { InteractiveMapModal } from './InteractiveMapModal';
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Check,
  ExternalLink,
  Home,
  Briefcase,
  Building,
  Edit2,
  AlertCircle,
  Loader2,
  Map,
  X,
  Compass,
} from 'lucide-react';

interface DeliveryAddressManagerProps {
  language: Language;
  address: string;
  onChangeAddress: (newAddress: string) => void;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  onGpsChange?: (gps: { latitude?: number; longitude?: number; mapsUrl?: string }) => void;
}

export const DeliveryAddressManager: React.FC<DeliveryAddressManagerProps> = ({
  language,
  address,
  onChangeAddress,
  latitude,
  longitude,
  mapsUrl,
  onGpsChange,
}) => {
  const isThai = language === 'th';

  // Load saved addresses from customer profile storage
  const [savedAddresses, setSavedAddresses] = useState<SavedDeliveryAddress[]>(() => {
    const profile = loadCustomerProfile();
    return profile.savedAddresses || [];
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => {
    const profile = loadCustomerProfile();
    const found = (profile.savedAddresses || []).find((a) => a.address.trim() === address.trim());
    return found ? found.id : null;
  });

  const [currentGps, setCurrentGps] = useState<{
    latitude?: number;
    longitude?: number;
    mapsUrl?: string;
  }>({
    latitude,
    longitude,
    mapsUrl,
  });

  // State for Add / Edit Address form modal
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState<string>('บ้าน');
  const [formCustomLabel, setFormCustomLabel] = useState<string>('');
  const [formAddressText, setFormAddressText] = useState<string>('');
  const [formLat, setFormLat] = useState<number | undefined>(latitude);
  const [formLng, setFormLng] = useState<number | undefined>(longitude);
  const [formMapsUrl, setFormMapsUrl] = useState<string | undefined>(mapsUrl);
  const [formError, setFormError] = useState<string | null>(null);

  // State for Interactive Map Modal
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [mapTarget, setMapTarget] = useState<'form' | 'direct'>('form');

  // Quick GPS detection state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sync external GPS props
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      setCurrentGps({
        latitude,
        longitude,
        mapsUrl: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      });
    }
  }, [latitude, longitude, mapsUrl]);

  // CRITICAL SYNC: Ensure the active address ALWAYS connects with its saved GPS pin
  useEffect(() => {
    if (address && address.trim()) {
      const match = savedAddresses.find((a) => a.address.trim() === address.trim());
      if (match) {
        setSelectedAddressId(match.id);
        if (match.latitude && match.longitude) {
          const pinUrl =
            match.mapsUrl ||
            `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`;
          setCurrentGps({
            latitude: match.latitude,
            longitude: match.longitude,
            mapsUrl: pinUrl,
          });
          if (onGpsChange) {
            onGpsChange({
              latitude: match.latitude,
              longitude: match.longitude,
              mapsUrl: pinUrl,
            });
          }
        }
      }
    } else if (savedAddresses.length > 0 && !address) {
      // Auto-select first saved address if available and address is blank
      handleSelectSavedAddress(savedAddresses[0]);
    }
  }, [address, savedAddresses]);

  // Persist addresses to storage and sync with customer profile
  const persistSavedAddresses = (updated: SavedDeliveryAddress[]) => {
    setSavedAddresses(updated);
    saveCustomerProfile({ savedAddresses: updated });
  };

  // Open "เพิ่มที่อยู่" (Add New Address) Form
  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormLabel('บ้าน');
    setFormCustomLabel('');
    setFormAddressText('');
    setFormLat(currentGps.latitude);
    setFormLng(currentGps.longitude);
    setFormMapsUrl(currentGps.mapsUrl);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open "แก้ไข" (Edit Saved Address) Form
  const handleOpenEditForm = (item: SavedDeliveryAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);

    const standardLabels = ['บ้าน', 'ที่ทำงาน', 'คอนโด'];
    if (standardLabels.includes(item.label)) {
      setFormLabel(item.label);
      setFormCustomLabel('');
    } else {
      setFormLabel('other');
      setFormCustomLabel(item.label);
    }

    setFormAddressText(item.address);
    setFormLat(item.latitude);
    setFormLng(item.longitude);
    setFormMapsUrl(item.mapsUrl);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Select a saved address to use for this order
  const handleSelectSavedAddress = (item: SavedDeliveryAddress) => {
    setSelectedAddressId(item.id);
    onChangeAddress(item.address);

    const gpsData = {
      latitude: item.latitude,
      longitude: item.longitude,
      mapsUrl:
        item.mapsUrl ||
        (item.latitude && item.longitude
          ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
          : undefined),
    };
    setCurrentGps(gpsData);

    if (onGpsChange) {
      onGpsChange(gpsData);
    }

    // Save active address into profile
    saveCustomerProfile({
      deliveryAddress: item.address,
      currentLatitude: item.latitude,
      currentLongitude: item.longitude,
      currentMapsUrl: gpsData.mapsUrl,
    });
  };

  // Delete a saved address
  const handleDeleteSavedAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAddresses.filter((a) => a.id !== id);
    persistSavedAddresses(updated);

    if (selectedAddressId === id) {
      if (updated.length > 0) {
        handleSelectSavedAddress(updated[0]);
      } else {
        setSelectedAddressId(null);
      }
    }

    setFeedbackNotice(isThai ? 'ลบที่อยู่จัดส่งแล้ว' : 'Address deleted');
    setTimeout(() => setFeedbackNotice(null), 2500);
  };

  // Open Interactive Map to pan and adjust pin
  const handleOpenMap = (target: 'form' | 'direct') => {
    setMapTarget(target);
    setIsMapModalOpen(true);
  };

  // Confirm pin from Interactive Map Modal
  const handleConfirmPinLocation = (location: {
    latitude: number;
    longitude: number;
    mapsUrl: string;
  }) => {
    if (mapTarget === 'form') {
      setFormLat(location.latitude);
      setFormLng(location.longitude);
      setFormMapsUrl(location.mapsUrl);
    } else {
      // Direct update to current active address
      setCurrentGps(location);
      if (onGpsChange) {
        onGpsChange(location);
      }
      saveCustomerProfile({
        currentLatitude: location.latitude,
        currentLongitude: location.longitude,
        currentMapsUrl: location.mapsUrl,
      });

      // If active address exists in saved addresses, update its GPS too
      if (selectedAddressId) {
        const updated = savedAddresses.map((a) =>
          a.id === selectedAddressId
            ? { ...a, latitude: location.latitude, longitude: location.longitude, mapsUrl: location.mapsUrl }
            : a
        );
        persistSavedAddresses(updated);
      }

      setFeedbackNotice(isThai ? 'ปักหมุด GPS บนแผนที่เรียบร้อยแล้ว' : 'GPS location pinned on map!');
      setTimeout(() => setFeedbackNotice(null), 2500);
    }
  };

  // Quick GPS auto-detection using Geolocation API
  const handleQuickLocate = (target: 'form' | 'direct') => {
    if (!navigator.geolocation) {
      alert(isThai ? 'เบราว์เซอร์ไม่รองรับ GPS' : 'Geolocation not supported');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const pinUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        if (target === 'form') {
          setFormLat(lat);
          setFormLng(lng);
          setFormMapsUrl(pinUrl);
        } else {
          const loc = { latitude: lat, longitude: lng, mapsUrl: pinUrl };
          setCurrentGps(loc);
          if (onGpsChange) onGpsChange(loc);
          saveCustomerProfile({
            currentLatitude: lat,
            currentLongitude: lng,
            currentMapsUrl: pinUrl,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert(isThai ? 'กรุณาอนุญาตการเข้าถึงตำแหน่ง (GPS) หรือใช้ปุ่มเปิดแผนที่เพื่อเลือกตำแหน่ง' : 'Please allow location permission or open the map to pin manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save the address form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddressText.trim()) {
      setFormError(isThai ? 'กรุณาระบุรายละเอียดที่อยู่จัดส่ง' : 'Please enter delivery address details');
      return;
    }

    const finalLabel =
      (formLabel === 'other' ? formCustomLabel.trim() : formLabel) ||
      (isThai ? 'ที่อยู่จัดส่ง' : 'Delivery Address');

    const entryToSave: SavedDeliveryAddress = {
      id: editingId || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: finalLabel,
      address: formAddressText.trim(),
      latitude: formLat,
      longitude: formLng,
      mapsUrl: formMapsUrl || (formLat && formLng ? `https://www.google.com/maps?q=${formLat},${formLng}` : undefined),
    };

    let updatedList: SavedDeliveryAddress[];
    if (editingId) {
      updatedList = savedAddresses.map((a) => (a.id === editingId ? entryToSave : a));
    } else {
      updatedList = [entryToSave, ...savedAddresses];
    }

    persistSavedAddresses(updatedList);
    handleSelectSavedAddress(entryToSave);
    setIsFormOpen(false);

    setFeedbackNotice(
      isThai
        ? `บันทึกที่อยู่ "${finalLabel}" เรียบร้อยแล้ว`
        : `Saved "${finalLabel}" address successfully!`
    );
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('บ้าน') || l.includes('home')) return <Home className="w-3.5 h-3.5 text-orange-500" />;
    if (l.includes('งาน') || l.includes('work') || l.includes('office')) return <Briefcase className="w-3.5 h-3.5 text-blue-500" />;
    if (l.includes('คอนโด') || l.includes('condo')) return <Building className="w-3.5 h-3.5 text-purple-500" />;
    return <MapPin className="w-3.5 h-3.5 text-emerald-500" />;
  };

  return (
    <div className="space-y-3" id="delivery-address-manager">
      {/* 1. Header with Title and Prominent "+ เพิ่มที่อยู่" Button */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 block">
          {isThai ? 'ที่อยู่จัดส่งและพิกัด GPS' : 'Delivery Address & GPS'} *
        </label>

        {/* Primary "+ เพิ่มที่อยู่" Button */}
        <button
          type="button"
          id="btn-add-new-address"
          onClick={handleOpenAddForm}
          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 active:scale-95 text-[#E65100] border border-orange-200 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>{isThai ? 'เพิ่มที่อยู่' : 'Add Address'}</span>
        </button>
      </div>

      {/* 2. Feedback Notification Toast */}
      {feedbackNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* 3. Multiple Saved Addresses List */}
      {savedAddresses.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 px-0.5">
            <span>{isThai ? 'ที่อยู่ที่บันทึกไว้ (แตะเพื่อเลือกใช้):' : 'Saved Addresses (Tap to select):'}</span>
            <span>{savedAddresses.length} {isThai ? 'ที่อยู่' : 'saved'}</span>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5 custom-scrollbar">
            {savedAddresses.map((item) => {
              const isSelected = selectedAddressId === item.id || address.trim() === item.address.trim();
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSavedAddress(item)}
                  className={`p-2.5 rounded-2xl border text-xs transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-orange-50/70 border-[#E65100] ring-1 ring-[#E65100]/30 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#E65100] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {getLabelIcon(item.label)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#1A1A1A] text-xs">
                          {item.label}
                        </span>
                        {item.latitude && item.longitude && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            GPS 📍
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-black text-[#E65100] bg-orange-100 px-1.5 py-0.2 rounded-md">
                            {isThai ? 'กำลังเลือกใช้อยู่' : 'Active'}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                        {item.address}
                      </p>

                      {item.latitude && item.longitude && (
                        <span className="font-mono text-[10px] text-gray-400 block mt-0.5">
                          {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete buttons */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditForm(item, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title={isThai ? 'แก้ไขที่อยู่นี้' : 'Edit'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedAddress(item.id, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title={isThai ? 'ลบที่อยู่นี้' : 'Delete'}
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

      {/* 4. Active Selected Address Textarea & Map Pinning Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-700">
            {isThai ? 'รายละเอียดที่อยู่สำหรับออเดอร์นี้:' : 'Delivery Address for this order:'}
          </span>

          {/* Button to open Interactive Map directly */}
          <button
            type="button"
            id="btn-open-interactive-map"
            onClick={() => handleOpenMap('direct')}
            className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#E65100] border border-orange-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            title={isThai ? 'เปิดแผนที่เพื่อเลื่อนหาตำแหน่งหมุดที่ถูกต้อง' : 'Open map to adjust pin position'}
          >
            <Map className="w-3.5 h-3.5 text-[#E65100]" />
            <span>{isThai ? '🗺️ ปักหมุดบนแผนที่' : '🗺️ Pin on Map'}</span>
          </button>
        </div>

        <textarea
          id="checkout-address-input"
          rows={2}
          value={address}
          onChange={(e) => {
            onChangeAddress(e.target.value);
            setSelectedAddressId(null);
          }}
          placeholder={
            isThai
              ? 'บ้านเลขที่, ชื่ออาคาร/คอนโด, ชั้น/ห้อง, ซอย, ถนน, จุดสังเกต...'
              : 'Street, Building/Condo, Room number, Floor, Landmarks...'
          }
          className="w-full bg-white px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] resize-none transition-all shadow-xs"
        />

        {/* GPS Pinned Coordinates Indicator */}
        {currentGps.latitude && currentGps.longitude ? (
          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-950 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <span className="font-extrabold block text-emerald-950">
                  {isThai ? '📍 ปักหมุด GPS แล้ว (ไรเดอร์นำทางได้แม่นยำ)' : '📍 GPS Pinned for Exact Rider Navigation'}
                </span>
                <span className="font-mono text-[11px] text-emerald-700 block truncate">
                  {currentGps.latitude.toFixed(6)}, {currentGps.longitude.toFixed(6)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenMap('direct')}
                className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-[#E65100] font-bold text-[11px] transition-colors"
                title={isThai ? 'เลื่อนหมุดในแผนที่' : 'Adjust Pin'}
              >
                {isThai ? 'เลื่อนหมุด' : 'Adjust'}
              </button>
              <a
                href={
                  currentGps.mapsUrl ||
                  `https://www.google.com/maps?q=${currentGps.latitude},${currentGps.longitude}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
              >
                <span>{isThai ? 'ดูแผนที่' : 'Map'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-2 bg-orange-50/60 rounded-xl border border-orange-100 text-xs">
            <span className="text-gray-500 text-[11px]">
              {isThai ? 'ยังไม่ได้ปักหมุด GPS สำหรับที่อยู่นี้' : 'No GPS pin attached to this address'}
            </span>
            <button
              type="button"
              disabled={isLocating}
              onClick={() => handleQuickLocate('direct')}
              className="text-[#E65100] hover:text-[#D84315] font-bold text-[11px] flex items-center gap-1 transition-colors"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>{isThai ? 'ดึง GPS ปัจจุบัน' : 'Get Current GPS'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT ADDRESS MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative border border-gray-100 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#E65100] flex items-center justify-center">
                  <MapPin className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-black text-[#1A1A1A]">
                  {editingId
                    ? (isThai ? 'แก้ไขที่อยู่จัดส่ง' : 'Edit Delivery Address')
                    : (isThai ? 'เพิ่มที่อยู่จัดส่งใหม่' : 'Add New Delivery Address')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Label Tag Chips */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {isThai ? 'ประเภทที่อยู่ / ป้ายกำกับ:' : 'Address Label:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'บ้าน', en: 'Home', icon: Home },
                    { id: 'ที่ทำงาน', en: 'Work', icon: Briefcase },
                    { id: 'คอนโด', en: 'Condo', icon: Building },
                    { id: 'other', en: 'Other', icon: MapPin },
                  ].map((tag) => {
                    const Icon = tag.icon;
                    const isTagSelected = formLabel === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormLabel(tag.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isTagSelected
                            ? 'bg-orange-50 border-[#E65100] text-[#E65100] shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{isThai ? tag.id : tag.en}</span>
                      </button>
                    );
                  })}
                </div>

                {formLabel === 'other' && (
                  <input
                    type="text"
                    value={formCustomLabel}
                    onChange={(e) => setFormCustomLabel(e.target.value)}
                    placeholder={isThai ? 'เช่น บ้านคุณแม่, โรงแรม, คาเฟ่' : "e.g. Mom's house, Hotel"}
                    className="w-full mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#E65100]"
                  />
                )}
              </div>

              {/* Address Details Input */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  {isThai ? 'รายละเอียดที่อยู่จัดส่ง:' : 'Delivery Address Details:'} *
                </label>
                <textarea
                  rows={3}
                  value={formAddressText}
                  onChange={(e) => setFormAddressText(e.target.value)}
                  placeholder={
                    isThai
                      ? 'บ้านเลขที่, ชื่ออาคาร/หมู่บ้าน, ชั้น/ห้อง, ซอย, ถนน, ตำบล, อำเภอ, จุดสังเกต...'
                      : 'House/Room number, Building/Village, Street, Sub-district, Landmarks...'
                  }
                  className="w-full bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65100]/30 focus:border-[#E65100] resize-none"
                />
              </div>

              {/* GPS Pinning Section with Map Button */}
              <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1A1A1A] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E65100]" />
                    {isThai ? 'พิกัด GPS สำหรับที่อยู่นี้' : 'GPS Coordinates for this address'}
                  </span>

                  {formLat && formLng && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {isThai ? 'ปักหมุดแล้ว' : 'Pinned'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isThai
                    ? 'เปิดแผนที่เพื่อเลื่อนหาตำแหน่งหน้าบ้าน/อาคารของคุณได้อย่างแม่นยำ เพื่อให้ไรเดอร์ส่งอาหารได้ตรงจุด'
                    : 'Open map to position pin directly at your door or building entrance for accurate delivery.'}
                </p>

                {formLat && formLng && (
                  <div className="p-2 bg-white rounded-xl border border-orange-200 text-xs flex items-center justify-between">
                    <span className="font-mono text-[11px] text-gray-700 font-bold">
                      {formLat.toFixed(6)}, {formLng.toFixed(6)}
                    </span>
                    <a
                      href={formMapsUrl || `https://www.google.com/maps?q=${formLat},${formLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#E65100] font-bold text-[11px] flex items-center gap-1 hover:underline"
                    >
                      <span>{isThai ? 'ดูบน Google Maps' : 'View on Maps'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Map Button Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-form-open-map"
                    onClick={() => handleOpenMap('form')}
                    className="py-2.5 px-3 rounded-xl bg-[#E65100] hover:bg-[#D84315] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Map className="w-4 h-4" />
                    <span>{isThai ? 'เลื่อนหมุดในแผนที่' : 'Adjust on Map'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLocating}
                    onClick={() => handleQuickLocate('form')}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-orange-50 border border-orange-200 text-[#E65100] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span>{isThai ? 'พิกัด GPS ปัจจุบัน' : 'Use Current GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-3 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors"
                >
                  {isThai ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-save-address-entry"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1A1A1A] hover:bg-black text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isThai ? 'บันทึกที่อยู่นี้' : 'Save Address'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INTERACTIVE LEAFLET MAP MODAL (เลื่อนหาตำแหน่งหมุดที่ถูกต้องได้ในแผนที่) */}
      <InteractiveMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialLat={mapTarget === 'form' ? formLat : currentGps.latitude}
        initialLng={mapTarget === 'form' ? formLng : currentGps.longitude}
        onConfirmLocation={handleConfirmPinLocation}
        language={language}
      />
    </div>
  );
};
