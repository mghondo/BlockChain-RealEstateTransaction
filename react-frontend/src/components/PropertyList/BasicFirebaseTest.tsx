import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function BasicFirebaseTest() {
  const [status, setStatus] = useState('Testing Firebase connection...');
  const [properties, setProperties] = useState<any[]>([]);

  const testFirebase = async () => {
    try {
      setStatus('🔍 Testing Firebase connection...');
      console.log('Testing Firebase with db:', db);
      
      // Test basic collection access
      const propertiesCollection = collection(db, 'properties');
      console.log('Collection reference created:', propertiesCollection);
      
      setStatus('📡 Fetching properties...');
      const snapshot = await getDocs(propertiesCollection);
      console.log('Snapshot received:', snapshot);
      
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Documents found:', docs.length, docs);
      setProperties(docs);
      setStatus(`✅ Success! Found ${docs.length} properties`);
      
    } catch (error) {
      console.error('❌ Firebase test failed:', error);
      setStatus(`❌ Error: ${error}`);
    }
  };

  useEffect(() => {
    testFirebase();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Firebase Connection Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Status: {status}
          </Typography>
          
          <Button variant="contained" onClick={testFirebase}>
            Retry Test
          </Button>
        </CardContent>
      </Card>

      {properties.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Properties Found:
            </Typography>
            {properties.slice(0, 3).map((prop, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>ID:</strong> {prop.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Address:</strong> {prop.address || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Price:</strong> {prop.price ? `$${prop.price.toLocaleString()}` : 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Class:</strong> {prop.class || 'N/A'}
                </Typography>
              </Box>
            ))}
            {properties.length > 3 && (
              <Typography variant="body2">
                ...and {properties.length - 3} more
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}