import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert } from '@mui/material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { testTimelineSystem } from '../../utils/testTimeline';

interface TimelineStats {
  totalProperties: number;
  propertiesWithTimeline: number;
  availableProperties: number;
  soldProperties: number;
}

export const TimelineDebug: React.FC = () => {
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testTimelineSystem();
      setStats(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card sx={{ m: 2, maxWidth: 600 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔧 Timeline System Debug
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {stats && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Last updated: {lastUpdate?.toLocaleTimeString()}
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Properties
                </Typography>
                <Typography variant="h6">
                  {stats.totalProperties}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  With Timeline
                </Typography>
                <Typography variant="h6">
                  {stats.propertiesWithTimeline}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Available
                </Typography>
                <Typography variant="h6" color="success.main">
                  {stats.availableProperties}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Sold Out
                </Typography>
                <Typography variant="h6" color="error.main">
                  {stats.soldProperties}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
        
        <Button 
          variant="outlined" 
          onClick={loadStats} 
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? 'Loading...' : 'Refresh Stats'}
        </Button>
      </CardContent>
    </Card>
  );
};