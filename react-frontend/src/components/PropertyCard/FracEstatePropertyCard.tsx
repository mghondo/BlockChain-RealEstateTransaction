import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  LocationOn,
  Home,
  TrendingUp,
  AccessTime,
  Favorite,
  FavoriteBorder,
  Share,
  CalendarToday,
  AttachMoney
} from '@mui/icons-material';
import { Property, PropertyStatus } from '../../types/property';

interface FracEstatePropertyCardProps {
  property: Property;
  isInWatchlist?: boolean;
  onViewDetails?: (property: Property) => void;
  onToggleWatchlist?: (property: Property) => void;
  onShare?: (property: Property) => void;
  loading?: boolean;
}

export default function FracEstatePropertyCard({
  property,
  isInWatchlist = false,
  onViewDetails,
  onToggleWatchlist,
  onShare,
  loading = false
}: FracEstatePropertyCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Calculate time remaining until sellout
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const selloutTime = property.selloutTime.toDate().getTime();
      const timeDiff = selloutTime - now;

      if (timeDiff <= 0) {
        setTimeRemaining('Sold Out');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [property.selloutTime]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'ending_soon':
        return 'warning';
      case 'sold_out':
        return 'error';
      default:
        return 'default';
    }
  };

  const getClassColor = (propertyClass: string) => {
    switch (propertyClass) {
      case 'A':
        return '#FFD700'; // Gold
      case 'B':
        return '#C0C0C0'; // Silver
      case 'C':
        return '#CD7F32'; // Bronze
      default:
        return theme.palette.primary.main;
    }
  };

  const getStatusLabel = (status: PropertyStatus) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'ending_soon':
        return 'Ending Soon';
      case 'sold_out':
        return 'Sold Out';
      default:
        return 'Unknown';
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  if (loading) {
    return (
      <Card
        sx={{
          height: isMobile ? 'auto' : 480,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Skeleton variant="rectangular" height={200} />
        <CardContent sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="80%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: isMobile ? 'auto' : 480,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.shadows[12],
          '& .property-image': {
            transform: 'scale(1.05)',
          },
        },
        '&:active': {
          transform: 'translateY(-4px)',
        },
      }}
      onClick={() => onViewDetails?.(property)}
    >
      {/* Property Image */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        {!imageLoaded && (
          <Skeleton variant="rectangular" height={200} animation="wave" />
        )}
        <CardMedia
          component="img"
          height="200"
          image={imageError ? '/placeholder-property.jpg' : property.imageUrl}
          alt={`${property.address}, ${property.city}`}
          className="property-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          sx={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            display: imageLoaded ? 'block' : 'none',
          }}
        />
        
        {/* Status Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1,
          }}
        >
          <Chip
            label={getStatusLabel(property.status)}
            color={getStatusColor(property.status)}
            size="small"
            sx={{
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              backgroundColor: `${theme.palette[getStatusColor(property.status)].main}20`,
            }}
          />
        </Box>

        {/* Property Class Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1,
          }}
        >
          <Chip
            label={`Class ${property.class}`}
            size="small"
            sx={{
              fontWeight: 700,
              backgroundColor: getClassColor(property.class),
              color: '#000',
              backdropFilter: 'blur(8px)',
            }}
          />
        </Box>

        {/* Action Buttons Overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            gap: 1,
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist?.(property);
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            {isInWatchlist ? (
              <Favorite sx={{ color: theme.palette.error.main }} />
            ) : (
              <FavoriteBorder />
            )}
          </IconButton>
          
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(property);
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Share />
          </IconButton>
        </Box>
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: isMobile ? 2 : 3 }}>
        {/* Price and Time Remaining */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant={isMobile ? 'h6' : 'h5'} component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {formatCurrency(property.price)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: property.status === 'ending_soon' ? 'warning.main' : 'text.secondary',
              }}
            >
              {timeRemaining}
            </Typography>
          </Box>
        </Box>

        {/* Address */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationOn sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {property.address}, {property.city}, {property.state}
          </Typography>
        </Box>

        {/* Property Details */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Home sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {property.bedrooms}bd • {property.bathrooms}ba
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {property.sqft.toLocaleString()} sqft
          </Typography>
        </Box>

        {/* Year Built */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalendarToday sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Built {property.yearBuilt}
          </Typography>
        </Box>

        {/* Rental Yield */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
              {formatPercentage(property.rentalYield)} APY
            </Typography>
          </Box>
          
          {property.sharePrice && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoney sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {formatCurrency(property.sharePrice)}/share
              </Typography>
            </Box>
          )}
        </Box>

        {/* Shares Available */}
        {property.availableShares && property.totalShares && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Shares Available
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {property.availableShares} / {property.totalShares}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 6,
                backgroundColor: 'grey.300',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${((property.totalShares - property.availableShares) / property.totalShares) * 100}%`,
                  height: '100%',
                  backgroundColor: 'primary.main',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        )}

        {/* Action Button */}
        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            size={isMobile ? 'medium' : 'large'}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.(property);
            }}
            disabled={property.status === 'sold_out'}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: isMobile ? 1 : 1.5,
              background: property.status === 'sold_out' 
                ? 'grey.400' 
                : 'linear-gradient(45deg, #00d4ff 30%, #0099cc 90%)',
              '&:hover': {
                background: property.status === 'sold_out' 
                  ? 'grey.400' 
                  : 'linear-gradient(45deg, #4dd8ff 30%, #00d4ff 90%)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            {property.status === 'sold_out' ? 'Sold Out' : 'View Details'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}