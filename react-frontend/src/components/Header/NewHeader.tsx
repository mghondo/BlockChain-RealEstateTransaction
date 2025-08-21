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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
    restoreWallet,
    mode,
    strikePrice,
    createdAt,
    initialUsdValue,
    getCurrentUsdValue,
    getProfitLoss,
    getWalletPerformance,
    volatilityData,
    firebaseWallet
  } = useMockWallet();

  const { prices } = useCryptoPrices();

  const [walletMenuAnchor, setWalletMenuAnchor] = useState<null | HTMLElement>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);

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

  const handleWalletConnect = async (walletData: any) => {
    await connectWallet(walletData);
    setShowWalletModal(false);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setWalletMenuAnchor(null);
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectWarning(true);
    setWalletMenuAnchor(null);
  };

  const confirmDisconnect = () => {
    disconnectWallet();
    setShowDisconnectWarning(false);
  };

  const cancelDisconnect = () => {
    setShowDisconnectWarning(false);
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

        {/* Crypto Price Display - Hidden from header, available for property purchase and dashboard */}
        {/* <PriceDisplay compact className="hidden md:flex mr-2" /> */}

        {/* Balance Display */}
        {isConnected && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  backgroundColor: 'success.main',
                  borderRadius: '50%',
                  animation: 'priceFlicker 0.2s infinite',
                  '@keyframes priceFlicker': {
                    '0%, 50%': {
                      backgroundColor: 'success.main'
                    },
                    '51%, 100%': {
                      backgroundColor: '#2e7d58'
                    }
                  }
                }} 
              />
              <Chip
                label={`${formatBalance(ethBalance)} ETH`}
                variant="outlined"
                size="small"
                color="primary"
              />
            </Box>
            {mode === 'simulation' && volatilityData ? (
              <Tooltip title={`Strike Price: $${volatilityData.daysSinceCreation > 0 ? `${strikePrice?.toFixed(0)} (${volatilityData.daysSinceCreation} days ago)` : strikePrice?.toFixed(0)}`}>
                <Chip
                  label={`$${volatilityData.currentUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${volatilityData.profitLoss >= 0 ? '+' : ''}$${Math.abs(volatilityData.profitLoss).toFixed(0)})`}
                  variant="outlined"
                  size="small"
                  color={volatilityData.profitLoss >= 0 ? "success" : "error"}
                  sx={{
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: volatilityData.profitLoss >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'
                    }
                  }}
                />
              </Tooltip>
            ) : prices && mode === 'simulation' && getCurrentUsdValue ? (
              (() => {
                const currentUsdValue = getCurrentUsdValue(prices.ethToUsd);
                const profitLoss = getProfitLoss ? getProfitLoss(prices.ethToUsd) : 0;
                const isProfit = profitLoss >= 0;
                return (
                  <Chip
                    label={`$${currentUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${isProfit ? '+' : ''}${profitLoss.toFixed(0)})`}
                    variant="outlined"
                    size="small"
                    color={isProfit ? "success" : "error"}
                  />
                );
              })()
            ) : prices ? (
              <Chip
                label={`≈ $${(ethBalance * prices.ethToUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                variant="outlined"
                size="small"
                color="success"
              />
            ) : null}
          </Box>
        )}


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
              {mode === 'simulation' ? '🎮 Game Wallet Connected' : '🔗 Test Wallet Connected'}
            </Typography>
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
            {mode === 'simulation' ? 'Game Balance' : 'Test Balances'}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="primary.main">
              💎 {formatBalance(ethBalance)} ETH
            </Typography>
            {prices && mode === 'simulation' && getCurrentUsdValue ? (
              (() => {
                const currentUsdValue = getCurrentUsdValue(prices.ethToUsd);
                const profitLoss = getProfitLoss ? getProfitLoss(prices.ethToUsd) : 0;
                const profitLossPercent = getWalletPerformance ? getWalletPerformance(prices.ethToUsd)?.profitLossPercent || 0 : 0;
                const isProfit = profitLoss >= 0;
                return (
                  <>
                    <Typography variant="body2" color="success.main">
                      💵 ${currentUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                    </Typography>
                    <Typography variant="body2" color={isProfit ? "success.main" : "error.main"} sx={{ fontWeight: 600 }}>
                      📈 {isProfit ? '+' : ''}${profitLoss.toFixed(2)} ({isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ETH: ${strikePrice?.toFixed(0)} → ${prices.ethToUsd.toFixed(0)}
                    </Typography>
                  </>
                );
              })()
            ) : prices ? (
              <Typography variant="body2" color="success.main">
                💵 ≈ ${(ethBalance * prices.ethToUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
              </Typography>
            ) : null}
          </Box>
          
          <Typography variant="caption" color="text.secondary" display="block">
            Game wallet with realistic crypto volatility
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

      {/* Disconnect Warning Dialog */}
      <Dialog
        open={showDisconnectWarning}
        onClose={cancelDisconnect}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          ⚠️ Disconnect Test Wallet
        </DialogTitle>
        <DialogContent>
          <Typography>
            Disconnecting your test wallet will remove your real estate holdings and portfolio data. 
            This action cannot be undone.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 600, color: 'warning.main' }}>
            Proceed with disconnect?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={cancelDisconnect}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDisconnect}
            variant="contained"
            color="error"
            sx={{ fontWeight: 600 }}
          >
            Yes, Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}