import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Toolbar,
  AppBar,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Button,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import MenuIcon from '@mui/icons-material/Menu';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/useAuth';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, key: 'dashboard' },
  { label: 'Transactions', icon: <ReceiptLongIcon />, key: 'transactions' },
  { label: 'Budgets', icon: <AccountBalanceWalletIcon />, key: 'budgets' },
  { label: 'Savings', icon: <SavingsIcon />, key: 'savings' },
];

interface LayoutProps {
  page: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function Layout({ page, onNavigate, children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
          <CurrencyRupeeIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.2, color: 'text.primary', fontWeight: 700 }}>
            PaisaTrack
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Personal Finance
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = page === item.key;
          return (
            <ListItemButton
              key={item.key}
              selected={active}
              onClick={() => {
                onNavigate(item.key);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'white' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
          {user?.email}
        </Typography>
        <Button
          startIcon={<LogoutIcon />}
          onClick={signOut}
          sx={{ mt: 1, px: 0, minHeight: 44, color: 'text.secondary' }}
        >
          Sign out
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          All amounts in Indian Rupees (₹)
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <CurrencyRupeeIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6" color="text.primary">
              PaisaTrack
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 3 },
          pt: { xs: 9, md: 3 },
          bgcolor: 'background.default',
          minHeight: '100vh',
          maxWidth: '100%',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
