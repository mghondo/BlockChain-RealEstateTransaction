import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Slider,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton
} from '@mui/material';
import {
  Close,
  AccountBalanceWallet,
  TrendingUp,
  Security,
  Speed,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Link
} from '@mui/icons-material';
import { useMockWallet } from '../../hooks/useMockWallet';
import { useInvestmentProcess } from '../../hooks/useInvestmentProcess';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { Property } from '../../types/property';

interface EnhancedInvestmentModalProps {
  open: boolean;
  onClose: () => void;
  property: Property;
  onSuccess: (shares: number, amount: number) => void;
}

export const EnhancedInvestmentModal: React.FC<EnhancedInvestmentModalProps> = ({
  open,
  onClose,
  property,
  onSuccess,
}) => {
  const { 
    isConnected, 
    address, 
    ethBalance, 
    formatAddress, 
    formatBalance,
    hasEnoughBalance,
    isBlockchainMode
  } = useMockWallet();

  const {
    isProcessing,
    currentStep,
    error,
    transactionHash,
    purchaseResult,
    processInvestment,
    resetProcess
  } = useInvestmentProcess();

  const { prices } = useCryptoPrices();

  const [shares, setShares] = useState(1);
  const [mortgageChecked, setMortgageChecked] = useState(false);

  // Calculate investment details
  const sharePrice = (property.sharePrice || property.currentValue / 100);
  const totalCost = sharePrice * shares;
  const monthlyRental = (property.currentValue * (property.rentalYield / 100) / 12) * (shares / 100);
  const monthlyMortgage = totalCost * 0.005; // Approximate 6% annual rate
  const netMonthlyIncome = monthlyRental - monthlyMortgage;
  const isAutoApproved = netMonthlyIncome > 0;

  useEffect(() => {
    if (!open) {
      resetProcess();
      setShares(1);
      setMortgageChecked(false);
    }
  }, [open, resetProcess]);

  const handleInvest = async () => {
    if (!isConnected || !property) return;

    try {
      const success = await processInvestment(
        property.id,
        property.class,
        sharePrice,
        shares,
        totalCost
      );

      if (success) {
        onSuccess(shares, totalCost);
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Investment failed:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'validating':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Validating Investment...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preparing blockchain transaction
            </Typography>
          </Box>
        );


      case 'confirming_transaction':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Confirming Transaction...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please confirm the transaction in MetaMask
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Check your MetaMask wallet for the transaction confirmation
              </Typography>
            </Alert>
          </Box>
        );

      case 'completing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Completing Investment...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Finalizing your property investment
            </Typography>
          </Box>
        );

      case 'success':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: 'linear-gradient(45deg, #00ff88 30%, #00cc66 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '2rem'
            }}>
              ✅
            </Box>
            <Typography variant="h5" color="success.main" gutterBottom fontWeight="bold">
              Investment Successful!
            </Typography>
            <Typography variant="body1" gutterBottom>
              You now own {shares} share{shares > 1 ? 's' : ''} of this property
            </Typography>
            
            {transactionHash && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Transaction Hash: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" color="error" gutterBottom>
              Investment Failed
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {error || 'An unexpected error occurred'}
            </Typography>
            <Button 
              variant="contained" 
              onClick={resetProcess}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  const canInvest = isConnected && shares > 0 && hasEnoughBalance(totalCost) && !isProcessing;

  return (
    <Dialog 
      open={open} 
      onClose={!isProcessing ? onClose : undefined}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95) 0%, rgba(20, 20, 35, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TrendingUp color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Invest in Property
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {property?.address}
                </Typography>
                <Chip 
                  icon={<Link />}
                  label="Blockchain Mode"
                  color="primary"
                  size="small"
                />
              </Box>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            disabled={isProcessing}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {isProcessing ? renderStepContent() : (
          <>
            {/* Wallet Status */}
            <Alert 
              severity={isConnected ? 'success' : 'warning'} 
              sx={{ mb: 3 }}
              icon={<AccountBalanceWallet />}
            >
              <Typography variant="body2">
                {isConnected ? (
                  <>
                    Connected: {formatAddress(address || '')} • 
                    Balance: {formatBalance(ethBalance)} ETH • Sepolia Testnet
                  </>
                ) : (
                  'Please connect your wallet to continue'
                )}
              </Typography>
            </Alert>

            {/* Property Summary */}
            <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {property?.address}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Property Value</Typography>
                    <Typography variant="h6">${property?.currentValue.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Annual Yield</Typography>
                    <Typography variant="h6" color="success.main">{property?.rentalYield}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Share Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Number of Shares
              </Typography>
              
              <Box sx={{ px: 2, mb: 2 }}>
                <Slider
                  value={shares}
                  onChange={(_, value) => setShares(value as number)}
                  min={1}
                  max={Math.min(100, Math.floor(ethBalance / sharePrice))}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 75, label: '75' },
                    { value: 100, label: '100' }
                  ]}
                  valueLabelDisplay="on"
                  disabled={!isConnected}
                />
              </Box>

              <TextField
                type="number"
                value={shares}
                onChange={(e) => setShares(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                label="Shares"
                size="small"
                disabled={!isConnected}
                inputProps={{ min: 1, max: 100 }}
                sx={{ width: 120 }}
              />
            </Box>

            {/* Investment Summary */}
            <Card sx={{ mb: 3, background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  Investment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Cost per Share</Typography>
                    <Typography variant="body1">{formatBalance(sharePrice)} ETH</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Cost</Typography>
                    <Typography variant="body1" fontWeight="bold">{formatBalance(totalCost)} ETH</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Monthly Rental Income</Typography>
                    <Typography variant="body1" color="success.main">${monthlyRental.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Ownership Percentage</Typography>
                    <Typography variant="body1">{shares}%</Typography>
                  </Grid>
                </Grid>

                {/* Auto-Approval Status */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isAutoApproved ? (
                    <>
                      <CheckCircle color="success" fontSize="small" />
                      <Typography variant="body2" color="success.main">
                        ✅ Auto-approved: Rental income exceeds mortgage payments
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Info color="warning" fontSize="small" />
                      <Typography variant="body2" color="warning.main">
                        ⚠️ Manual review required: Consider larger investment
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Blockchain Information */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                🔗 <strong>Blockchain Transaction:</strong> This will create an actual blockchain transaction on Sepolia testnet
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      {!isProcessing && (
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInvest}
            disabled={!canInvest}
            sx={{ 
              px: 4,
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #42a5f5 30%, #1976d2 90%)'
              }
            }}
          >
🔗 Invest on Blockchain
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};