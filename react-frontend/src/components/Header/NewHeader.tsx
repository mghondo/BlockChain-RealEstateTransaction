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
import { useAuth } from '../../contexts/AuthContext';
import { MockWallet } from '../MockWallet/MockWallet';
import { GameClock } from '../GameTime/GameClock';
import { PriceDisplay } from '../Currency/PriceDisplay';

export default function NewHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  
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
  } = useMockWallet({ userId: user?.uid });

  const { prices } = useCryptoPrices();

  const [walletMenuAnchor, setWalletMenuAnchor] = useState<null | HTMLElement>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);

  const navigationItems = [
    ...(isAuthenticated ? [
      { label: 'Properties', path: '/properties' },
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Watchlist', path: '/watchlist' }
    ] : [])
  ];

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

  const handleNavClick = (path: string) => {
    console.log('🚀 Navigation clicked for path:', path);
    
    // If user clicks on home (/) and they're not authenticated, redirect to auth
    if (path === '/' && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    
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
                  color="success"
                  sx={{
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)'
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
                    color="success"
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

        {/* Combined Wallet & Account Menu */}
        <Button
          variant={isConnected ? "outlined" : "contained"}
          color="primary"
          onClick={(e) => setWalletMenuAnchor(e.currentTarget)}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
          endIcon={<KeyboardArrowDown />}
        >
          {isLoading ? 'Connecting...' : isConnected ? 'Account' : 'Account'}
        </Button>
      </Toolbar>

      {/* Combined Wallet & Account Menu */}
      <Menu
        anchorEl={walletMenuAnchor}
        open={Boolean(walletMenuAnchor)}
        onClose={() => setWalletMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 320 }
        }}
      >
        {/* Authentication Section */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          {!isAuthenticated ? (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                👤 Account
              </Typography>
              <Button
                fullWidth
                variant="contained"
                onClick={() => { navigate('/auth'); setWalletMenuAnchor(null); }}
                sx={{ mb: 1 }}
              >
                Sign In / Register
              </Button>
              <Typography variant="caption" color="text.secondary">
                Sign in to sync your portfolio across devices
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                👤 Signed in as
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {user?.displayName || user?.email?.split('@')[0]}
              </Typography>
              {user?.email && user?.displayName && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {user.email}
                </Typography>
              )}
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => { logout(); setWalletMenuAnchor(null); }}
                startIcon={<Close />}
              >
                Sign Out
              </Button>
            </>
          )}
        </Box>

        {/* Wallet Section - Only show when authenticated */}
        {isAuthenticated && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              💎 Test Wallet
            </Typography>
            
            {isConnected ? (
          <>
            <Typography variant="body2" color="success.main" sx={{ mb: 2, fontWeight: 600 }}>
              {mode === 'simulation' ? '🎮 Connected' : '🔗 Connected'}
            </Typography>
          
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
          
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Game wallet with realistic crypto volatility
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Button
            fullWidth
            variant="outlined"
            onClick={() => { handleDisconnect(); setWalletMenuAnchor(null); }}
            startIcon={<Close />}
            size="small"
          >
            Disconnect Wallet
          </Button>
          </>
          ) : (
            <>
              <Button
                fullWidth
                variant="contained"
                onClick={() => { handleConnectWallet(); setWalletMenuAnchor(null); }}
                startIcon={<AccountBalanceWallet />}
                sx={{ mb: 1 }}
              >
                Connect Test Wallet
              </Button>
              <Typography variant="caption" color="text.secondary">
                Connect a game wallet to start trading properties
              </Typography>
            </>
            )}
          </Box>
        )}
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
          ⚠️ Disconnect Test Wallet & Clear All Data
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Disconnecting your test wallet will <strong>permanently remove ALL</strong> of the following:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 2, pl: 3 }}>
            <li>Property investments and ownership records</li>
            <li>Transaction history and purchase data</li>
            <li>Portfolio performance and rental income</li>
            <li>Wallet balance and simulation data</li>
          </Box>
          <Typography sx={{ fontWeight: 600, color: 'error.main', mt: 2 }}>
            🗑️ This action cannot be undone!
          </Typography>
          <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            You'll start fresh with a new wallet if you connect again.
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
            🗑️ Clear All Data & Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}