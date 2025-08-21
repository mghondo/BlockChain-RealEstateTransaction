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
  Card,
  CardContent,
  Grid,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Close,
  AccountBalanceWallet,
  Search,
  AccountBalance,
  Handshake,
  Celebration,
  Person,
  TrendingUp,
} from '@mui/icons-material';
import { useMockWallet } from '../../hooks/useMockWallet';
import { Property } from '../../types/property';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { PurchaseTransactionService } from '../../services/purchaseTransactionService';
import { useAuth } from '../../contexts/AuthContext';

interface PropertyPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  property: Property;
  onSuccess: (shares: number, amount: number) => void;
}

interface CoInvestor {
  id: string;
  username: string;
  shares: number;
  amount: number;
  avatar: string;
}

const steps = ['Property Inspection', 'Lender Approval', 'Escrow & Co-Investors', 'Purchase Complete'];

export const PropertyPurchaseModal: React.FC<PropertyPurchaseModalProps> = ({
  open,
  onClose,
  property,
  onSuccess,
}) => {
  const { 
    isConnected, 
    address, 
    ethBalance, 
    formatBalance,
    hasEnoughBalance,
  } = useMockWallet();

  const { prices } = useCryptoPrices();
  const { user } = useAuth();

  const [shares, setShares] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coInvestors, setCoInvestors] = useState<CoInvestor[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate costs - protect against null property
  const sharePrice = property?.sharePrice || (property?.currentValue || 0) / 100;
  const totalCost = sharePrice * shares;
  const availableShares = property?.availableShares || 100;
  const remainingAfterPurchase = availableShares - shares;

  // Generate random co-investor usernames
  const generateUsername = () => {
    const prefixes = ['investor', 'trader', 'prop', 'real', 'crypto', 'fund', 'build'];
    const suffixes = Math.floor(Math.random() * 99) + 1;
    const letters = String.fromCharCode(97 + Math.floor(Math.random() * 26)) + 
                   String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${letters}${suffixes}`;
  };

  // Generate co-investors to fill remaining shares
  const generateCoInvestors = (remainingShares: number) => {
    if (remainingShares <= 0) return [];

    const investors: CoInvestor[] = [];
    let sharesLeft = remainingShares;
    
    // Generate 2-5 co-investors
    const numInvestors = Math.min(Math.floor(Math.random() * 4) + 2, Math.max(2, remainingShares));
    
    for (let i = 0; i < numInvestors && sharesLeft > 0; i++) {
      const isLast = i === numInvestors - 1;
      const maxShares = isLast ? sharesLeft : Math.min(Math.floor(sharesLeft * 0.6), sharesLeft - (numInvestors - i - 1));
      const investorShares = Math.max(1, Math.floor(Math.random() * maxShares) + 1);
      
      investors.push({
        id: `inv_${i}`,
        username: generateUsername(),
        shares: investorShares,
        amount: investorShares * sharePrice,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generateUsername()}`
      });

      sharesLeft -= investorShares;
    }

    return investors;
  };

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setShares(1);
      setActiveStep(0);
      setIsProcessing(false);
      setCoInvestors([]);
      setError(null);
    }
  }, [open]);

  const handleNext = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Add realistic delays for each step
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (activeStep === 0) {
        // Property Inspection - Always pass
        setActiveStep(1);
      } else if (activeStep === 1) {
        // Lender Approval - Auto-approve
        setActiveStep(2);
      } else if (activeStep === 2) {
        // Generate co-investors
        const remainingShares = availableShares - shares;
        const investors = generateCoInvestors(remainingShares);
        setCoInvestors(investors);
        
        // Simulate escrow time
        await new Promise(resolve => setTimeout(resolve, 2000));
        setActiveStep(3);
      } else if (activeStep === 3) {
        // Purchase Complete - actually process the transaction
        if (!user?.uid) {
          setError('User not authenticated');
          return;
        }

        if (!property) {
          setError('Property not found');
          return;
        }

        const purchaseResult = await PurchaseTransactionService.processPurchase(
          user.uid,
          property,
          shares,
          ethBalance
        );

        if (purchaseResult.success) {
          onSuccess(shares, totalCost);
          console.log(`✅ Purchase completed: Transaction ID ${purchaseResult.transactionId}`);
          setTimeout(() => {
            onClose();
          }, 3000);
        } else {
          setError(purchaseResult.error || 'Purchase failed');
          setActiveStep(0); // Reset to first step so user can try again
        }
      }
    } catch (err) {
      setError('Process failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    if (!user?.uid) return false; // Must be authenticated
    if (!isConnected) return false;
    if (!hasEnoughBalance(totalCost)) return false;
    if (shares <= 0 || shares > availableShares) return false;
    return true;
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Property Inspection
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Search sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Property Inspection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select your share amount and we'll inspect the property
              </Typography>
            </Box>

            {/* Share Selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Select Shares to Purchase
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={shares}
                    onChange={(_, value) => setShares(value as number)}
                    min={1}
                    max={availableShares}
                    step={1}
                    marks
                    valueLabelDisplay="on"
                    sx={{ mb: 2 }}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Shares"
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(Math.min(availableShares, Math.max(1, parseInt(e.target.value) || 1)))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Total Cost (ETH)"
                      value={totalCost.toFixed(4)}
                      disabled
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Investment Summary */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Investment Summary
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Share Price:</Typography>
                    <Typography variant="body2" fontWeight="bold">{sharePrice.toFixed(4)} ETH</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Shares:</Typography>
                    <Typography variant="body2" fontWeight="bold">{shares} / {availableShares}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Ownership:</Typography>
                    <Typography variant="body2" fontWeight="bold">{((shares / 100) * 100).toFixed(1)}%</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Monthly Rental*:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {((property.currentValue * (property.rentalYield / 100) / 12) * (shares / 100)).toFixed(4)} ETH
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  *Estimated based on {property.rentalYield}% annual yield
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      case 1: // Lender Approval
        return (
          <Box sx={{ textAlign: 'center' }}>
            <AccountBalance sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="success.main">
              Lender Pre-Approval Complete!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your investment has been automatically approved for Class {property.class} properties.
            </Typography>
            <Alert severity="success">
              <Typography variant="body2">
                ✅ Credit check passed<br/>
                ✅ Income verification complete<br/>
                ✅ Property class {property.class} approved
              </Typography>
            </Alert>
          </Box>
        );

      case 2: // Escrow & Co-Investors
        return (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Handshake sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Escrow & Finding Co-Investors
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {coInvestors.length === 0 
                  ? "Finding other investors to complete the property purchase..."
                  : "Co-investors found! Finalizing the purchase..."
                }
              </Typography>
            </Box>

            {coInvestors.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Co-Investors ({coInvestors.length})
                  </Typography>
                  <Stack spacing={2}>
                    {coInvestors.map((investor) => (
                      <Box key={investor.id} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1,
                        bgcolor: 'grey.50',
                        borderRadius: 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={investor.avatar} sx={{ width: 32, height: 32 }}>
                            <Person />
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">
                            {investor.username}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {investor.shares} shares
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {investor.amount.toFixed(4)} ETH
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 3: // Success
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Celebration sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" color="success.main" gutterBottom fontWeight="bold">
              🎉 Purchase Successful!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              You now own {shares} shares ({((shares / 100) * 100).toFixed(1)}%) of this property!
            </Typography>
            
            <Card sx={{ bgcolor: 'success.50', mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Your Investment Details
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Property:</Typography>
                    <Typography variant="body2" fontWeight="bold">{property.address}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Shares Purchased:</Typography>
                    <Typography variant="body2" fontWeight="bold">{shares}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Total Invested:</Typography>
                    <Typography variant="body2" fontWeight="bold">{totalCost.toFixed(4)} ETH</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Expected Monthly Rental:</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {((property.currentValue * (property.rentalYield / 100) / 12) * (shares / 100)).toFixed(4)} ETH
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Alert severity="info">
              <Typography variant="body2">
                Your investment is now active! Check your dashboard to track rental income and appreciation.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {property ? 'Purchase Property Shares' : 'Loading...'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Property Header */}
        {property && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={8}>
                  <Typography variant="h6" gutterBottom>
                    {property.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.city}, {property.state} • Class {property.class}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      icon={<TrendingUp />} 
                      label={`${property.rentalYield}% Yield`} 
                      size="small" 
                      color="success" 
                    />
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="h5" color="primary" fontWeight="bold">
                    {property.currentValue.toFixed(2)} ETH
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {availableShares} shares available
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        {property ? renderStepContent() : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6">Loading property...</Typography>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Authentication Check */}
        {!user?.uid && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Please sign in to purchase property shares
          </Alert>
        )}

        {/* Wallet Check */}
        {user?.uid && !isConnected && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please connect your wallet to proceed
          </Alert>
        )}

        {isConnected && !hasEnoughBalance(totalCost) && activeStep === 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Insufficient balance. You need {totalCost.toFixed(4)} ETH but have {formatBalance(ethBalance)} ETH
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        {activeStep < 3 && (
          <>
            <Button onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleNext}
              variant="contained"
              disabled={!canProceed() || isProcessing}
              sx={{ minWidth: 120 }}
            >
              {isProcessing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress sx={{ width: 60, height: 2 }} />
                </Box>
              ) : (
                activeStep === 0 ? 'Start Inspection' :
                activeStep === 1 ? 'Proceed to Escrow' :
                activeStep === 2 ? 'Complete Purchase' : 'Next'
              )}
            </Button>
          </>
        )}
        {activeStep === 3 && (
          <Button onClick={onClose} variant="contained" color="success">
            View Dashboard
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};