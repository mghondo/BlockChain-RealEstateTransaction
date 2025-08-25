import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  AccessTime,
  MonetizationOn,
  TrendingUp,
  Home
} from '@mui/icons-material';

interface OfflineProgressModalProps {
  open: boolean;
  onClose: () => void;
  progress: {
    gameMonthsElapsed: number;
    rentalIncome: number;
    appreciation: number;
    newProperties: any[];
  };
  isCalculating: boolean;
}

export const OfflineProgressModal: React.FC<OfflineProgressModalProps> = ({
  open,
  onClose,
  progress,
  isCalculating
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTimeAway = (months: number): string => {
    if (months < 1) return 'Less than a month';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    
    return `${years}y ${remainingMonths}m`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          border: '1px solid rgba(0, 212, 255, 0.3)',
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <AccessTime color="primary" />
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            Welcome Back!
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Your investment portfolio kept growing while you were away
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {isCalculating ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Calculating your offline progress...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Processing {progress.gameMonthsElapsed} months of activity
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Time Away */}
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label={`${formatTimeAway(progress.gameMonthsElapsed)} of game time`}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
            </Box>

            <Divider />

            {/* Progress Summary */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Available Cash - Rental Income */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(0, 255, 136, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MonetizationOn sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="body1">Rental Income Available</Typography>
                    <Typography variant="caption" color="text.secondary">
                      💰 Added to your wallet
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>
                  +{formatCurrency(progress.rentalIncome)}
                </Typography>
              </Box>

              {/* Property Appreciation - Paper Gains */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(0, 212, 255, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1">Property Appreciation</Typography>
                    <Typography variant="caption" color="text.secondary">
                      📈 Unrealized gains
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  +{formatCurrency(progress.appreciation)}
                </Typography>
              </Box>

              {/* New Properties */}
              {progress.newProperties.length > 0 && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  backgroundColor: 'rgba(255, 171, 0, 0.1)',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 171, 0, 0.2)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Home sx={{ color: 'warning.main' }} />
                    <Typography variant="body1">New Properties Available</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 600 }}>
                    {progress.newProperties.length}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Total Progress - Separated */}
            <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Available Cash (Added to Wallet)
              </Typography>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                +{formatCurrency(progress.rentalIncome)}
              </Typography>
              
              {progress.appreciation > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    Portfolio Value Increase (Unrealized)
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    +{formatCurrency(progress.appreciation)}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      {!isCalculating && (
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={onClose}
            size="large"
            sx={{ px: 4 }}
          >
            Continue Playing
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};