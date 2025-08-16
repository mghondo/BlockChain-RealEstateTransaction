import React, { useState, useEffect } from 'react';
import { EscrowProcess, EscrowService } from '../../services/escrowService';
import { useAuth } from '../../hooks/useAuth';

interface EscrowTrackerProps {
  className?: string;
}

export const EscrowTracker: React.FC<EscrowTrackerProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [escrowProcesses, setEscrowProcesses] = useState<EscrowProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEscrowProcesses = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const processes = await EscrowService.getUserEscrowProcesses(user.uid);
      setEscrowProcesses(processes);
    } catch (err) {
      console.error('Error loading escrow processes:', err);
      setError('Failed to load escrow processes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscrowProcesses();
    
    // Refresh every 30 seconds to show progress
    const interval = setInterval(loadEscrowProcesses, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'inspection': return 'text-blue-400';
      case 'lender_approval': return 'text-purple-400';
      case 'approved': return 'text-green-400';
      case 'completed': return 'text-green-500';
      case 'rejected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'inspection': return '🔍';
      case 'lender_approval': return '🏦';
      case 'approved': return '✅';
      case 'completed': return '🎉';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  const formatTimeRemaining = (estimatedTime: Date): string => {
    const now = new Date();
    const diffMs = estimatedTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Completing soon...';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m remaining`;
    } else {
      return `${diffMinutes}m remaining`;
    }
  };

  const activeProcesses = escrowProcesses.filter(p => 
    ['pending', 'inspection', 'lender_approval', 'approved'].includes(p.status)
  );
  
  const completedProcesses = escrowProcesses.filter(p => 
    ['completed', 'rejected'].includes(p.status)
  );

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-red-600 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-2">❌</div>
          <div className="text-red-400">{error}</div>
          <button
            onClick={loadEscrowProcesses}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (escrowProcesses.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-3">Property Escrow</h3>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏦</div>
          <div className="text-gray-400">No properties in escrow</div>
          <div className="text-sm text-gray-500 mt-2">
            Properties will appear here after investment completion
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Property Escrow</h3>
        <button
          onClick={loadEscrowProcesses}
          className="text-gray-400 hover:text-white text-sm"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Active Processes */}
      {activeProcesses.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Active Approvals</h4>
          <div className="space-y-3">
            {activeProcesses.map((process) => (
              <EscrowProcessCard key={process.id} process={process} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Processes */}
      {completedProcesses.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Completions</h4>
          <div className="space-y-3">
            {completedProcesses.slice(0, 3).map((process) => (
              <EscrowProcessCard key={process.id} process={process} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface EscrowProcessCardProps {
  process: EscrowProcess;
  compact?: boolean;
}

const EscrowProcessCard: React.FC<EscrowProcessCardProps> = ({ process, compact = false }) => {
  const getStepStatus = (stepStatus: string): { color: string; icon: string } => {
    switch (stepStatus) {
      case 'pending': return { color: 'text-gray-400', icon: '⏳' };
      case 'in_progress': return { color: 'text-blue-400', icon: '🔄' };
      case 'passed': case 'approved': return { color: 'text-green-400', icon: '✅' };
      case 'failed': case 'rejected': return { color: 'text-red-400', icon: '❌' };
      default: return { color: 'text-gray-400', icon: '⏳' };
    }
  };

  const formatTimeRemaining = (estimatedTime: Date): string => {
    const now = new Date();
    const diffMs = estimatedTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Completing soon...';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 60 ? `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m` : `${diffMinutes}m`;
  };

  const inspectionStep = getStepStatus(process.approvalSteps.inspection.status);
  const lenderStep = getStepStatus(process.approvalSteps.lenderApproval.status);

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-white text-sm">Property Investment</div>
          <div className="text-xs text-gray-400">
            {process.sharesOwned} shares • {process.investmentAmount.toFixed(4)} ETH
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${getStatusColor(process.status)}`}>
            {getStatusIcon(process.status)} {process.status.replace('_', ' ').toUpperCase()}
          </div>
          {process.status !== 'completed' && process.status !== 'rejected' && (
            <div className="text-xs text-gray-400">
              {formatTimeRemaining(process.estimatedCompletionTime)}
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <>
          {/* Progress Steps */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Inspection Step */}
            <div className="flex items-center space-x-2">
              <span className={inspectionStep.color}>{inspectionStep.icon}</span>
              <div>
                <div className="text-xs font-medium text-white">Inspection</div>
                <div className={`text-xs ${inspectionStep.color}`}>
                  {process.approvalSteps.inspection.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Lender Step */}
            <div className="flex items-center space-x-2">
              <span className={lenderStep.color}>{lenderStep.icon}</span>
              <div>
                <div className="text-xs font-medium text-white">
                  {process.requiresFinancing ? 'Lender' : 'Cash Purchase'}
                </div>
                <div className={`text-xs ${lenderStep.color}`}>
                  {process.requiresFinancing 
                    ? process.approvalSteps.lenderApproval.status.replace('_', ' ')
                    : 'approved'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{process.status === 'completed' ? '100%' : '50%'}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  process.status === 'completed' ? 'bg-green-500' :
                  process.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: process.status === 'completed' ? '100%' : 
                         process.status === 'rejected' ? '100%' :
                         process.status === 'lender_approval' ? '75%' :
                         process.status === 'inspection' ? '50%' : '25%'
                }}
              ></div>
            </div>
          </div>
        </>
      )}

      {/* Interest Earning */}
      {process.interestEarned > 0 && (
        <div className="bg-green-900 border border-green-600 rounded p-2 mb-3">
          <div className="text-xs text-green-400">
            Interest earned: {process.interestEarned.toFixed(6)} ETH
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {process.status === 'rejected' && process.rejectionReason && (
        <div className="bg-red-900 border border-red-600 rounded p-2">
          <div className="text-xs text-red-400 font-medium mb-1">Deal Failed</div>
          <div className="text-xs text-red-300">{process.rejectionReason}</div>
          {process.interestEarned > 0 && (
            <div className="text-xs text-green-400 mt-1">
              + Interest: {process.interestEarned.toFixed(6)} ETH
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {process.status === 'completed' && (
        <div className="bg-green-900 border border-green-600 rounded p-2">
          <div className="text-xs text-green-400">
            ✅ Investment approved! Shares added to portfolio.
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'text-yellow-400';
    case 'inspection': return 'text-blue-400';
    case 'lender_approval': return 'text-purple-400';
    case 'approved': return 'text-green-400';
    case 'completed': return 'text-green-500';
    case 'rejected': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return '⏳';
    case 'inspection': return '🔍';
    case 'lender_approval': return '🏦';
    case 'approved': return '✅';
    case 'completed': return '🎉';
    case 'rejected': return '❌';
    default: return '⏳';
  }
};