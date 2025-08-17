import React, { useState, useEffect } from 'react';
import { MockInvestor, MockInvestorService } from '../../services/mockInvestorService';
import { EscrowService } from '../../services/escrowService';
import { useAuth } from '../../hooks/useAuth';

interface InvestmentCompletionModalProps {
  propertyId: string;
  propertyAddress: string;
  propertyClass: 'A' | 'B' | 'C';
  pricePerShare: number;
  userShares: number;
  userInvestment: number;
  onComplete: (success: boolean) => void;
}

interface InvestorJoinState {
  investor: MockInvestor;
  isVisible: boolean;
  hasJoined: boolean;
}

export const InvestmentCompletionModal: React.FC<InvestmentCompletionModalProps> = ({
  propertyId,
  propertyAddress,
  propertyClass,
  pricePerShare,
  userShares,
  userInvestment,
  onComplete,
}) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'processing' | 'finding_investors' | 'investors_joining' | 'complete' | 'error'>('processing');
  const [mockInvestors, setMockInvestors] = useState<MockInvestor[]>([]);
  const [joinedInvestors, setJoinedInvestors] = useState<InvestorJoinState[]>([]);
  const [totalShares, setTotalShares] = useState(userShares);
  const [currentInvestorIndex, setCurrentInvestorIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [startingEscrow, setStartingEscrow] = useState(false);

  // Initialize investment completion process
  useEffect(() => {
    const startInvestmentProcess = async () => {
      try {
        // Phase 1: Processing user investment
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPhase('finding_investors');

        // Phase 2: Generate mock investors
        await new Promise(resolve => setTimeout(resolve, 1000));
        const investors = MockInvestorService.generateMockInvestors(
          propertyId,
          propertyClass,
          pricePerShare,
          userShares
        );
        
        setMockInvestors(investors);
        setJoinedInvestors(investors.map(investor => ({
          investor,
          isVisible: false,
          hasJoined: false,
        })));
        
        setPhase('investors_joining');

        // Phase 3: Animate investors joining
        await new Promise(resolve => setTimeout(resolve, 500));
        startInvestorAnimation(investors);

      } catch (err) {
        console.error('Investment process error:', err);
        setError('Failed to complete investment. Please try again.');
        setPhase('error');
      }
    };

    startInvestmentProcess();
  }, [propertyId, propertyClass, pricePerShare, userShares]);

  const startInvestorAnimation = async (investors: MockInvestor[]) => {
    let currentShares = userShares;
    
    for (let i = 0; i < investors.length; i++) {
      const investor = investors[i];
      
      // Show investor joining
      setCurrentInvestorIndex(i);
      setJoinedInvestors(prev => prev.map((state, index) => 
        index === i ? { ...state, isVisible: true } : state
      ));

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mark as joined and update shares
      currentShares += investor.sharesInvested;
      setTotalShares(currentShares);
      
      setJoinedInvestors(prev => prev.map((state, index) => 
        index === i ? { ...state, hasJoined: true } : state
      ));

      // Random delay between investors
      const delay = Math.random() * 400 + 200; // 200-600ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Complete the investment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Actually save to database
      await MockInvestorService.completePropertyInvestment(
        propertyId,
        propertyClass,
        pricePerShare,
        userShares,
        userInvestment
      );
      
      setPhase('complete');
      
      // Start escrow process
      if (user?.uid) {
        setStartingEscrow(true);
        await EscrowService.initiateEscrow(
          propertyId,
          user.uid,
          userShares,
          userInvestment,
          propertyClass
        );
        console.log('🏦 Escrow process initiated for property', propertyId);
        setStartingEscrow(false);
      }
      
      // Auto-close after showing success
      setTimeout(() => {
        onComplete(true);
      }, 4000); // Extended time to explain escrow
      
    } catch (err) {
      console.error('Error saving investment:', err);
      setError('Investment completed but escrow initiation failed. Please contact support.');
      setPhase('error');
    }
  };

  const getPhaseTitle = (): string => {
    switch (phase) {
      case 'processing': return 'Processing Your Investment...';
      case 'finding_investors': return 'Finding Co-Investors...';
      case 'investors_joining': return 'Investors Are Joining!';
      case 'complete': return 'Investment Complete!';
      case 'error': return 'Investment Error';
      default: return 'Processing...';
    }
  };

  const getPhaseDescription = (): string => {
    switch (phase) {
      case 'processing': return 'Validating your investment and preparing the transaction...';
      case 'finding_investors': return 'Matching you with other investors for this property...';
      case 'investors_joining': return 'Watch as other investors join your investment pool!';
      case 'complete': return 'Investment complete! Your property is now entering escrow for approval and inspection.';
      case 'error': return error || 'An unexpected error occurred.';
      default: return '';
    }
  };

  const getInvestorTypeColor = (type: 'conservative' | 'aggressive' | 'balanced'): string => {
    switch (type) {
      case 'conservative': return 'text-blue-400';
      case 'balanced': return 'text-green-400';
      case 'aggressive': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getInvestorTypeBadge = (type: 'conservative' | 'aggressive' | 'balanced'): string => {
    switch (type) {
      case 'conservative': return 'bg-blue-600 text-blue-100';
      case 'balanced': return 'bg-green-600 text-green-100';
      case 'aggressive': return 'bg-orange-600 text-orange-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  if (phase === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg border border-red-600 max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-2">{getPhaseTitle()}</h2>
            <p className="text-gray-400 mb-6">{getPhaseDescription()}</p>
            <button
              onClick={() => onComplete(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">{getPhaseTitle()}</h2>
            <p className="text-gray-400">{getPhaseDescription()}</p>
          </div>
        </div>

        {/* Property Info */}
        <div className="p-4 bg-gray-700 border-b border-gray-600">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">{propertyAddress}</h3>
              <span className={`text-xs px-2 py-1 rounded ${
                propertyClass === 'A' ? 'bg-purple-600 text-purple-100' :
                propertyClass === 'B' ? 'bg-blue-600 text-blue-100' :
                'bg-green-600 text-green-100'
              }`}>
                Class {propertyClass}
              </span>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">
                {totalShares}/100 shares
              </div>
              <div className="text-sm text-gray-400">
                {((totalShares / 100) * 100).toFixed(1)}% complete
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${totalShares}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Investment Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Your Investment */}
          <div className="bg-gray-700 rounded p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  You
                </div>
                <div>
                  <div className="font-semibold text-white">Your Investment</div>
                  <div className="text-sm text-gray-400">Primary Investor</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-white">{userShares} shares</div>
                <div className="text-sm text-green-400">{userInvestment.toFixed(4)} ETH</div>
              </div>
            </div>
          </div>

          {/* Phase-specific Loading */}
          {(phase === 'processing' || phase === 'finding_investors') && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-400">
                {phase === 'processing' ? 'Processing...' : 'Finding investors...'}
              </div>
            </div>
          )}

          {/* Mock Investors */}
          {phase === 'investors_joining' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-white mb-3">Co-Investors Joining:</h4>
              {joinedInvestors.map((investorState, index) => (
                <div
                  key={index}
                  className={`bg-gray-700 rounded p-3 transition-all duration-300 ${
                    investorState.isVisible 
                      ? 'opacity-100 transform translate-x-0' 
                      : 'opacity-0 transform translate-x-4'
                  } ${
                    investorState.hasJoined ? 'ring-2 ring-green-500' : ''
                  } ${
                    currentInvestorIndex === index ? 'ring-2 ring-blue-500 animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{investorState.investor.profileIcon}</div>
                      <div>
                        <div className="font-semibold text-white">
                          {investorState.investor.username}
                          {investorState.hasJoined && <span className="ml-2 text-green-400">✓</span>}
                        </div>
                        <div className="text-xs text-gray-400">{investorState.investor.location}</div>
                        <span className={`text-xs px-2 py-0.5 rounded ${getInvestorTypeBadge(investorState.investor.investorType)}`}>
                          {investorState.investor.investorType}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {investorState.investor.sharesInvested} shares
                      </div>
                      <div className="text-sm text-gray-400">
                        {investorState.investor.investmentAmount.toFixed(4)} ETH
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Complete State */}
          {phase === 'complete' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-xl font-semibold text-white mb-2">Investment Successful!</div>
              <div className="text-gray-400 mb-4">
                You now own {userShares} shares ({((userShares / 100) * 100).toFixed(1)}%) of this property
              </div>
              
              {startingEscrow && (
                <div className="bg-blue-900 border border-blue-600 rounded p-4 mb-4">
                  <div className="text-blue-400 font-semibold mb-2">Starting Escrow Process...</div>
                  <div className="text-sm text-blue-300">
                    Your investment is entering the approval process
                  </div>
                </div>
              )}
              
              <div className="bg-green-900 border border-green-600 rounded p-4">
                <div className="text-green-400 font-semibold mb-2">Next Steps:</div>
                <ul className="text-sm text-green-300 text-left space-y-1">
                  <li>• Your investment is now in escrow for inspection and approval</li>
                  <li>• Track progress on your dashboard (90% approval rate)</li>
                  <li>• Earn 2% interest if deals fail for any reason</li>
                  <li>• Successful approvals add shares to your rental portfolio</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'complete' && (
          <div className="p-4 border-t border-gray-700 text-center">
            <button
              onClick={() => onComplete(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium"
            >
              View Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};