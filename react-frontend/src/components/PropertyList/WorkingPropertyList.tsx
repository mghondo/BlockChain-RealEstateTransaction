import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, CircularProgress } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function WorkingPropertyList() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      console.log('🔄 Loading properties...');
      setLoading(true);
      setError(null);
      
      const snapshot = await getDocs(collection(db, 'properties'));
      const props = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Handle Firebase Timestamps safely
          price: data.price || 0,
          address: data.address || 'Unknown Address',
          city: data.city || 'Unknown City',
          state: data.state || 'Unknown State',
          class: data.class || 'Unknown',
          status: data.status || 'unknown',
          bedrooms: data.bedrooms || 0,
          bathrooms: data.bathrooms || 0,
          sqft: data.sqft || 0
        };
      });
      
      console.log('📦 Loaded properties:', props.length);
      setProperties(props);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading properties:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading properties...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" color="error" gutterBottom>
          Error Loading Properties
        </Typography>
        <Typography variant="body1" paragraph>
          {error}
        </Typography>
        <Button variant="contained" onClick={loadProperties}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏠 FracEstate Properties
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Found {properties.length} properties
        </Typography>
        <Button variant="contained" onClick={loadProperties}>
          Refresh
        </Button>
      </Box>

      {properties.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No Properties Found
            </Typography>
            <Typography variant="body1">
              Try running fracEstate.initialize() in the console first.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {properties.slice(0, 12).map((property, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={property.id || index}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                {property.imageUrl && (
                  <Box
                    component="img"
                    src={property.imageUrl}
                    alt="Property"
                    sx={{
                      width: '100%',
                      height: 150,
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      console.log('Image failed:', property.imageUrl);
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    {typeof property.price === 'number' 
                      ? `$${property.price.toLocaleString()}` 
                      : 'Price N/A'
                    }
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {property.address}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    {property.city}, {property.state}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Class {property.class}
                    </Typography>
                    <Typography variant="body2" color={
                      property.status === 'available' ? 'success.main' :
                      property.status === 'ending_soon' ? 'warning.main' :
                      'error.main'
                    }>
                      {property.status}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {property.bedrooms}bd • {property.bathrooms}ba • {property.sqft?.toLocaleString()} sqft
                  </Typography>
                  
                  {property.rentalYield && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      {(property.rentalYield * 100).toFixed(1)}% APY
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {properties.length > 12 && (
        <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
          Showing first 12 of {properties.length} properties
        </Typography>
      )}
    </Box>
  );
}