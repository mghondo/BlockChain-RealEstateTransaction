import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Grid, CircularProgress } from '@mui/material';
import { propertyService } from '../../services/firebaseService';
import { Property } from '../../types/property';

export default function DebugPropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      console.log('🔄 Loading properties...');
      setLoading(true);
      setError(null);
      
      // Direct Firebase call to bypass service layer issues
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      
      const snapshot = await getDocs(collection(db, 'properties'));
      const props = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
      
      console.log('📦 Loaded properties:', props.length, props);
      
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

  console.log('🔍 Component state:', { 
    propertiesCount: properties.length, 
    loading, 
    error 
  });

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
        Debug Property List
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Found {properties.length} properties
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={loadProperties} 
        sx={{ mb: 3 }}
      >
        Refresh Properties
      </Button>

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
        <Grid container spacing={2}>
          {properties.slice(0, 6).map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ${property.price.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {property.address}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {property.city}, {property.state}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Class {property.class} • {property.status}
                  </Typography>
                  <Typography variant="body2">
                    {property.bedrooms}bd • {property.bathrooms}ba • {property.sqft} sqft
                  </Typography>
                  {property.imageUrl && (
                    <img 
                      src={property.imageUrl} 
                      alt="Property" 
                      style={{ 
                        width: '100%', 
                        height: 120, 
                        objectFit: 'cover', 
                        marginTop: 8,
                        borderRadius: 4
                      }}
                      onError={(e) => {
                        console.log('Image failed to load:', property.imageUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {properties.length > 6 && (
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Showing first 6 of {properties.length} properties
        </Typography>
      )}
    </Box>
  );
}