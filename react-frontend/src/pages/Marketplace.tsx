import React, { useState, useEffect } from 'react';
import { usePropertyMarketplace } from '../hooks/usePropertyMarketplace';
import { useAuth } from '../hooks/useAuth';
import { PropertyGrid } from '../components/Marketplace/PropertyGrid';
import { PropertyFilters } from '../components/Marketplace/PropertyFilters';
import { MarketplaceStats } from '../components/Marketplace/MarketplaceStats';
import { PropertyDetailModal } from '../components/Marketplace/PropertyDetailModal';
import { InvestmentModal } from '../components/Marketplace/InvestmentModal';

export const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const [showPropertyDetail, setShowPropertyDetail] = useState<string | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState<string | null>(null);
  
  // Get user's ETH balance (you'll need to implement this hook)
  const userEthBalance = 20; // TODO: Get from user's actual balance
  
  const {
    filteredProperties,
    marketplaceStats,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    refreshProperties,
    selectProperty,
    selectedProperty,
    createSampleData,
  } = usePropertyMarketplace(userEthBalance);

  const handleSelectProperty = async (propertyId: string) => {
    await selectProperty(propertyId);
    setShowPropertyDetail(propertyId);
  };

  const handleInvestInProperty = (propertyId: string) => {
    setShowInvestmentModal(propertyId);
  };

  const handleCloseModals = () => {
    setShowPropertyDetail(null);
    setShowInvestmentModal(null);
    selectProperty(null);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Error Loading Marketplace</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={refreshProperties}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Property Marketplace</h1>
              <p className="text-gray-400 mt-1">
                Invest in fractional real estate shares and earn rental income
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={refreshProperties}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                ↻ Refresh
              </button>
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={createSampleData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  🧪 Create Sample Properties
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketplace Stats */}
        <MarketplaceStats stats={marketplaceStats} className="mb-8" />

        {/* User Balance Info */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Your Investment Balance</h3>
              <p className="text-gray-400 text-sm">Available for property investments</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{userEthBalance.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-400">≈ ${(userEthBalance * 4462).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <PropertyFilters
          filters={filters}
          onFiltersChange={setFilters}
          onResetFilters={resetFilters}
          className="mb-6"
        />

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Available Properties ({filteredProperties.length})
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {loading ? 'Loading properties...' : `${filteredProperties.length} properties match your criteria`}
            </p>
          </div>
          
          {filteredProperties.length > 0 && (
            <div className="text-sm text-gray-400">
              Showing {filteredProperties.length} of {marketplaceStats.totalProperties} properties
            </div>
          )}
        </div>

        {/* Property Grid */}
        <PropertyGrid
          properties={filteredProperties}
          loading={loading}
          userEthBalance={userEthBalance}
          onSelectProperty={handleSelectProperty}
          onInvestInProperty={handleInvestInProperty}
        />

        {/* Empty State for No Properties */}
        {!loading && marketplaceStats.totalProperties === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏗️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Properties Available</h3>
            <p className="text-gray-400 mb-6">
              The marketplace is currently empty. Check back later or create sample properties for testing.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={createSampleData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-medium"
              >
                🧪 Create Sample Properties
              </button>
            )}
          </div>
        )}
      </div>

      {/* Property Detail Modal */}
      {showPropertyDetail && selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          userEthBalance={userEthBalance}
          onClose={handleCloseModals}
          onInvest={() => {
            setShowPropertyDetail(null);
            setShowInvestmentModal(selectedProperty.id);
          }}
        />
      )}

      {/* Investment Modal */}
      {showInvestmentModal && (
        <InvestmentModal
          propertyId={showInvestmentModal}
          userEthBalance={userEthBalance}
          onClose={handleCloseModals}
          onSuccess={() => {
            handleCloseModals();
            refreshProperties();
          }}
        />
      )}
    </div>
  );
};