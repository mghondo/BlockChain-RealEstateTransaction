import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AccountBalanceWallet,
  Security,
  MonetizationOn,
  Close
} from '@mui/icons-material';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface MockWalletProps {
  open: boolean;
  onClose: () => void;
  onConnect: (walletData: MockWalletData) => void;
}

export interface MockWalletData {
  address: string;
  privateKey: string;
  ethBalance: number;
  isConnected: boolean;
}

export const MockWallet: React.FC<MockWalletProps> = ({ open, onClose, onConnect }) => {
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStep, setConnectionStep] = useState<'input' | 'connecting' | 'success'>('input');
  const [error, setError] = useState('');
  
  const { prices } = useCryptoPrices();

  // Generate realistic fake Ethereum address
  const generateFakeAddress = (): string => {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  };

  // Generate realistic fake private key
  const generateFakePrivateKey = (): string => {
    const chars = '0123456789abcdef';
    let privateKey = '0x';
    for (let i = 0; i < 64; i++) {
      privateKey += chars[Math.floor(Math.random() * chars.length)];
    }
    return privateKey;
  };

  // Calculate ETH amount for $20k worth
  const calculateEthAmount = (): number => {
    const ethPrice = prices?.ethToUsd || 4462; // Default to ~$4,462 ETH price if not loaded
    const ethAmount = 20000 / ethPrice; // $20k worth of ETH
    return ethAmount;
  };

  const handleFillWallet = () => {
    const fakeAddress = generateFakeAddress();
    const fakePrivateKey = generateFakePrivateKey();
    
    setAddress(fakeAddress);
    setPrivateKey(fakePrivateKey);
    setError('');
  };

  const validateInputs = (): boolean => {
    if (!address || !privateKey) {
      setError('Please enter both address and private key');
      return false;
    }
    
    if (!address.startsWith('0x') || address.length !== 42) {
      setError('Invalid Ethereum address format');
      return false;
    }
    
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      setError('Invalid private key format');
      return false;
    }
    
    return true;
  };

  const handleConnect = async () => {
    if (!validateInputs()) return;
    
    setIsConnecting(true);
    setConnectionStep('connecting');
    setError('');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const ethAmount = calculateEthAmount();
    const ethPrice = prices?.ethToUsd || 4462;
    
    const walletData: MockWalletData = {
      address,
      privateKey,
      ethBalance: ethAmount,
      // Only ETH balance - USDC conversion happens in smart contract
      isConnected: true
    };
    
    setConnectionStep('success');
    
    // Show success for a moment then connect
    setTimeout(() => {
      onConnect(walletData);
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setAddress('');
    setPrivateKey('');
    setError('');
    setIsConnecting(false);
    setConnectionStep('input');
    setShowPrivateKey(false);
    onClose();
  };

  const ethAmount = calculateEthAmount();
  const ethPrice = prices?.ethToUsd || 4462;

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
                Connect Simulation Wallet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Safe testing environment with simulated funds
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
        {connectionStep === 'input' && (
          <>
            {/* Info Banner */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  🎮 Game Mode - No Real Crypto Required
                </Typography>
                <Typography variant="caption">
                  This wallet simulation gives you ~$20,000 worth of ETH to experiment with
                </Typography>
              </Box>
            </Alert>

            {/* Wallet Preview */}
            <Box sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2, 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 255, 136, 0.05)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MonetizationOn color="success" fontSize="small" />
                <Typography variant="subtitle2" color="success.main">
                  Your Test Wallet Will Receive:
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                • {ethAmount.toFixed(3)} ETH (≈ $${(ethAmount * ethPrice).toFixed(0)})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Can convert to ~$20,000 USDC for transactions
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                = $${(ethAmount * ethPrice).toFixed(0)} Total Value
              </Typography>
            </Box>

            {/* Fill Wallet Button */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleFillWallet}
                sx={{ 
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #ff6b35 30%, #ff8563 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #ff8563 30%, #ff6b35 90%)'
                  }
                }}
              >
                🎲 Fill Wallet with Test Credentials
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Auto-generates safe test address and private key
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Or enter manually
              </Typography>
            </Divider>

            {/* Address Input */}
            <TextField
              fullWidth
              label="Wallet Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              variant="outlined"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountBalanceWallet color="action" />
                  </InputAdornment>
                )
              }}
            />

            {/* Private Key Input */}
            <TextField
              fullWidth
              label="Private Key"
              type={showPrivateKey ? 'text' : 'password'}
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
              variant="outlined"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Security color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      edge="end"
                    >
                      {showPrivateKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Security Notice */}
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🔒 <strong>Simulation Only:</strong> These credentials are fake and cannot access real funds
              </Typography>
            </Alert>
          </>
        )}

        {connectionStep === 'connecting' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Connecting to Simulation Network...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Initializing test wallet with $20k worth of ETH
            </Typography>
          </Box>
        )}

        {connectionStep === 'success' && (
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
              Wallet Filled!
            </Typography>
            <Typography variant="body1" gutterBottom>
              Successfully connected to simulation network
            </Typography>
            <Chip 
              label={`${ethAmount.toFixed(3)} ETH ≈ $${(ethAmount * ethPrice).toFixed(0)}`}
              color="success"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </DialogContent>

      {connectionStep === 'input' && (
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isConnecting || !address || !privateKey}
            sx={{ px: 4 }}
          >
            Connect Wallet
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};