import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRestaurant } from '../context/RestaurantContext';
import { WifiOff } from 'lucide-react';

export const OfflineNotice: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useRestaurant();

  if (isOnline) return null;

  return (
    <div
      id="offline-notice-banner"
      role="alert"
      className="bg-amber-600 text-white text-xs px-4 py-2 text-center flex items-center justify-center gap-2 font-medium shadow-md sticky top-0 z-50 transition-all"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <span>{t('offlineNotice')}</span>
    </div>
  );
};
