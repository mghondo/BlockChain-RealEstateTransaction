import React, { useState } from 'react';
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
  Launch,
  Close
} from '@mui/icons-material';
import { useWallet } from '../../hooks/useWallet';
import { useTokenBalance } from '../../hooks/useTokenBalance';

export default function NewHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    isConnected,
    account,
    balance,
    chainId,
    isLoading,
    error,
    currentNetwork,
    supportedNetworks,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
    isSupportedNetwork,
    isMetaMaskInstalled
  } = useWallet();

  const { tokenBalances, getTokenBalance } = useTokenBalance();

  const [networkMenuAnchor, setNetworkMenuAnchor] = useState<null | HTMLElement>(null);
  const [walletMenuAnchor, setWalletMenuAnchor] = useState<null | HTMLElement>(null);

  const navigationItems = [
    { label: 'Home', path: '/' },
    { label: 'Properties', path: '/properties' },
    ...(isConnected ? [{ label: 'Dashboard', path: '/dashboard' }] : [])
  ];

  const handleNavClick = (path: string) => {
    console.log('🚀 Navigation clicked for path:', path);
    navigate(path);
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleNetworkSwitch = async (chainId: number) => {
    try {
      await switchNetwork(chainId);
      setNetworkMenuAnchor(null);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setWalletMenuAnchor(null);
    }
  };

  const openNetworkExplorer = () => {
    if (account && currentNetwork) {
      const explorerUrl = `${currentNetwork.blockExplorerUrl}/address/${account}`;
      window.open(explorerUrl, '_blank');
      setWalletMenuAnchor(null);
    }
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num.toFixed(4);
  };

  const getNetworkStatusColor = () => {
    if (!isConnected) return 'default';
    return isSupportedNetwork(chainId || 0) ? 'success' : 'error';
  };

  const getNetworkStatusText = () => {
    if (!isConnected) return 'Disconnected';
    return isSupportedNetwork(chainId || 0) ? 'Supported' : 'Unsupported';
  };

  const usdcBalance = getTokenBalance('USDC');
  const mainnetNetworks = supportedNetworks.filter(n => !n.isTestnet);
  const testnetNetworks = supportedNetworks.filter(n => n.isTestnet);

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

        {/* Network Status */}
        {isConnected && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => setNetworkMenuAnchor(e.currentTarget)}
              endIcon={<KeyboardArrowDown />}
              sx={{ mr: 1 }}
            >
              {currentNetwork?.displayName || 'Unknown Network'}
            </Button>
            <Chip
              label={getNetworkStatusText()}
              color={getNetworkStatusColor()}
              size="small"
            />
          </Box>
        )}

        {/* Balance Display */}
        {isConnected && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Chip
              label={`${formatBalance(balance)} ${currentNetwork?.symbol || 'ETH'}`}
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
            />
            {usdcBalance && (
              <Chip
                label={`${usdcBalance.formatted} USDC`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        )}

        {/* Wallet Connection */}
        {!isMetaMaskInstalled ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.open('https://metamask.io/', '_blank')}
          >
            Install MetaMask
          </Button>
        ) : !isConnected ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnectWallet}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <AccountBalanceWallet />}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={(e) => setWalletMenuAnchor(e.currentTarget)}
            startIcon={<AccountBalanceWallet />}
            endIcon={<KeyboardArrowDown />}
          >
            {formatAddress(account || '')}
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <Chip
            label={error}
            color="error"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Toolbar>

      {/* Network Selection Menu */}
      <Menu
        anchorEl={networkMenuAnchor}
        open={Boolean(networkMenuAnchor)}
        onClose={() => setNetworkMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Mainnet Networks
        </Typography>
        {mainnetNetworks.map((network) => (
          <MenuItem
            key={network.chainId}
            onClick={() => handleNetworkSwitch(network.chainId)}
            selected={network.chainId === chainId}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Typography>{network.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {network.symbol}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        
        {testnetNetworks.length > 0 && [
          <Divider key="divider" />,
          <Typography key="header" variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
            Testnet Networks
          </Typography>,
          ...testnetNetworks.map((network) => (
            <MenuItem
              key={network.chainId}
              onClick={() => handleNetworkSwitch(network.chainId)}
              selected={network.chainId === chainId}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{network.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {network.symbol}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ]}
      </Menu>

      {/* Wallet Menu */}
      <Menu
        anchorEl={walletMenuAnchor}
        open={Boolean(walletMenuAnchor)}
        onClose={() => setWalletMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 300 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Connected Account
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
            {account}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Tooltip title="Copy Address">
              <IconButton size="small" onClick={handleCopyAddress}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="View on Explorer">
              <IconButton size="small" onClick={openNetworkExplorer}>
                <Launch fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Balances
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              {formatBalance(balance)} {currentNetwork?.symbol || 'ETH'}
            </Typography>
            {tokenBalances.map((token) => (
              <Typography key={token.symbol} variant="body2">
                {token.formatted} {token.symbol}
              </Typography>
            ))}
          </Box>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={disconnectWallet}>
          <Close sx={{ mr: 1 }} />
          Disconnect Wallet
        </MenuItem>
      </Menu>
    </AppBar>
  );
}