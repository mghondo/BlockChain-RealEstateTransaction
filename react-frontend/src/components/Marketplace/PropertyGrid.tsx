import React from 'react';
import { PropertyCard } from './PropertyCard';
import { MarketplaceProperty } from '../../services/propertyMarketplaceService';

interface PropertyGridProps {
  properties: MarketplaceProperty[];
  loading?: boolean;
  userEthBalance?: number;
  onSelectProperty?: (propertyId: string) => void;
  onInvestInProperty?: (propertyId: string) => void;
  className?: string;
}

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties,
  loading = false,
  userEthBalance = 0,
  onSelectProperty,
  onInvestInProperty,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
            <div className="h-48 bg-gray-700 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-700 rounded"></div>
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-3 bg-gray-700 rounded"></div>
                ))}
              </div>
              <div className="flex space-x-2">
                <div className="flex-1 h-8 bg-gray-700 rounded"></div>
                <div className="flex-1 h-8 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-6xl mb-4">🏘️</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Properties Found</h3>
        <p className="text-gray-400 text-center max-w-md">
          No properties match your current filters. Try adjusting your search criteria or check back later for new listings.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          userEthBalance={userEthBalance}
          onSelect={onSelectProperty}
          onInvest={onInvestInProperty}
        />
      ))}
    </div>
  );
};