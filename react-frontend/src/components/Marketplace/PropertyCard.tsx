import React from 'react';
import { MarketplaceProperty } from '../../services/propertyMarketplaceService';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface PropertyCardProps {
  property: MarketplaceProperty;
  userEthBalance?: number;
  onSelect?: (propertyId: string) => void;
  onInvest?: (propertyId: string) => void;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  userEthBalance = 0,
  onSelect,
  onInvest,
  className = '',
}) => {
  const { getUsdValue } = useCryptoPrices();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeRemaining = (selloutTime: Date): string => {
    const now = new Date();
    const diffMs = selloutTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return 'Ending soon';
    }
  };

  const getClassBadgeColor = (propertyClass: string): string => {
    switch (propertyClass) {
      case 'A': return 'bg-purple-600 text-purple-100';
      case 'B': return 'bg-blue-600 text-blue-100';
      case 'C': return 'bg-green-600 text-green-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  const getStatusColor = (): string => {
    switch (property.status) {
      case 'ending_soon': return 'text-orange-500';
      case 'sold_out': return 'text-red-500';
      default: return 'text-green-500';
    }
  };

  const canAfford = userEthBalance >= property.pricePerShare;
  const maxAffordableShares = Math.floor(userEthBalance / property.pricePerShare);

  return (
    <div className={`group relative bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${className}`}>
      {/* Property Image */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        <img
          src={property.imageUrl}
          alt={property.address}
          className="w-full h-48 object-cover rounded-t-xl group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';
          }}
        />
        
        {/* Property Class Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-semibold ${getClassBadgeColor(property.class)}`}>
          Class {property.class}
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 flex items-center space-x-1 ${getStatusColor()}`}>
          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
          <span className="text-xs font-medium bg-gray-900 bg-opacity-75 px-2 py-1 rounded">
            {property.status === 'ending_soon' ? formatTimeRemaining(property.selloutTime) : property.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Shares Sold Progress */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 to-transparent backdrop-blur-sm p-3 rounded-b-xl">
          <div className="flex justify-between items-center text-xs text-white mb-2">
            <span className="font-medium">Shares Sold</span>
            <span className="font-bold">{property.sharesSold}/100</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${property.sharesSold}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="text-lg font-semibold text-white mb-1 truncate">
          {property.address}
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          {property.city}, {property.state}
        </p>

        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="text-center">
            <div className="text-white font-medium">{property.sqft}</div>
            <div className="text-gray-400">sqft</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{property.bedrooms}bd</div>
            <div className="text-gray-400">{property.bathrooms}ba</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{property.yearBuilt}</div>
            <div className="text-gray-400">built</div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Property Value</span>
            <span className="text-sm font-medium text-white">{formatCurrency(property.currentValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Price per Share</span>
            <div className="text-right">
              <div className="text-sm font-medium text-white">{property.pricePerShare.toFixed(4)} ETH</div>
              <div className="text-xs text-gray-500">≈ {formatCurrency(getUsdValue(property.pricePerShare, 'ETH'))}</div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Rental Yield</span>
            <span className="text-sm font-medium text-green-400">{property.rentalYield.toFixed(1)}% / year</span>
          </div>
        </div>

        {/* Affordability Info */}
        {userEthBalance > 0 && (
          <div className="mb-4 p-3 bg-gray-700 rounded">
            {canAfford ? (
              <div>
                <div className="text-xs text-green-400 mb-1">You can afford up to {maxAffordableShares} shares</div>
                <div className="text-xs text-gray-400">
                  {((maxAffordableShares / 100) * 100).toFixed(1)}% ownership
                </div>
              </div>
            ) : (
              <div className="text-xs text-red-400">
                Insufficient balance (need {property.pricePerShare.toFixed(4)} ETH)
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => onSelect?.(property.id)}
            className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            View Details
          </button>
          <button
            onClick={() => onInvest?.(property.id)}
            disabled={!canAfford || property.status === 'sold_out'}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform ${
              canAfford && property.status !== 'sold_out'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            {property.status === 'sold_out' ? 'Sold Out' : 'Invest'}
          </button>
        </div>
      </div>
    </div>
  );
};