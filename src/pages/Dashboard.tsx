import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { Transaction, Category } from '../lib/supabase';
import { formatINR, paiseToRupees, currentMonth, monthLabel } from '../lib/inr';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface SummaryCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

interface MonthData {
  month: string;
  income: number;
  expenses: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM-dd');
    const [txRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, expense_categories(*)')
        .gte('date', sixMonthsAgo)
        .order('date', { ascending: false }),
      supabase.from('expense_categories').select('*'),
    ]);
    if (txRes.error) { setError(txRes.error.message); setLoading(false); return; }
    if (catRes.error) { setError(catRes.error.message); setLoading(false); return; }
    setTransactions(txRes.data as Transaction[]);
    setCategories(catRes.data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const thisMonth = currentMonth();
  const thisMonthTx = transactions.filter((t) => t.date.startsWith(thisMonth));
  const monthIncome = thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpenses = thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = monthIncome - monthExpenses;
  const totalSavings = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    - transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const summaryCards: SummaryCard[] = [
    { label: 'Monthly Income', value: monthIncome, icon: <TrendingUpIcon />, color: '#2e7d32', bg: '#e8f5e9' },
    { label: 'Monthly Expenses', value: monthExpenses, icon: <TrendingDownIcon />, color: '#c62828', bg: '#ffebee' },
    { label: 'Net Balance', value: balance, icon: <AccountBalanceWalletIcon />, color: balance >= 0 ? '#01579b' : '#c62828', bg: balance >= 0 ? '#e3f2fd' : '#ffebee' },
    { label: 'Total Savings', value: totalSavings, icon: <SavingsIcon />, color: '#e65100', bg: '#fff3e0' },
  ];

  // Last 6 months bar chart
  const months = Array.from({ length: 6 }, (_unused, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = format(startOfMonth(d), 'yyyy-MM-dd');
    const end = format(endOfMonth(d), 'yyyy-MM-dd');
    const tx = transactions.filter((t) => t.date >= start && t.date <= end);
    return {
      month: format(d, 'MMM yy'),
      income: paiseToRupees(tx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)),
      expenses: paiseToRupees(tx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)),
    } as MonthData;
  });

  // This month expenses by category pie chart
  const expenseTx = thisMonthTx.filter((t) => t.type === 'expense');
  const categoryMap = new Map<string, { name: string; color: string; total: number }>();
  expenseTx.forEach((t) => {
    const cat = t.expense_categories || categories.find((c) => c.id === t.category_id);
    const key = cat?.id || 'uncategorized';
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += t.amount;
    } else {
      categoryMap.set(key, { name: cat?.name || 'Other', color: cat?.color || '#795548', total: t.amount });
    }
  });
  const pieData = Array.from(categoryMap.values())
    .map((v) => ({ name: v.name, value: paiseToRupees(v.total), color: v.color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const recentTx = transactions.slice(0, 5);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress color="primary" />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2">{monthLabel(thisMonth)} — Overview</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  <Box sx={{ bgcolor: card.bg, color: card.color, p: 1, borderRadius: 2, display: 'flex' }}>
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: card.color }}>
                  {formatINR(Math.abs(card.value))}
                </Typography>
                {card.label === 'Net Balance' && card.value < 0 && (
                  <Chip label="Over budget" color="error" size="small" sx={{ mt: 1 }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Income vs Expenses (Last 6 Months)</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v * 100, true)} />
                  <Tooltip formatter={(value: unknown) => formatINR((value as number) * 100)} />
                  <Bar dataKey="income" name="Income" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#c62828" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Spending by Category</Typography>
              {pieData.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
                  <Typography color="text.secondary">No expenses this month</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatINR((value as number) * 100)} />
                    <Legend iconType="circle" iconSize={10} formatter={(v) => v} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recent Transactions</Typography>
          {recentTx.length === 0 ? (
            <Typography color="text.secondary">No transactions yet. Add one from the Transactions page.</Typography>
          ) : (
            <Box>
              {recentTx.map((tx) => {
                const cat = tx.expense_categories || categories.find((c) => c.id === tx.category_id);
                return (
                  <Box
                    key={tx.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: cat?.color || '#795548',
                          flexShrink: 0,
                        }}
                      />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{tx.description}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cat?.name || 'Other'} · {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, color: tx.type === 'income' ? 'success.main' : 'error.main' }}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
