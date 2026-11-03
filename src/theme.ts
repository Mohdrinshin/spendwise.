import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d6e3f',
      light: '#1a9557',
      dark: '#084d2c',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e85d04',
      light: '#f48c42',
      dark: '#a03e02',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    error: {
      main: '#c62828',
      light: '#ef5350',
      dark: '#8e0000',
    },
    warning: {
      main: '#e65100',
      light: '#ff9800',
      dark: '#bf360c',
    },
    info: {
      main: '#01579b',
      light: '#0288d1',
      dark: '#002f6c',
    },
    background: {
      default: '#f5f6fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a2e',
      secondary: '#5a6175',
    },
    divider: '#e8eaf0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400, color: '#5a6175' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e8eaf0',
          boxShadow: 'none',
        },
      },
    },
  },
});

export default theme;
