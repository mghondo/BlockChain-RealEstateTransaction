import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Grid,
  Checkbox,
  FormControlLabel,
  TextField
} from '@mui/material';
import {
  AccountBalanceWallet,
  Close,
  Warning,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface MockWalletProps {
  open: boolean;
  onClose: () => void;
  onConnect: (walletData: WalletData) => Promise<void>;
}

export interface WalletData {
  address: string;
  ethBalance: number;
  chainId?: number;
  isConnected: boolean;
  mode: 'simulation';
}

export interface MockWalletData extends WalletData {
  mode: 'simulation';
  username: string;
  strikePrice?: number; // ETH price when wallet was created
  createdAt?: number; // Timestamp when wallet was filled
  initialUsdValue?: number; // Original USD value ($20,000)
}

type ConnectionStep = 'confirmation' | 'connecting' | 'success' | 'error';

export const MockWallet: React.FC<MockWalletProps> = ({ open, onClose, onConnect }) => {
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>('confirmation');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [fakeAccountNumber, setFakeAccountNumber] = useState('');
  const [fakePrivateKey, setFakePrivateKey] = useState('');

  const { prices } = useCryptoPrices();

  // Reset to confirmation when modal opens
  useEffect(() => {
    if (open) {
      setConnectionStep('confirmation');
      setConfirmationChecked(false);
      setFakeAccountNumber('');
      setFakePrivateKey('');
      setError('');
    }
  }, [open]);

  // Web3Service not needed for simulation mode - removing blockchain connection logic

  // Simulation mode only - removed blockchain connection logic

  // Only simulation mode is available - remove mode selection
  const handleCreateWallet = () => {
    // First generate the fake credentials
    generateFakeCredentials();
    
    // Small delay to show the fields filling, then proceed
    setTimeout(() => {
      handleSimulationConnect();
    }, 1500);
  };

  const handleSimulationConnect = async () => {
    setIsConnecting(true);
    setConnectionStep('connecting');
    setError('');

    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock wallet data
      const mockAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
      const mockUsername = `User${Math.floor(Math.random() * 9999)}`;
      
      // Use live ETH price to determine how much ETH equals $20,000 USDC
      const usdcTarget = 20000; // $20,000 USDC target
      const currentEthPrice = prices?.ethToUsd || 4462; // Get live ETH price
      const ethAmount = usdcTarget / currentEthPrice; // Calculate ETH needed
      const createdAt = Date.now(); // Timestamp when wallet was created
      
      console.log('🎮 Creating simulation wallet with live ETH price:', {
        ethAmount,
        currentEthPrice,
        usdcTarget,
        createdAt: new Date(createdAt).toISOString()
      });
      
      const mockWalletData: MockWalletData = {
        address: mockAddress,
        ethBalance: ethAmount, // Dynamic based on current ETH price
        isConnected: true,
        mode: 'simulation',
        username: mockUsername,
        // Store wallet creation details for volatility calculation
        strikePrice: currentEthPrice, // ETH price when wallet was created
        createdAt: createdAt, // When wallet was filled
        initialUsdValue: usdcTarget // Original USD value
      };

      setConnectionStep('success');
      setIsConnecting(false);

      // Brief success display then connect
      setTimeout(async () => {
        await onConnect(mockWalletData);
        handleClose();
      }, 2000);

    } catch (error: any) {
      setError('Failed to create simulation wallet');
      setConnectionStep('error');
      setIsConnecting(false);
    }
  };

  // Blockchain connection functions removed - simulation only

  const generateFakeCredentials = () => {
    // Generate fake account number (like a traditional bank account)
    const fakeAccount = `GAME-${Math.random().toString().substring(2, 8)}-${Math.random().toString().substring(2, 8)}`;
    
    // Generate fake private key (64 character hex string like real crypto)
    const fakeKey = '0x' + Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    setFakeAccountNumber(fakeAccount);
    setFakePrivateKey(fakeKey);
  };

  const handleClose = () => {
    setError('');
    setIsConnecting(false);
    setConnectionStep('confirmation');
    onClose();
  };

  // Calculate equivalent display values for game feel
  const ethPrice = prices?.ethToUsd || 4462;

  const renderContent = () => {
    switch (connectionStep) {
      case 'confirmation':
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
              Please confirm that you want to fill a simulated wallet with fake Ether for play of the game.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>⚠️ Important Disclaimer:</strong><br/>
                This is a simulation for educational purposes only. No real cryptocurrency or blockchain transactions will occur.
              </Typography>
            </Alert>

            <Box sx={{ 
              p: 3, 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 3
            }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>🎮 What you'll receive:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • $20,000 in simulated USDC for property investments
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Fake Ether for transaction simulation
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Realistic blockchain-like experience
              </Typography>
              <Typography variant="body2">
                • No real money at risk
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                🔐 Wallet Credentials (Auto-generated):
              </Typography>
              
              <TextField
                fullWidth
                label="Game Account Number"
                value={fakeAccountNumber}
                variant="outlined"
                disabled
                sx={{ mb: 2 }}
                placeholder="Will be generated when you create wallet..."
                InputProps={{
                  style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                }}
              />
              
              <TextField
                fullWidth
                label="Fake Private Key"
                value={fakePrivateKey}
                variant="outlined"
                disabled
                sx={{ mb: 2 }}
                placeholder="Will be generated when you create wallet..."
                InputProps={{
                  style: { fontFamily: 'monospace', fontSize: '0.8rem' }
                }}
                helperText="⚠️ This is a fake key for simulation only - not a real private key"
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmationChecked}
                  onChange={(e) => setConfirmationChecked(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I confirm that this is game simulating Crypto and Blockchain behavior. 
                  But it is not attached to the public blockchain and this isn't really currency.
                </Typography>
              }
              sx={{ mb: 3 }}
            />

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCreateWallet}
                disabled={!confirmationChecked}
                sx={{ 
                  px: 4,
                  background: confirmationChecked 
                    ? 'linear-gradient(45deg, #ff6b35 30%, #ff8563 90%)'
                    : 'rgba(255, 255, 255, 0.12)',
                  '&:hover': {
                    background: confirmationChecked
                      ? 'linear-gradient(45deg, #ff8563 30%, #ff6b35 90%)'
                      : 'rgba(255, 255, 255, 0.12)'
                  },
                  '&:disabled': {
                    color: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                🎮 Fill Wallet & Create
              </Button>
            </Box>
          </Box>
        );

      case 'connecting':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Creating Game Wallet...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Setting up your $20,000 investment account
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
              background: 'linear-gradient(45deg, #ff6b35 30%, #ff8563 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '2rem'
            }}>
              🎮
            </Box>
            <Typography variant="h5" color="secondary.main" gutterBottom fontWeight="bold">
              Game Wallet Ready!
            </Typography>
            <Typography variant="body1" gutterBottom>
              Ready to invest in real estate properties
            </Typography>
            <Chip 
              label="$20,000 Game Balance"
              color="secondary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" color="error" gutterBottom>
              Connection Failed
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {error || 'Failed to create game wallet'}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={handleSimulationConnect}
              >
                Try Again
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!isConnecting ? handleClose : undefined}
      maxWidth="sm" 
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
            <AccountBalanceWallet color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {connectionStep === 'confirmation' ? 'Simulation Wallet Setup' : 'Create Game Wallet'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {connectionStep === 'confirmation' 
                  ? 'Review and confirm simulation wallet creation'
                  : 'Setting up your $20,000 investment account'
                }
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={isConnecting}
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
        {connectionStep !== 'confirmation' && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>🎮 Game Mode Features:</strong>
            </Typography>
            <Typography variant="body2">
              • $20,000 starting balance<br/>
              • No real money required<br/>
              • Instant transactions<br/>
              • Perfect for learning real estate investing
            </Typography>
          </Alert>
        )}

        {renderContent()}
      </DialogContent>

    </Dialog>
  );
};