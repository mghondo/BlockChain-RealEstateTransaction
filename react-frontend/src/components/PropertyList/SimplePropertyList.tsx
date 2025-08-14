import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

export default function SimplePropertyList() {
  console.log('SimplePropertyList rendering...');
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        FracEstate Property List - Debug Version
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎉 Component is rendering successfully!
          </Typography>
          <Typography variant="body1" paragraph>
            This confirms the routing and basic component structure is working.
          </Typography>
          <Button 
            variant="contained" 
            onClick={async () => {
              console.log('Test button clicked');
              // Check if fracEstate is available
              if (typeof window !== 'undefined' && (window as any).fracEstate) {
                console.log('fracEstate utilities found:', (window as any).fracEstate);
                try {
                  const health = await (window as any).fracEstate.health();
                  console.log('FracEstate health:', health);
                } catch (error) {
                  console.error('Health check failed:', error);
                }
              } else {
                console.log('fracEstate utilities not yet loaded');
              }
            }}
          >
            Check FracEstate Status
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => {
              window.location.href = '/properties/full';
            }}
            sx={{ ml: 2 }}
          >
            Try Full Component
          </Button>
        </CardContent>
      </Card>
      
      <Typography variant="body2" color="text.secondary">
        Next step: Check if Firebase is properly initialized and if the property generation is working.
      </Typography>
    </Box>
  );
}