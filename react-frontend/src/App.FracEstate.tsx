import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Web3Provider } from './contexts/Web3Context';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import Dashboard from './components/Dashboard/Dashboard';
import Watchlist from './components/Watchlist/Watchlist';
import FracEstatePropertyList from './components/PropertyList/FracEstatePropertyList';
import FracEstatePropertyDetail from './components/PropertyDetail/FracEstatePropertyDetail';
import ErrorBoundary from './components/common/ErrorBoundary';
import { propertyPoolManager } from './services/propertyPoolManager';

// Create responsive dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#4dd8ff',
      dark: '#0099cc'
    },
    secondary: {
      main: '#ff6b35',
      light: '#ff8563',
      dark: '#cc4a1f'
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(20, 20, 30, 0.9)'
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0'
    },
    success: {
      main: '#00ff88'
    },
    error: {
      main: '#ff4444'
    },
    warning: {
      main: '#ffaa00'
    },
    info: {
      main: '#00d4ff'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(2rem, 5vw, 3.5rem)'
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)'
    },
    h3: {
      fontWeight: 600,
      fontSize: 'clamp(1.5rem, 3vw, 2rem)'
    },
    h4: {
      fontWeight: 600,
      fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)'
    },
    h5: {
      fontWeight: 500,
      fontSize: 'clamp(1.1rem, 2vw, 1.5rem)'
    },
    h6: {
      fontWeight: 500,
      fontSize: 'clamp(1rem, 1.5vw, 1.25rem)'
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          minHeight: '100vh',
          backgroundAttachment: 'fixed'
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
        },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(30, 30, 45, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            border: '1px solid rgba(0, 212, 255, 0.3)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.1)',
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          }
        },
        contained: {
          background: 'linear-gradient(45deg, #00d4ff 30%, #0099cc 90%)',
          boxShadow: '0 4px 16px rgba(0, 212, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #4dd8ff 30%, #00d4ff 90%)',
            boxShadow: '0 8px 24px rgba(0, 212, 255, 0.4)',
          }
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.3)',
          '&:hover': {
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 212, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00d4ff',
              borderWidth: 2,
            }
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (min-width: 1920px)': {
            maxWidth: '1600px',
          }
        }
      }
    },
    MuiGrid: {
      styleOverrides: {
        container: {
          '--Grid-borderWidth': '1px',
          borderTop: 'var(--Grid-borderWidth) solid',
          borderLeft: 'var(--Grid-borderWidth) solid',
          borderColor: 'transparent',
        },
        item: {
          borderBottom: 'var(--Grid-borderWidth) solid',
          borderRight: 'var(--Grid-borderWidth) solid',
          borderColor: 'transparent',
        },
      },
    },
  }
});

function App() {
  // Initialize property pool manager on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Start the property pool manager
        await propertyPoolManager.start();
        console.log('FracEstate application initialized successfully');
      } catch (error) {
        console.error('Failed to initialize FracEstate application:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      propertyPoolManager.stop();
    };
  }, []);

  // Handle app errors
  const handleAppError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Application Error:', error, errorInfo);
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: errorReportingService.log(error, errorInfo);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ErrorBoundary onError={handleAppError}>
        <Web3Provider>
          <Router>
            <Box 
              sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background gradient overlay */}
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                  zIndex: -1,
                }}
              />
              
              {/* Header */}
              <Header />
              
              {/* Main Content */}
              <Box 
                component="main" 
                sx={{ 
                  flexGrow: 1,
                  position: 'relative',
                  zIndex: 1,
                  minHeight: 'calc(100vh - 64px)', // Subtract header height
                  '@media (max-width: 600px)': {
                    minHeight: 'calc(100vh - 56px)', // Mobile header height
                  }
                }}
              >
                <Routes>
                  {/* Landing Page */}
                  <Route path="/" element={<LandingPage />} />
                  
                  {/* Property Routes */}
                  <Route path="/properties" element={<FracEstatePropertyList />} />
                  <Route path="/property/:id" element={<FracEstatePropertyDetail />} />
                  
                  {/* User Routes */}
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Redirects for backward compatibility */}
                  <Route path="/property-list" element={<Navigate to="/properties" replace />} />
                  <Route path="/property-detail/:id" element={<Navigate to="/property/:id" replace />} />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Box>
              
              {/* Global floating elements could go here */}
            </Box>
          </Router>
        </Web3Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;