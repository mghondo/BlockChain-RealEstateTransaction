import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  Divider,
  IconButton
} from '@mui/material';
import {
  AccountBalanceWallet,
  KeyboardArrowDown,
  ContentCopy,
  Close
} from '@mui/icons-material';
import { useMockWallet } from '../../hooks/useMockWallet';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { MockWallet } from '../MockWallet/MockWallet';
import { GameClock } from '../GameTime/GameClock';
import { PriceDisplay } from '../Currency/PriceDisplay';

export default function NewHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    isConnected,
    address,
    ethBalance,
    isLoading,
    connectWallet,
    disconnectWallet,
    formatAddress,
    formatBalance,
    restoreWallet
  } = useMockWallet();

  const { prices } = useCryptoPrices();

  const [walletMenuAnchor, setWalletMenuAnchor] = useState<null | HTMLElement>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const navigationItems = [
    { label: 'Home', path: '/' },
    { label: 'Properties', path: '/properties' },
    ...(isConnected ? [{ label: 'Dashboard', path: '/dashboard' }] : [])
  ];

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

  const handleNavClick = (path: string) => {
    console.log('🚀 Navigation clicked for path:', path);
    navigate(path);
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleWalletConnect = (walletData: any) => {
    connectWallet(walletData);
    setShowWalletModal(false);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setWalletMenuAnchor(null);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWalletMenuAnchor(null);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          onClick={() => handleNavClick('/')}
          sx={{ fontWeight: 'bold', cursor: 'pointer', mr: 4 }}
        >
          FracEstate
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
          {navigationItems.map((item) => (
            <Typography
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              sx={{
                cursor: 'pointer',
                px: 2,
                py: 1,
                borderRadius: 1,
                fontWeight: location.pathname === item.path ? 600 : 400,
                color: location.pathname === item.path ? 'primary.main' : 'inherit',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {item.label}
            </Typography>
          ))}
        </Box>

        {/* Game Clock */}
        <GameClock />

        {/* Crypto Price Display */}
        <PriceDisplay compact className="hidden md:flex mr-2" />

        {/* Balance Display */}
        {isConnected && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Chip
              label={`${formatBalance(ethBalance)} ETH`}
              variant="outlined"
              size="small"
              color="primary"
              sx={{ mr: 1 }}
            />
            {prices && (
              <Chip
                label={`≈ $${(ethBalance * prices.ethToUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                variant="outlined"
                size="small"
                color="success"
              />
            )}
          </Box>
        )}

        {/* Game Mode Badge */}
        {/* {isConnected && (
          <Chip
            label="🎮 Game Mode"
            color="secondary"
            size="small"
            sx={{ mr: 2 }}
          />
        )} */}

        {/* Wallet Connection */}
        {!isConnected ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnectWallet}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
          >
            {isLoading ? 'Connecting...' : 'Connect Test Wallet'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={(e) => setWalletMenuAnchor(e.currentTarget)}
            startIcon={<AccountBalanceWallet />}
            endIcon={<KeyboardArrowDown />}
          >
            View Wallet
          </Button>
        )}
      </Toolbar>

      {/* Wallet Menu */}
      <Menu
        anchorEl={walletMenuAnchor}
        open={Boolean(walletMenuAnchor)}
        onClose={() => setWalletMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 320 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              🎮 Test Wallet Connected
            </Typography>
            <Chip label="Simulation" color="secondary" size="small" />
          </Box>
          
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
            {address}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Tooltip title="Copy Address">
              <IconButton size="small" onClick={handleCopyAddress}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Test Balances
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="primary.main">
              💎 {formatBalance(ethBalance)} ETH
            </Typography>
            {prices && (
              <Typography variant="body2" color="success.main">
                💵 ≈ ${(ethBalance * prices.ethToUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
              </Typography>
            )}
          </Box>
          
          <Typography variant="caption" color="text.secondary" display="block">
            Safe simulation environment - no real funds at risk
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleDisconnect}>
          <Close sx={{ mr: 1 }} />
          Disconnect Test Wallet
        </MenuItem>
      </Menu>

      {/* Mock Wallet Modal */}
      <MockWallet
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </AppBar>
  );
}