import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { X, Navigation, Check, ZoomIn, ZoomOut, MapPin, Loader2, Info } from 'lucide-react';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onConfirmLocation: (location: { latitude: number; longitude: number; mapsUrl: string }) => void;
  language?: 'th' | 'en';
}

// Default fallback location: Bangkok central coordinate
const DEFAULT_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
};

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  onConfirmLocation,
  language = 'th',
}) => {
  const isThai = language === 'th';
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>(() => ({
    lat: initialLat || DEFAULT_CENTER.lat,
    lng: initialLng || DEFAULT_CENTER.lng,
  }));

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Initialize or re-center map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const startLat = initialLat || currentCenter.lat || DEFAULT_CENTER.lat;
    const startLng = initialLng || currentCenter.lng || DEFAULT_CENTER.lng;

    // Small delay to ensure modal DOM is mounted and sized
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up previous map if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: initialLat ? 17 : 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Listen to map move events to update center pin
      map.on('movestart', () => {
        setIsMapMoving(true);
      });

      map.on('move', () => {
        const center = map.getCenter();
        setCurrentCenter({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCenter({
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        });
        setIsMapMoving(false);
      });

      // Allow clicking on map to re-center smoothly
      map.on('click', (e) => {
        map.panTo(e.latlng, { animate: true });
      });

      mapInstanceRef.current = map;

      // Force recalculation of container size
      map.invalidateSize();

      // If no initialLat provided, automatically try to center on user's current GPS
      if (!initialLat && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (mapInstanceRef.current) {
              const uLat = pos.coords.latitude;
              const uLng = pos.coords.longitude;
              mapInstanceRef.current.setView([uLat, uLng], 17, { animate: true });
              setCurrentCenter({
                lat: Number(uLat.toFixed(6)),
                lng: Number(uLng.toFixed(6)),
              });
            }
          },
          () => {
            // Silently fall back to default
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  // Handle Current Location GPS Click
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError(isThai ? 'อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS' : 'Geolocation is not supported');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([uLat, uLng], 18, { duration: 1.2 });
        }
        setCurrentCenter({
          lat: Number(uLat.toFixed(6)),
          lng: Number(uLng.toFixed(6)),
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationError(
          isThai
            ? 'ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาเปิดการเข้าถึงตำแหน่ง (GPS) หรือเลื่อนแผนที่ด้วยตนเอง'
            : 'Unable to access GPS location. Please enable location permissions or drag the map manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleConfirm = () => {
    const lat = currentCenter.lat;
    const lng = currentCenter.lng;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    onConfirmLocation({
      latitude: lat,
      longitude: lng,
      mapsUrl,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative border border-gray-100 max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#E65100] flex items-center justify-center">
              <MapPin className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1A1A1A]">
                {isThai ? 'ปักหมุดตำแหน่งจัดส่ง (GPS)' : 'Pin Delivery Location'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isThai ? 'เลื่อนแผนที่หรือลากเพื่อวางหมุดตรงหน้าบ้าน/อาคาร' : 'Drag map to align pin at your location'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container Area */}
        <div className="relative w-full h-[55vh] min-h-[320px] max-h-[460px] bg-gray-100 overflow-hidden select-none">
          {/* Leaflet DOM container */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Fixed Center Pin Overlay (Grab/Uber style precision pin) */}
          <div
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
            style={{ marginTop: '-24px' }}
          >
            <div className="relative flex flex-col items-center">
              {/* Pin Icon with bounce effect on move */}
              <div
                className={`transition-transform duration-200 ${
                  isMapMoving ? '-translate-y-2 scale-110' : 'translate-y-0 scale-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#E65100] text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-orange-500/20">
                  <MapPin className="w-5 h-5 fill-white stroke-[2.5]" />
                </div>
                {/* Pointer beak below circle */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#E65100] mx-auto -mt-0.5" />
              </div>

              {/* Ground Shadow Dot */}
              <div
                className={`w-3 h-1.5 bg-black/40 rounded-full blur-[1px] transition-all duration-200 mt-0.5 ${
                  isMapMoving ? 'scale-75 opacity-40' : 'scale-100 opacity-80'
                }`}
              />
            </div>
          </div>

          {/* Floating Instructions Toast over Map */}
          <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-200/80 text-[11px] font-bold text-gray-700 flex items-center gap-1.5 w-fit mx-auto">
              <Info className="w-3.5 h-3.5 text-[#E65100] shrink-0" />
              <span>
                {isMapMoving
                  ? (isThai ? 'กำลังเลื่อนหาตำแหน่ง...' : 'Moving pin location...')
                  : (isThai ? 'เลื่อนแผนที่ให้จุดตรงกลางตรงกับที่อยู่ของคุณ' : 'Move map to place pin at exact door/building')}
              </span>
            </div>
          </div>

          {/* Map Controls: Current Location + Zoom */}
          <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
            {/* My Location GPS Button */}
            <button
              type="button"
              disabled={isLocating}
              onClick={handleLocateMe}
              className="w-11 h-11 rounded-2xl bg-white hover:bg-orange-50 active:scale-95 text-[#E65100] shadow-lg border border-gray-200 flex items-center justify-center transition-all cursor-pointer"
              title={isThai ? 'ตำแหน่งปัจจุบันของฉัน' : 'My Current Location'}
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#E65100]" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
            </button>

            {/* Zoom In/Out Buttons */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-11 h-10 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center border-b border-gray-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-11 h-10 hover:bg-gray-100 active:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error notification if geolocation denied */}
        {locationError && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs">
            {locationError}
          </div>
        )}

        {/* Footer Area with Coordinates & Confirm Button */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-bold">
              {isThai ? 'พิกัด GPS ที่เลือก:' : 'Selected Coordinates:'}
            </span>
            <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg text-[11px]">
              {currentCenter.lat.toFixed(6)}, {currentCenter.lng.toFixed(6)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="button"
              id="btn-confirm-pin-location"
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#E65100] hover:bg-[#D84315] active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isThai ? 'ยืนยันตำแหน่งหมุดนี้' : 'Confirm This Location'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
