import React, { useState, useEffect } from 'react';
import { EscrowProcess, EscrowService } from '../../services/escrowService';

interface EscrowStatusModalProps {
  escrowId: string;
  onClose: () => void;
}

export const EscrowStatusModal: React.FC<EscrowStatusModalProps> = ({ escrowId, onClose }) => {
  const [process, setProcess] = useState<EscrowProcess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProcess = async () => {
      try {
        const escrowProcess = await EscrowService.getEscrowProcess(escrowId);
        setProcess(escrowProcess);
      } catch (error) {
        console.error('Error loading escrow process:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProcess();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadProcess, 10000);
    return () => clearInterval(interval);
  }, [escrowId]);

  if (loading || !process) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStepDetails = (status: string, startTime?: Date, completionTime?: Date) => {
    if (completionTime) {
      return `Completed ${completionTime.toLocaleTimeString()}`;
    } else if (startTime) {
      return `Started ${startTime.toLocaleTimeString()}`;
    } else if (status === 'pending') {
      return 'Waiting to begin...';
    }
    return 'In progress...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Escrow Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Investment Summary */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Investment Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Shares:</span>
                <span className="text-white ml-2">{process.sharesOwned}</span>
              </div>
              <div>
                <span className="text-gray-400">Investment:</span>
                <span className="text-white ml-2">{process.investmentAmount.toFixed(4)} ETH</span>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="text-white ml-2">{process.requiresFinancing ? 'Financed' : 'Cash'}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${
                  process.status === 'completed' ? 'text-green-400' :
                  process.status === 'rejected' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {process.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Approval Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Approval Process</h3>
            
            {/* Inspection Step */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">🔍 Property Inspection</h4>
                <span className={`text-sm ${
                  process.approvalSteps.inspection.status === 'passed' ? 'text-green-400' :
                  process.approvalSteps.inspection.status === 'failed' ? 'text-red-400' :
                  process.approvalSteps.inspection.status === 'in_progress' ? 'text-blue-400' :
                  'text-gray-400'
                }`}>
                  {process.approvalSteps.inspection.status === 'passed' ? '✅ Passed' :
                   process.approvalSteps.inspection.status === 'failed' ? '❌ Failed' :
                   process.approvalSteps.inspection.status === 'in_progress' ? '🔄 In Progress' :
                   '⏳ Pending'}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {getStepDetails(
                  process.approvalSteps.inspection.status,
                  process.approvalSteps.inspection.startTime,
                  process.approvalSteps.inspection.completionTime
                )}
              </div>
              {process.approvalSteps.inspection.failureReason && (
                <div className="mt-2 text-sm text-red-400 bg-red-900 border border-red-600 rounded p-2">
                  {process.approvalSteps.inspection.failureReason}
                </div>
              )}
            </div>

            {/* Lender Step */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">
                  🏦 {process.requiresFinancing ? 'Lender Approval' : 'Cash Purchase'}
                </h4>
                <span className={`text-sm ${
                  process.approvalSteps.lenderApproval.status === 'approved' ? 'text-green-400' :
                  process.approvalSteps.lenderApproval.status === 'rejected' ? 'text-red-400' :
                  process.approvalSteps.lenderApproval.status === 'in_progress' ? 'text-blue-400' :
                  'text-gray-400'
                }`}>
                  {process.approvalSteps.lenderApproval.status === 'approved' ? '✅ Approved' :
                   process.approvalSteps.lenderApproval.status === 'rejected' ? '❌ Rejected' :
                   process.approvalSteps.lenderApproval.status === 'in_progress' ? '🔄 In Progress' :
                   '⏳ Pending'}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {process.requiresFinancing 
                  ? getStepDetails(
                      process.approvalSteps.lenderApproval.status,
                      process.approvalSteps.lenderApproval.startTime,
                      process.approvalSteps.lenderApproval.completionTime
                    )
                  : 'No financing required'
                }
              </div>
              {process.approvalSteps.lenderApproval.rejectionReason && (
                <div className="mt-2 text-sm text-red-400 bg-red-900 border border-red-600 rounded p-2">
                  {process.approvalSteps.lenderApproval.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Started:</span>
                <span className="text-white">{process.createdAt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated Completion:</span>
                <span className="text-white">{process.estimatedCompletionTime.toLocaleString()}</span>
              </div>
              {process.actualCompletionTime && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Actual Completion:</span>
                  <span className="text-white">{process.actualCompletionTime.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Interest Earned */}
          {process.interestEarned > 0 && (
            <div className="bg-green-900 border border-green-600 rounded-lg p-4">
              <h4 className="font-medium text-green-400 mb-2">Interest Earned</h4>
              <div className="text-green-300">
                {process.interestEarned.toFixed(6)} ETH earned during escrow period
              </div>
              <div className="text-sm text-green-400 mt-1">
                2% annual rate applied to {process.investmentAmount.toFixed(4)} ETH
              </div>
            </div>
          )}

          {/* Final Status */}
          {process.status === 'completed' && (
            <div className="bg-green-900 border border-green-600 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-green-400 font-semibold">Investment Approved!</div>
              <div className="text-green-300 text-sm mt-1">
                Your shares have been added to your portfolio
              </div>
            </div>
          )}

          {process.status === 'rejected' && (
            <div className="bg-red-900 border border-red-600 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">❌</div>
              <div className="text-red-400 font-semibold">Investment Failed</div>
              <div className="text-red-300 text-sm mt-1">
                Your funds have been refunded with interest
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};