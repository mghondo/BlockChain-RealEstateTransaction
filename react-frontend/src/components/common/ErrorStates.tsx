import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  useTheme
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  Home,
  SearchOff,
  WifiOff,
  Warning,
  BugReport,
  CloudOff,
  Security,
  Block
} from '@mui/icons-material';

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  showHomeButton?: boolean;
  icon?: React.ReactNode;
  severity?: 'error' | 'warning' | 'info';
}

// Generic error state component
export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  actionLabel = 'Try Again',
  onAction,
  showHomeButton = true,
  icon,
  severity = 'error'
}: ErrorStateProps) {
  const theme = useTheme();

  const getIcon = () => {
    if (icon) return icon;
    return <ErrorOutline sx={{ fontSize: 80, color: `${severity}.main`, mb: 2 }} />;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      {getIcon()}
      
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500 }}>
        {message}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {onAction && (
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={onAction}
            size="large"
          >
            {actionLabel}
          </Button>
        )}
        
        {showHomeButton && (
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={() => window.location.href = '/'}
            size="large"
          >
            Go Home
          </Button>
        )}
      </Box>
    </Box>
  );
}

// Network/connection error
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={<WifiOff sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />}
      title="Connection Problem"
      message="Unable to connect to the server. Please check your internet connection and try again."
      actionLabel="Retry Connection"
      onAction={onRetry}
    />
  );
}

// No results found
export function NoResultsFound({ 
  onClearFilters,
  query,
  hasFilters = false 
}: { 
  onClearFilters?: () => void;
  query?: string;
  hasFilters?: boolean;
}) {
  return (
    <ErrorState
      icon={<SearchOff sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />}
      title="No Results Found"
      message={
        query 
          ? `No results found for "${query}". Try adjusting your search terms.`
          : hasFilters
          ? "No properties match your current filters. Try adjusting your criteria."
          : "No properties are currently available."
      }
      actionLabel={hasFilters ? "Clear Filters" : "Refresh"}
      onAction={onClearFilters}
      showHomeButton={false}
      severity="info"
    />
  );
}

// Firebase/Database error
export function DatabaseError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={<CloudOff sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />}
      title="Database Connection Error"
      message="Unable to connect to the database. This might be a temporary issue. Please try again in a moment."
      actionLabel="Retry"
      onAction={onRetry}
    />
  );
}

// Permission denied error
export function PermissionError() {
  return (
    <ErrorState
      icon={<Security sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />}
      title="Access Denied"
      message="You don't have permission to access this resource. Please check your credentials or contact support."
      actionLabel="Go Back"
      onAction={() => window.history.back()}
      severity="warning"
    />
  );
}

// Property not found error
export function PropertyNotFound({ propertyId }: { propertyId?: string }) {
  return (
    <ErrorState
      icon={<Block sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />}
      title="Property Not Found"
      message={
        propertyId 
          ? `Property with ID "${propertyId}" could not be found. It may have been removed or the link is incorrect.`
          : "The requested property could not be found."
      }
      actionLabel="Browse Properties"
      onAction={() => window.location.href = '/properties'}
    />
  );
}

// Rate limit error
export function RateLimitError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={<Warning sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />}
      title="Too Many Requests"
      message="You've made too many requests in a short time. Please wait a moment before trying again."
      actionLabel="Try Again"
      onAction={onRetry}
      severity="warning"
    />
  );
}

// Service unavailable error
export function ServiceUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={<CloudOff sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />}
      title="Service Temporarily Unavailable"
      message="The service is temporarily unavailable due to maintenance or high traffic. Please try again later."
      actionLabel="Retry"
      onAction={onRetry}
    />
  );
}

// Development/debug error
export function DebugError({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry?: () => void; 
}) {
  if (process.env.NODE_ENV !== 'development') {
    return <ErrorState onAction={onRetry} />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Development Error</AlertTitle>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
          {error.message}
        </Typography>
      </Alert>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Stack Trace
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              maxHeight: 400,
              fontSize: '0.75rem'
            }}
          >
            {error.stack}
          </Typography>
          
          {onRetry && (
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Inline error for form fields
export function InlineError({ 
  message, 
  onDismiss 
}: { 
  message: string; 
  onDismiss?: () => void; 
}) {
  return (
    <Alert 
      severity="error" 
      onClose={onDismiss}
      sx={{ mt: 1 }}
    >
      {message}
    </Alert>
  );
}

// Toast-style error notification
export function ErrorToast({ 
  message, 
  onClose,
  severity = 'error',
  autoHideDuration = 6000
}: { 
  message: string; 
  onClose: () => void;
  severity?: 'error' | 'warning' | 'info';
  autoHideDuration?: number;
}) {
  React.useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onClose]);

  return (
    <Alert 
      severity={severity} 
      onClose={onClose}
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        minWidth: 300,
        maxWidth: 500
      }}
    >
      {message}
    </Alert>
  );
}

// Error boundary fallback
export function ErrorBoundaryFallback({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry: () => void; 
}) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Application Error</AlertTitle>
        Something unexpected happened. The application encountered an error and needs to reload.
      </Alert>
      
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={onRetry}
        >
          Reload Application
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<BugReport />}
          onClick={() => {
            console.error('Error details:', error);
            alert('Error details have been logged to the console.');
          }}
        >
          Show Error Details
        </Button>
      </Box>
      
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Development Info
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              maxHeight: 300
            }}
          >
            {error.stack}
          </Typography>
        </Box>
      )}
    </Box>
  );
}