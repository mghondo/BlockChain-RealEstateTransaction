import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import { MockWallet } from '../MockWallet/MockWallet';
import { EnhancedInvestmentModal } from '../Investment/EnhancedInvestmentModal';
import { useMockWallet } from '../../hooks/useMockWallet';
import { useWeb3Context } from '../../contexts/Web3Context';
import { Property } from '../../types/property';

// Sample property for testing
const sampleProperty: Property = {
  id: '1',
  class: 'B',
  address: '123 Test Street',
  city: 'San Francisco',
  state: 'CA',
  region: 'Southwest',
  price: 500000,
  sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2020,
  rentalYield: 8.5,
  currentValue: 525000,
  imageUrl: '/placeholder.jpg',
  createdAt: { seconds: Date.now() / 1000 } as any,
  selloutTime: { seconds: (Date.now() / 1000) + 3600 } as any,
  status: 'available',
  mockInvestors: [],
  sharePrice: 5250, // $525,000 / 100 shares
};

export const BlockchainTest: React.FC = () => {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  
  const { 
    isConnected, 
    address, 
    ethBalance, 
    formatAddress, 
    formatBalance,
    disconnectWallet,
    isBlockchainMode
  } = useMockWallet();

  const { state: web3State } = useWeb3Context();

  const handleWalletConnect = (walletData: any) => {
    console.log('Wallet connected:', walletData);
    setWalletModalOpen(false);
  };

  const handleInvestmentSuccess = (shares: number, amount: number) => {
    console.log('Investment successful:', { shares, amount });
    setInvestmentModalOpen(false);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        🔗 Blockchain Wallet Test Environment
      </Typography>
      
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Test blockchain investment functionality on Sepolia testnet
      </Typography>

      {/* Wallet Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Current Wallet Status
              </Typography>
              
              {isConnected ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="Blockchain Mode"
                      color="primary"
                      size="small"
                    />
                    <Typography variant="body2">
                      Connected
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2">
                    <strong>Address:</strong> {formatAddress(address || '')}
                  </Typography>
                  
                  <Typography variant="body2">
                    <strong>Balance:</strong> {formatBalance(ethBalance)} ETH
                  </Typography>
                  
                  <Typography variant="body2" color="primary">
                    <strong>Network:</strong> Sepolia Testnet
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  No wallet connected. Click "Connect Wallet" to start testing.
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Web3 Context Status
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>MetaMask:</strong> {web3State.wallet.isConnected ? 'Connected' : 'Disconnected'}
                </Typography>
                
                {web3State.wallet.isConnected && (
                  <>
                    <Typography variant="body2">
                      <strong>Chain ID:</strong> {web3State.wallet.chainId}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Account:</strong> {web3State.wallet.account?.slice(0, 6)}...{web3State.wallet.account?.slice(-4)}
                    </Typography>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => setWalletModalOpen(true)}
            sx={{ py: 2 }}
          >
            Connect Wallet
          </Button>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            fullWidth
            size="large"
            onClick={() => setInvestmentModalOpen(true)}
            disabled={!isConnected}
            sx={{ py: 2 }}
          >
            Test Investment
          </Button>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            size="large"
            onClick={disconnectWallet}
            disabled={!isConnected}
            sx={{ py: 2 }}
          >
            Disconnect Wallet
          </Button>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="text"
            fullWidth
            size="large"
            onClick={() => window.location.reload()}
            sx={{ py: 2 }}
          >
            Reset Test
          </Button>
        </Grid>
      </Grid>

      {/* Test Instructions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🧪 Testing Instructions
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Blockchain Testing Steps:</strong>
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mb: 2, pl: 2 }}>
            <li>Ensure MetaMask is installed and connected to Sepolia testnet</li>
            <li>Get test ETH from a Sepolia faucet (sepolia-faucet.pk910.de)</li>
            <li>Click "Connect Wallet" to connect MetaMask</li>
            <li>Try the investment flow - should trigger real blockchain transaction</li>
            <li>Verify transaction appears in MetaMask and on Sepolia explorer</li>
            <li>Check that NFT shares appear in your wallet</li>
          </Typography>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Note:</strong> Ensure the RealEstate contract is deployed to Sepolia 
            and the contract address is updated in CONTRACT_ADDRESSES configuration.
          </Alert>
        </CardContent>
      </Card>

      {/* Modals */}
      <MockWallet
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletConnect}
      />

      <EnhancedInvestmentModal
        open={investmentModalOpen}
        onClose={() => setInvestmentModalOpen(false)}
        property={sampleProperty}
        onSuccess={handleInvestmentSuccess}
      />
    </Box>
  );
};