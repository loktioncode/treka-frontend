'use client';

import { useAssetsByIds } from '@/hooks/useAssets';
import { Badge } from './badge';
import { Car, Truck, Bus } from 'lucide-react';

interface VehicleAssignmentsTooltipProps {
  assetIds: string[];
  children: React.ReactNode;
}

// Helper function to get vehicle icon based on asset type
const getVehicleIcon = (assetType: string) => {
  switch (assetType?.toLowerCase()) {
    case 'vehicle':
      return <Car className="h-3 w-3" />;
    case 'machinery':
      return <Truck className="h-3 w-3" />;
    case 'equipment':
      return <Car className="h-3 w-3" />;
    case 'infrastructure':
      return <Bus className="h-3 w-3" />;
    default:
      return <Car className="h-3 w-3" />;
  }
};

// Helper function to format vehicle display name
const formatVehicleName = (asset: any) => {
  if (asset.vehicle_details) {
    const { make, model, year, license_plate } = asset.vehicle_details;
    const vehicleInfo = [make, model, year].filter(Boolean).join(' ');
    return {
      name: vehicleInfo || asset.name,
      licensePlate: license_plate,
      type: asset.asset_type
    };
  }
  return {
    name: asset.name,
    licensePlate: null,
    type: asset.asset_type
  };
};

export function VehicleAssignmentsTooltip({ assetIds, children }: VehicleAssignmentsTooltipProps) {
  const { data: assets, isLoading } = useAssetsByIds(assetIds);

  if (isLoading || !assets || assets.length === 0) {
    return <>{children}</>;
  }

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-medium text-white mb-2">Vehicle Assignments</div>
      <div className="space-y-2">
        {assets.map((asset, index) => {
          const vehicleInfo = formatVehicleName(asset);
          
          return (
            <div key={asset.id || index} className="flex items-center gap-2 p-2 bg-white/10 rounded">
              <div className="flex-shrink-0">
                {getVehicleIcon(vehicleInfo.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {vehicleInfo.name}
                </div>
                {vehicleInfo.licensePlate && (
                  <div className="text-white/80 text-xs font-mono">
                    {vehicleInfo.licensePlate}
                  </div>
                )}
                <div className="text-white/70 text-xs capitalize">
                  {vehicleInfo.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-teal-800 text-white text-sm rounded-lg shadow-xl p-3 max-w-xs">
          {tooltipContent}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-teal-800"></div>
        </div>
      </div>
    </div>
  );
}
