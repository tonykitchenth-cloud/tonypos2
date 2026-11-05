import React, { useState, useEffect } from 'react';
import { SavedDeliveryAddress, Language } from '../../types';
import { loadCustomerProfile, saveCustomerProfile } from '../../utils/storage';
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
  BookmarkCheck,
  AlertCircle,
  Loader2,
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

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{
    latitude?: number;
    longitude?: number;
    mapsUrl?: string;
    accuracy?: number;
  }>({
    latitude,
    longitude,
    mapsUrl,
  });

  // New address saving state
  const [showSavePrompt, setShowSavePrompt] = useState<boolean>(false);
  const [newAddressLabel, setNewAddressLabel] = useState<string>('บ้าน');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Sync external GPS props
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      setCurrentGps((prev) => ({
        ...prev,
        latitude,
        longitude,
        mapsUrl: mapsUrl || `https://www.google.com/maps?q=${latitude},${longitude}`,
      }));
    }
  }, [latitude, longitude, mapsUrl]);

  // Sync saved addresses with storage
  const persistSavedAddresses = (updated: SavedDeliveryAddress[]) => {
    setSavedAddresses(updated);
    saveCustomerProfile({ savedAddresses: updated });
  };

  // Select a saved address chip
  const handleSelectSavedAddress = (item: SavedDeliveryAddress) => {
    setSelectedAddressId(item.id);
    onChangeAddress(item.address);

    const gpsData = {
      latitude: item.latitude,
      longitude: item.longitude,
      mapsUrl: item.mapsUrl || (item.latitude && item.longitude ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}` : undefined),
    };
    setCurrentGps(gpsData);
    if (onGpsChange) {
      onGpsChange(gpsData);
    }
    setGpsError(null);
  };

  // Delete a saved address
  const handleDeleteSavedAddress = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedAddresses.filter((a) => a.id !== id);
    persistSavedAddresses(updated);
    if (selectedAddressId === id) {
      setSelectedAddressId(null);
    }
  };

  // Pin Current GPS Location using Browser Geolocation API
  const handlePinCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError(isThai ? 'เบราว์เซอร์ของคุณไม่รองรับการระบุพิกัด GPS' : 'Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = Math.round(position.coords.accuracy);
        const pinUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const gpsData = {
          latitude: lat,
          longitude: lng,
          mapsUrl: pinUrl,
          accuracy: acc,
        };
        setCurrentGps(gpsData);

        if (onGpsChange) {
          onGpsChange({ latitude: lat, longitude: lng, mapsUrl: pinUrl });
        }

        // Save current GPS in profile
        saveCustomerProfile({
          currentLatitude: lat,
          currentLongitude: lng,
          currentMapsUrl: pinUrl,
        });

        // If address text is empty or doesn't mention GPS, append pin link indicator
        if (!address.includes('maps.google.com') && !address.includes('google.com/maps')) {
          const gpsNote = `📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          if (!address.trim()) {
            onChangeAddress(gpsNote);
          }
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError(isThai ? 'กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location Permission) ในเบราว์เซอร์เพื่อปักหมุด GPS' : 'Please allow Location Access in browser settings to pin GPS');
        } else {
          setGpsError(isThai ? 'ไม่สามารถดึงพิกัด GPS ได้ กรุณาลองใหม่อีกครั้ง' : 'Unable to determine GPS location. Please try again');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  // Save current address to saved addresses list
  const handleSaveCurrentAddress = () => {
    if (!address.trim()) return;

    const finalLabel = (newAddressLabel === 'other' ? customLabel.trim() : newAddressLabel) || (isThai ? 'ที่อยู่จัดส่ง' : 'Delivery Address');

    const newEntry: SavedDeliveryAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: finalLabel,
      address: address.trim(),
      latitude: currentGps.latitude,
      longitude: currentGps.longitude,
      mapsUrl: currentGps.mapsUrl,
    };

    const updated = [newEntry, ...savedAddresses.filter((a) => a.address.trim() !== address.trim())];
    persistSavedAddresses(updated);
    setSelectedAddressId(newEntry.id);
    setShowSavePrompt(false);
    setSaveSuccessNotice(isThai ? `บันทึก "${finalLabel}" เรียบร้อยแล้ว` : `Saved as "${finalLabel}"!`);
    setTimeout(() => setSaveSuccessNotice(null), 3000);
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
      {/* 1. Header with Label and Quick Pin Button */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-gray-700 block">
          {isThai ? 'ที่อยู่จัดส่งและปักหมุด GPS' : 'Delivery Address & GPS Pin'} *
        </label>

        {/* GPS Pin Button */}
        <button
          type="button"
          id="btn-pin-gps-location"
          disabled={isLocating}
          onClick={handlePinCurrentLocation}
          className="px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 active:scale-95 text-[#E65100] border border-orange-200 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          title={isThai ? 'ปักหมุดพิกัด GPS ตำแหน่งปัจจุบันของคุณ' : 'Pin your current GPS location'}
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E65100]" />
              <span>{isThai ? 'กำลังค้นหา GPS...' : 'Locating...'}</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-[#E65100]" />
              <span>{isThai ? '📍 ปักหมุด GPS ปัจจุบัน' : '📍 Pin My GPS'}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Multiple Saved Addresses Pills (if customer has any saved) */}
      {savedAddresses.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
            <span>{isThai ? 'ที่อยู่ที่บันทึกไว้ (เลือกใช้ได้ทันที):' : 'Saved Addresses (Tap to select):'}</span>
            <span>{savedAddresses.length} {isThai ? 'ที่อยู่' : 'saved'}</span>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {savedAddresses.map((item) => {
              const isSelected = selectedAddressId === item.id || address.trim() === item.address.trim();
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSavedAddress(item)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 border-[#E65100] text-[#E65100] shadow-xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {getLabelIcon(item.label)}
                  <span>{item.label}</span>
                  {item.latitude && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">
                      GPS
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedAddress(e, item.id)}
                    className="p-0.5 rounded-full hover:bg-black/10 text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                    title={isThai ? 'ลบที่อยู่นี้' : 'Delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Address Textarea Input */}
      <div>
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
      </div>

      {/* 4. Active GPS Coordinates Badge & Google Maps Link */}
      {currentGps.latitude && currentGps.longitude && (
        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-900 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block text-emerald-950">
                {isThai ? '📍 ปักหมุด GPS แล้ว เพื่อความแม่นยำในการจัดส่ง' : '📍 GPS Pinned for Exact Delivery'}
              </span>
              <span className="font-mono text-[11px] text-emerald-700 block truncate">
                {currentGps.latitude.toFixed(6)}, {currentGps.longitude.toFixed(6)}
                {currentGps.accuracy && ` (±${currentGps.accuracy}m)`}
              </span>
            </div>
          </div>

          <a
            href={currentGps.mapsUrl || `https://www.google.com/maps?q=${currentGps.latitude},${currentGps.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-xs"
          >
            <span>{isThai ? 'ดูแผนที่' : 'Map'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* GPS Error Notice */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Success Notice */}
      {saveSuccessNotice && (
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* 5. Save this Address Button / Form */}
      {address.trim().length > 5 && !showSavePrompt && (
        <button
          type="button"
          onClick={() => setShowSavePrompt(true)}
          className="text-xs font-bold text-[#E65100] hover:text-[#D84315] flex items-center gap-1.5 py-1 transition-colors cursor-pointer"
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>{isThai ? '+ บันทึกที่อยู่นี้ไว้ใช้ครั้งต่อไป' : '+ Save this address for future orders'}</span>
        </button>
      )}

      {showSavePrompt && (
        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">
              {isThai ? 'บันทึกที่อยู่นี้ในชื่อ:' : 'Save Address As:'}
            </span>
            <button
              type="button"
              onClick={() => setShowSavePrompt(false)}
              className="text-gray-400 hover:text-gray-600 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'บ้าน', en: 'Home', icon: Home },
              { id: 'ที่ทำงาน', en: 'Work', icon: Briefcase },
              { id: 'คอนโด', en: 'Condo', icon: Building },
              { id: 'other', en: 'Other', icon: MapPin },
            ].map((tag) => {
              const Icon = tag.icon;
              const isTagSelected = newAddressLabel === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setNewAddressLabel(tag.id)}
                  className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isTagSelected
                      ? 'bg-orange-50 border-[#E65100] text-[#E65100]'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{isThai ? tag.id : tag.en}</span>
                </button>
              );
            })}
          </div>

          {newAddressLabel === 'other' && (
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={isThai ? 'เช่น บ้านคุณแม่, โรงแรม, คาเฟ่' : 'e.g. Hotel, Mom\'s house'}
              className="w-full p-2 bg-white rounded-xl border border-gray-200 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#E65100]"
            />
          )}

          <button
            type="button"
            id="btn-confirm-save-address"
            onClick={handleSaveCurrentAddress}
            className="w-full py-2 px-3 rounded-xl bg-[#E65100] hover:bg-[#D84315] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isThai ? 'บันทึกที่อยู่ลงเครื่อง' : 'Save Address to Device'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
