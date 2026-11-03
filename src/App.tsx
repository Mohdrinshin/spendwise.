import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import theme from './theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Savings from './pages/Savings';
import Auth from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';

type Page = 'dashboard' | 'transactions' | 'budgets' | 'savings';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session) return <Auth />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'budgets': return <Budgets />;
      case 'savings': return <Savings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout page={page} onNavigate={(p) => setPage(p as Page)}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
