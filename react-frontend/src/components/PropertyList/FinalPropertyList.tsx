import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, CircularProgress } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function FinalPropertyList() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading properties for display...');
      
      const snapshot = await getDocs(collection(db, 'properties'));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📦 Loaded ${docs.length} properties for display`);
      setProperties(docs);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Failed to load properties');
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
        <Typography variant="h6" sx={{ mt: 2 }}>Loading properties...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" color="error" gutterBottom>Error: {error}</Typography>
        <Button variant="contained" onClick={loadProperties}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏠 FracEstate Property Marketplace
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {properties.length} Properties Available
        </Typography>
        <Button variant="contained" onClick={loadProperties}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {properties.map((property, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={property.id || index}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme => theme.shadows[8],
                }
              }}
            >
              {/* Property Image */}
              {property.imageUrl && (
                <Box
                  component="img"
                  src={property.imageUrl}
                  alt="Property"
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* Price */}
                <Typography variant="h6" gutterBottom color="primary.main" sx={{ fontWeight: 700 }}>
                  ${(property.price || 0).toLocaleString()}
                </Typography>
                
                {/* Address */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {property.address || 'Address N/A'}
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  {property.city || 'City'}, {property.state || 'State'}
                </Typography>
                
                {/* Property Details */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ 
                    backgroundColor: 
                      property.class === 'A' ? '#FFD700' :
                      property.class === 'B' ? '#C0C0C0' : '#CD7F32',
                    color: '#000',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontWeight: 600
                  }}>
                    Class {property.class || '?'}
                  </Typography>
                  
                  <Typography variant="body2" color={
                    property.status === 'available' ? 'success.main' :
                    property.status === 'ending_soon' ? 'warning.main' :
                    'error.main'
                  }>
                    {property.status || 'unknown'}
                  </Typography>
                </Box>
                
                {/* Beds/Baths/Sqft */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {property.bedrooms || 0}bd • {property.bathrooms || 0}ba • {(property.sqft || 0).toLocaleString()} sqft
                </Typography>
                
                {/* Year Built */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Built {property.yearBuilt || 'Unknown'}
                </Typography>
                
                {/* Rental Yield */}
                {property.rentalYield && (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    {(property.rentalYield * 100).toFixed(1)}% Annual Yield
                  </Typography>
                )}
                
                {/* Region */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {property.region || 'Unknown'} Region
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        🎉 FracEstate Phase 1 - Property Generation & Marketplace System
      </Typography>
    </Box>
  );
}