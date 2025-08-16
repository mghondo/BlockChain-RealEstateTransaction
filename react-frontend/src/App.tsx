import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Web3Provider } from './contexts/Web3Context';
import NewHeader from './components/Header/NewHeader';
import PropertyList from './components/PropertyList/PropertyList';
import FracEstatePropertyList from './components/PropertyList/FracEstatePropertyList';
import SimplePropertyList from './components/PropertyList/SimplePropertyList';
import DebugPropertyList from './components/PropertyList/DebugPropertyList';
import BasicFirebaseTest from './components/PropertyList/BasicFirebaseTest';
import WorkingPropertyList from './components/PropertyList/WorkingPropertyList';
import MinimalTest from './components/PropertyList/MinimalTest';
import FinalPropertyList from './components/PropertyList/FinalPropertyList';
import LandingPage from './components/LandingPage/LandingPage';
import PropertyDetail from './components/PropertyDetail/PropertyDetail';
import FracEstatePropertyDetail from './components/PropertyDetail/FracEstatePropertyDetail';
import Dashboard from './components/Dashboard/Dashboard';
import Watchlist from './components/Watchlist/Watchlist';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initializeFracEstate } from './utils/initializeFracEstate';
import { GameEngine } from './components/GameEngine/GameEngine';

// Create dark theme matching the crypto aesthetic
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
      paper: 'rgba(20, 20, 30, 0.8)'
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
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontWeight: 600
    },
    h4: {
      fontWeight: 600
    },
    h5: {
      fontWeight: 500
    },
    h6: {
      fontWeight: 500
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          minHeight: '100vh'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(30, 30, 45, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          '&:hover': {
            border: '1px solid rgba(0, 212, 255, 0.3)'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500
        },
        contained: {
          background: 'linear-gradient(45deg, #00d4ff 30%, #0099cc 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #4dd8ff 30%, #00d4ff 90%)'
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    }
  }
});

function App() {
  // Initialize FracEstate on app load
  React.useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🏠 Initializing FracEstate...');
        await initializeFracEstate();
        console.log('✅ FracEstate initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize FracEstate:', error);
      }
    };
    
    initialize();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <Web3Provider>
          <GameEngine>
            <Router>
              <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <NewHeader />
                <Box component="main" sx={{ flexGrow: 1 }}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/properties" element={<FinalPropertyList />} />
                    <Route path="/properties/simple" element={<SimplePropertyList />} />
                    <Route path="/properties/full" element={<FracEstatePropertyList />} />
                    <Route path="/property/:id" element={<FracEstatePropertyDetail />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/* Legacy routes for backward compatibility */}
                    <Route path="/legacy/properties" element={<PropertyList />} />
                    <Route path="/legacy/property/:id" element={<PropertyDetail />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Box>
              </Box>
            </Router>
          </GameEngine>
        </Web3Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
