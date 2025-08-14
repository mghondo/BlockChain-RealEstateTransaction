import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Skeleton,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  useTheme
} from '@mui/material';
import { Property } from '../../types/property';

// Full page loading component
export function FullPageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: 2
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

// Property card skeleton loader
export function PropertyCardSkeleton() {
  return (
    <Card sx={{ height: 480 }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="80%" height={24} sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="30%" height={20} />
        </Box>
        
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />
        
        <Box sx={{ mb: 2 }}>
          <Skeleton variant="text" width="100%" height={20} />
          <Skeleton variant="rectangular" height={8} sx={{ mt: 1, borderRadius: 1 }} />
        </Box>
        
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
      </CardContent>
    </Card>
  );
}

// Property list skeleton loader
export function PropertyListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <PropertyCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}

// Property detail skeleton loader
export function PropertyDetailSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Skeleton variant="text" width="30%" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={24} />
          </Box>
          
          {/* Main Image */}
          <Skeleton variant="rectangular" height={400} sx={{ mb: 3, borderRadius: 2 }} />
          
          {/* Property Details */}
          <Card>
            <CardContent>
              <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Grid item xs={6} sm={3} key={index}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
                      <Skeleton variant="text" width="80%" height={24} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="70%" height={20} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {/* Investment Panel */}
          <Card>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 3 }}>
                <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={8} sx={{ mb: 1, borderRadius: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </Box>
              
              {Array.from({ length: 3 }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="30%" height={20} />
                </Box>
              ))}
              
              <Skeleton variant="rectangular" height={48} sx={{ mt: 3, borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Inline loading component for small operations
export function InlineLoading({ 
  message = 'Loading...', 
  size = 20 
}: { 
  message?: string; 
  size?: number; 
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
      <CircularProgress size={size} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

// Loading overlay for content areas
export function LoadingOverlay({ 
  loading, 
  children, 
  message = 'Loading...' 
}: { 
  loading: boolean; 
  children: React.ReactNode; 
  message?: string; 
}) {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {message}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Progress bar for data loading
export function ProgressLoading({ 
  progress, 
  message = 'Processing...' 
}: { 
  progress: number; 
  message?: string; 
}) {
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {message}
      </Typography>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ height: 8, borderRadius: 4 }} 
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {Math.round(progress)}% complete
      </Typography>
    </Box>
  );
}

// Shimmer effect for content loading
export function ShimmerLoading({ 
  width = '100%', 
  height = 20, 
  borderRadius = 1 
}: { 
  width?: string | number; 
  height?: number; 
  borderRadius?: number; 
}) {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${theme.palette.grey[300]} 25%, ${theme.palette.grey[200]} 50%, ${theme.palette.grey[300]} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        '@keyframes shimmer': {
          '0%': {
            backgroundPosition: '-200% 0'
          },
          '100%': {
            backgroundPosition: '200% 0'
          }
        }
      }}
    />
  );
}

// Loading state for property statistics
export function StatsLoadingSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Skeleton variant="text" width="80%" height={48} />
              <Skeleton variant="text" width="60%" height={20} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// Loading state for lists
export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="text" width="60%" height={16} />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
    </Box>
  );
}

// Adaptive loading component that chooses appropriate loader
export function AdaptiveLoading({ 
  type, 
  count, 
  message 
}: { 
  type: 'page' | 'cards' | 'detail' | 'stats' | 'list' | 'inline'; 
  count?: number; 
  message?: string; 
}) {
  switch (type) {
    case 'page':
      return <FullPageLoading message={message} />;
    case 'cards':
      return <PropertyListSkeleton count={count} />;
    case 'detail':
      return <PropertyDetailSkeleton />;
    case 'stats':
      return <StatsLoadingSkeleton />;
    case 'list':
      return <ListLoadingSkeleton count={count} />;
    case 'inline':
      return <InlineLoading message={message} />;
    default:
      return <FullPageLoading message={message} />;
  }
}