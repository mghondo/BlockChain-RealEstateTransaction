import React from 'react';
import { MarketplaceProperty } from '../../services/propertyMarketplaceService';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { useInvestmentCalculator } from '../../hooks/usePropertyMarketplace';

interface PropertyDetailModalProps {
  property: MarketplaceProperty;
  userEthBalance: number;
  onClose: () => void;
  onInvest: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  userEthBalance,
  onClose,
  onInvest,
}) => {
  const { getUsdValue } = useCryptoPrices();
  const { calculation } = useInvestmentCalculator(property, userEthBalance);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getClassDescription = (propertyClass: string): string => {
    switch (propertyClass) {
      case 'A': return 'Luxury properties with lower income but higher growth potential';
      case 'B': return 'Mid-tier properties with balanced income and growth potential';
      case 'C': return 'Budget properties with higher income but lower growth potential';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Property Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Property Image & Basic Info */}
          <div>
            <img
              src={property.imageUrl}
              alt={property.address}
              className="w-full h-64 object-cover rounded-lg mb-4"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop';
              }}
            />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{property.address}</h3>
                <p className="text-gray-400">{property.city}, {property.state} • {property.region}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Square Feet:</span>
                  <span className="text-white ml-2">{property.sqft.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Year Built:</span>
                  <span className="text-white ml-2">{property.yearBuilt}</span>
                </div>
                <div>
                  <span className="text-gray-400">Bedrooms:</span>
                  <span className="text-white ml-2">{property.bedrooms}</span>
                </div>
                <div>
                  <span className="text-gray-400">Bathrooms:</span>
                  <span className="text-white ml-2">{property.bathrooms}</span>
                </div>
              </div>

              <div className="bg-gray-700 rounded p-4">
                <h4 className="font-semibold text-white mb-2">Class {property.class} Property</h4>
                <p className="text-sm text-gray-300">{getClassDescription(property.class)}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-6">
            {/* Property Value */}
            <div className="bg-gray-700 rounded p-4">
              <h4 className="font-semibold text-white mb-3">Property Value</h4>
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(property.currentValue)}
              </div>
              <div className="text-sm text-gray-400">
                {property.pricePerShare.toFixed(4)} ETH per share (1% ownership)
              </div>
            </div>

            {/* Rental Information */}
            <div className="bg-gray-700 rounded p-4">
              <h4 className="font-semibold text-white mb-3">Rental Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Yield:</span>
                  <span className="text-green-400 font-semibold">{property.rentalYield.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Rental (100%):</span>
                  <span className="text-white">{formatCurrency((property.currentValue * property.rentalYield / 100) / 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly Rental (1 share):</span>
                  <span className="text-white">{formatCurrency((property.currentValue * property.rentalYield / 100) / 12 / 100)}</span>
                </div>
              </div>
            </div>

            {/* Investment Calculation */}
            {calculation && (
              <div className="bg-gray-700 rounded p-4">
                <h4 className="font-semibold text-white mb-3">Your Investment Potential</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Affordable Shares:</span>
                    <span className="text-white">{calculation.maxAffordableShares}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Ownership:</span>
                    <span className="text-white">{((calculation.maxAffordableShares / 100) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Income (max):</span>
                    <span className="text-green-400">${(calculation.monthlyRentalProjection * calculation.maxAffordableShares).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annual Income (max):</span>
                    <span className="text-green-400">${(calculation.annualRentalProjection * calculation.maxAffordableShares).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Investment Progress */}
            <div className="bg-gray-700 rounded p-4">
              <h4 className="font-semibold text-white mb-3">Investment Progress</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Shares Sold</span>
                <span className="text-white">{property.sharesSold}/100</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-3 mb-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${property.sharesSold}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-400">
                {100 - property.sharesSold} shares remaining
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onInvest}
              disabled={!calculation?.canAfford || property.status === 'sold_out'}
              className={`w-full py-3 px-4 rounded font-semibold transition-colors ${
                calculation?.canAfford && property.status !== 'sold_out'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {property.status === 'sold_out' 
                ? 'Sold Out' 
                : calculation?.canAfford 
                  ? 'Invest in This Property' 
                  : 'Insufficient Balance'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};