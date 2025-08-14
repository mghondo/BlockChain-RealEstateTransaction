import React, { useState } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';

export default function MinimalTest() {
  const [status, setStatus] = useState('Ready to test');
  const [properties, setProperties] = useState<any[]>([]);

  const testDirectFirebase = async () => {
    try {
      setStatus('🔄 Step 1: Importing Firebase...');
      
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      
      setStatus('🔄 Step 2: Creating collection reference...');
      console.log('Database object:', db);
      
      const propertiesCollection = collection(db, 'properties');
      console.log('Collection reference:', propertiesCollection);
      
      setStatus('🔄 Step 3: Fetching documents...');
      
      const snapshot = await getDocs(propertiesCollection);
      console.log('Snapshot received:', snapshot);
      console.log('Snapshot size:', snapshot.size);
      
      setStatus('🔄 Step 4: Processing documents...');
      
      const docs = snapshot.docs.map((doc, index) => {
        console.log(`Document ${index}:`, doc.id, doc.data());
        return {
          id: doc.id,
          data: doc.data()
        };
      });
      
      setProperties(docs);
      setStatus(`✅ Success! Found ${docs.length} documents`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setStatus(`❌ Error: ${error}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔬 Minimal Firebase Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Status: {status}
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={testDirectFirebase}
            sx={{ mr: 2 }}
          >
            Test Firebase Connection
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => {
              console.log('Current properties state:', properties);
              console.log('Window fracEstate:', (window as any).fracEstate);
            }}
          >
            Debug Console
          </Button>
        </CardContent>
      </Card>

      {properties.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Raw Property Data (First 3):
            </Typography>
            
            {properties.slice(0, 3).map((prop, index) => (
              <Box 
                key={index} 
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  bgcolor: 'background.default', 
                  borderRadius: 1,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>ID:</strong> {prop.id}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>Address:</strong> {prop.data?.address || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>Price:</strong> {prop.data?.price || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>Class:</strong> {prop.data?.class || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <strong>Raw Data Keys:</strong> {Object.keys(prop.data || {}).join(', ')}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        This test will show exactly where the Firebase query is failing.
        Check browser console for detailed logs.
      </Typography>
    </Box>
  );
}