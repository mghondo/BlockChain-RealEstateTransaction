import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function DebugPropertyList() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Debug: Loading ALL properties from database...');
      
      const snapshot = await getDocs(collection(db, 'properties'));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Debug: Found ${docs.length} total properties in database`);
      console.log('Property statuses:', docs.map(p => ({ id: p.id, status: p.status, address: p.address })));
      
      setProperties(docs);
      setLoading(false);
    } catch (err) {
      console.error('❌ Debug Error:', err);
      setError('Failed to load properties');
      setLoading(false);
    }
  };

  const generateTestProperty = async () => {
    try {
      console.log('🏗️ Generating test property...');
      const { generateProperty } = await import('../../utils/propertyGenerator');
      const { addDoc, collection } = await import('firebase/firestore');
      
      const newProperty = generateProperty();
      console.log('Generated property:', newProperty);
      
      await addDoc(collection(db, 'properties'), newProperty);
      console.log('✅ Test property added to database');
      
      // Reload properties
      await loadAllProperties();
    } catch (err) {
      console.error('❌ Error generating test property:', err);
    }
  };

  useEffect(() => {
    loadAllProperties();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading properties...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔍 Property Database Debug
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" onClick={loadAllProperties}>
          Refresh All Properties
        </Button>
        <Button variant="outlined" onClick={generateTestProperty}>
          Generate Test Property
        </Button>
      </Box>

      {error && (
        <Typography variant="h6" color="error" gutterBottom>
          Error: {error}
        </Typography>
      )}

      <Typography variant="h6" gutterBottom>
        Total Properties in Database: {properties.length}
      </Typography>

      {properties.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center', border: '2px dashed gray', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            No Properties Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The properties collection appears to be empty. Click "Generate Test Property" to add one.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          {properties.map((property, index) => (
            <Box key={property.id || index} sx={{ 
              p: 2, 
              mb: 2, 
              border: '1px solid gray', 
              borderRadius: 1,
              backgroundColor: 
                property.status === 'for-sale' ? 'rgba(0, 255, 0, 0.1)' :
                property.status === 'pending' ? 'rgba(255, 165, 0, 0.1)' :
                property.status === 'sold' ? 'rgba(255, 0, 0, 0.1)' : 'transparent'
            }}>
              <Typography variant="h6">
                {property.address || 'Unknown Address'} - {property.city}, {property.state}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {property.status || 'Unknown'} | 
                <strong> Class:</strong> {property.class || 'Unknown'} | 
                <strong> Price:</strong> ${(property.price || 0).toLocaleString()}
              </Typography>
              {property.contractTime && (
                <Typography variant="caption" color="text.secondary">
                  Contract Time: {new Date(property.contractTime).toLocaleString()}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}