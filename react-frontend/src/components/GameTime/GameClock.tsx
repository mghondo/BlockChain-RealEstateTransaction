import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useGameTime } from '../../hooks/useGameTime';
import { useWallet } from '../../hooks/useWallet';

interface GameClockProps {
  showDetailed?: boolean;
}

export const GameClock: React.FC<GameClockProps> = ({ showDetailed = false }) => {
  const { account } = useWallet();
  const { gameTime, realTime, gameStartTime, isCalculatingOfflineProgress } = useGameTime(account || '');
  
  if (!gameTime) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 2, 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2 
      }}>
        <Box sx={{ 
          width: 8, 
          height: 8, 
          backgroundColor: 'grey.400', 
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }} />
        <Typography variant="body2" color="text.secondary">
          Syncing game time...
        </Typography>
      </Box>
    );
  }
  
  if (isCalculatingOfflineProgress) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        p: 2, 
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 2,
        border: '1px solid rgba(255, 165, 0, 0.3)'
      }}>
        <Box sx={{ 
          width: 8, 
          height: 8, 
          backgroundColor: 'warning.main', 
          borderRadius: '50%',
          animation: 'pulse 1s infinite'
        }} />
        <Typography variant="body2" color="warning.main">
          Calculating offline progress...
        </Typography>
      </Box>
    );
  }
  
  const formatGameDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatGameTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const calculateGameAge = (): string => {
    if (!gameStartTime) return '';
    const ageMs = gameTime.getTime() - gameStartTime.getTime();
    const gameYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365));
    const gameMonths = Math.floor((ageMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (gameYears > 0) {
      return `${gameYears}y ${gameMonths}m`;
    }
    return `${gameMonths} months`;
  };
  
  return (
    <Box sx={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.05)', 
      borderRadius: 2, 
      p: 2, 
      border: '1px solid rgba(255, 255, 255, 0.1)' 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 8, 
            height: 8, 
            backgroundColor: 'success.main', 
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <Typography variant="caption" color="text.secondary">
            GAME TIME
          </Typography>
        </Box>
        <Chip 
          label="1hr = 2 months" 
          size="small" 
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 20 }}
        />
      </Box>
      
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
          {formatGameDate(gameTime)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatGameTime(gameTime)}
        </Typography>
      </Box>
      
      {showDetailed && (
        <Box sx={{ 
          mt: 2, 
          pt: 2, 
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Portfolio Age:
            </Typography>
            <Typography variant="caption" color="white">
              {calculateGameAge()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Real Time:
            </Typography>
            <Typography variant="caption" color="white">
              {realTime?.toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};