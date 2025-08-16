import React, { useState, useEffect } from 'react';
import { useInvestmentCalculator, usePropertyMarketplace } from '../../hooks/usePropertyMarketplace';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { InvestmentCompletionModal } from '../Investment/InvestmentCompletionModal';

interface InvestmentModalProps {
  propertyId: string;
  userEthBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  propertyId,
  userEthBalance,
  onClose,
  onSuccess,
}) => {
  const { properties } = usePropertyMarketplace(userEthBalance);
  const property = properties.find(p => p.id === propertyId);
  const { desiredShares, setDesiredShares, setSharesPercentage, calculation } = useInvestmentCalculator(property || null, userEthBalance);
  const { calculateGasFees } = useCryptoPrices();
  const [isInvesting, setIsInvesting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  if (!property) {
    return null;
  }

  const handleInvest = async () => {
    setIsInvesting(true);
    setShowCompletionModal(true);
  };

  const gasEstimate = calculateGasFees('investment');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Invest in Property</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            disabled={isInvesting}
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Property Summary */}
          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold text-white mb-2">{property.address}</h3>
            <p className="text-gray-400 text-sm">{property.city}, {property.state}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-gray-400">Property Value:</span>
              <span className="text-white font-semibold">${property.currentValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Share Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-white font-semibold">Number of Shares</label>
              <span className="text-gray-400 text-sm">Max: {calculation?.maxAffordableShares || 0}</span>
            </div>
            
            <input
              type="number"
              min="1"
              max={calculation?.maxAffordableShares || 100}
              value={desiredShares}
              onChange={(e) => setDesiredShares(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              disabled={isInvesting}
            />

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[25, 50, 75, 100].map(percentage => (
                <button
                  key={percentage}
                  onClick={() => setSharesPercentage(percentage)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm"
                  disabled={isInvesting}
                >
                  {percentage}%
                </button>
              ))}
            </div>
          </div>

          {/* Investment Summary */}
          {calculation && (
            <div className="bg-gray-700 rounded p-4 space-y-3">
              <h4 className="font-semibold text-white mb-3">Investment Summary</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Shares:</span>
                  <span className="text-white">{desiredShares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ownership:</span>
                  <span className="text-white">{calculation.ownershipPercentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-white">{calculation.totalCost.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas Fees:</span>
                  <span className="text-white">{calculation.gasFeesEth.toFixed(4)} ETH</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Cost:</span>
                  <span className="text-white font-semibold">{calculation.totalCostWithGas.toFixed(4)} ETH</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly Income:</span>
                    <span className="text-green-400">${calculation.monthlyRentalProjection.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annual Income:</span>
                    <span className="text-green-400">${calculation.annualRentalProjection.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Check */}
          <div className="bg-gray-700 rounded p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Balance:</span>
              <span className="text-white">{userEthBalance.toFixed(4)} ETH</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">After Investment:</span>
              <span className={`${(userEthBalance - (calculation?.totalCostWithGas || 0)) >= 0 ? 'text-white' : 'text-red-400'}`}>
                {(userEthBalance - (calculation?.totalCostWithGas || 0)).toFixed(4)} ETH
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded font-semibold"
              disabled={isInvesting}
            >
              Cancel
            </button>
            <button
              onClick={handleInvest}
              disabled={!calculation?.canAfford || isInvesting}
              className={`flex-1 py-3 px-4 rounded font-semibold ${
                calculation?.canAfford && !isInvesting
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isInvesting ? 'Processing...' : 'Confirm Investment'}
            </button>
          </div>
        </div>
      </div>

      {/* Investment Completion Modal */}
      {showCompletionModal && property && calculation && (
        <InvestmentCompletionModal
          propertyId={property.id}
          propertyAddress={property.address}
          propertyClass={property.class}
          pricePerShare={property.pricePerShare}
          userShares={desiredShares}
          userInvestment={calculation.totalCostWithGas}
          onComplete={(success) => {
            setShowCompletionModal(false);
            setIsInvesting(false);
            if (success) {
              onSuccess();
            }
          }}
        />
      )}
    </div>
  );
};