'use client';

import { useAssetsByIds } from '@/hooks/useAssets';
import { Badge } from './badge';
import { Car, Truck, Bus } from 'lucide-react';

interface VehicleAssignmentsProps {
  assetIds: string[];
  className?: string;
}

// Helper function to get vehicle icon based on asset type
const getVehicleIcon = (assetType: string) => {
  switch (assetType?.toLowerCase()) {
    case 'vehicle':
      return <Car className="h-4 w-4" />;
    case 'machinery':
      return <Truck className="h-4 w-4" />;
    case 'equipment':
      return <Car className="h-4 w-4" />;
    case 'infrastructure':
      return <Bus className="h-4 w-4" />;
    default:
      return <Car className="h-4 w-4" />;
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

export function VehicleAssignments({ assetIds, className = '' }: VehicleAssignmentsProps) {
  const { data: assets, isLoading, error } = useAssetsByIds(assetIds);

  if (isLoading) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg border ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
          <span className="text-sm">Loading vehicle details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <span className="text-sm">Error loading vehicle details</span>
        </div>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg border ${className}`}>
        <div className="text-center py-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
            <span className="text-gray-400 text-xs">🚗</span>
          </div>
          <p className="text-sm text-gray-500">No vehicles assigned</p>
          <p className="text-xs text-gray-400 mt-1">This driver is available for assignment</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {assets.map((asset, index) => {
        const vehicleInfo = formatVehicleName(asset);
        
        return (
          <div key={asset.id || index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0 p-2 bg-teal-100 rounded-lg">
                {getVehicleIcon(vehicleInfo.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {vehicleInfo.name}
                  </span>
                  {vehicleInfo.licensePlate && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {vehicleInfo.licensePlate}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize">{vehicleInfo.type}</span>
                  {asset.status && (
                    <>
                      <span>•</span>
                      <Badge 
                        variant={asset.status === 'operational' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {asset.status}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge variant="outline" className="text-xs">
                Assigned
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
