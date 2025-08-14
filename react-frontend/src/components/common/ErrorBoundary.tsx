import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Collapse,
  IconButton,
  useTheme
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  ExpandMore,
  ExpandLess,
  BugReport,
  Home
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          showDetails={this.state.showDetails}
          onToggleDetails={this.toggleDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

function ErrorFallback({ 
  error, 
  errorInfo, 
  onRetry, 
  showDetails, 
  onToggleDetails 
}: ErrorFallbackProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3,
        textAlign: 'center'
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <ErrorOutline 
            sx={{ 
              fontSize: 80, 
              color: 'error.main', 
              mb: 2 
            }} 
          />
          
          <Typography variant="h4" gutterBottom>
            Oops! Something went wrong
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            We apologize for the inconvenience. An unexpected error has occurred.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
              size="large"
            >
              Try Again
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Home />}
              onClick={() => window.location.href = '/'}
              size="large"
            >
              Go Home
            </Button>
          </Box>

          {/* Error Details */}
          <Box sx={{ textAlign: 'left' }}>
            <Button
              startIcon={<BugReport />}
              endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
              onClick={onToggleDetails}
              size="small"
              color="inherit"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>
            
            <Collapse in={showDetails}>
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom>
                  Error Details
                </Typography>
                
                {error && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Error Message:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        p: 1,
                        borderRadius: 1,
                        mt: 0.5
                      }}
                    >
                      {error.message}
                    </Typography>
                  </Box>
                )}
                
                {error?.stack && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Stack Trace:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        p: 1,
                        borderRadius: 1,
                        mt: 0.5,
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto',
                        maxHeight: 200
                      }}
                    >
                      {error.stack}
                    </Typography>
                  </Box>
                )}
                
                {errorInfo?.componentStack && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Component Stack:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        p: 1,
                        borderRadius: 1,
                        mt: 0.5,
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto',
                        maxHeight: 200
                      }}
                    >
                      {errorInfo.componentStack}
                    </Typography>
                  </Box>
                )}
              </Alert>
            </Collapse>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ErrorBoundary;