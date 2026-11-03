import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../lib/supabase';
import type { Transaction, Category, TransactionType } from '../lib/supabase';
import { formatINR, rupeesToPaise, monthRange } from '../lib/inr';

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
});

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState(MONTHS[0].value);
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');

  const [form, setForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [txRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, expense_categories(*)')
        .gte('date', monthRange(filterMonth).start)
        .lte('date', monthRange(filterMonth).end)
        .order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
    ]);
    if (txRes.error) { setError(txRes.error.message); }
    else { setTransactions(txRes.data as Transaction[]); }
    if (catRes.error) { setError(catRes.error.message); }
    else { setCategories(catRes.data as Category[]); }
    setLoading(false);
  }, [filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!form.amount || !form.description || !form.date) return;
    setSaving(true);
    const { error: err } = await supabase.from('transactions').insert({
      type: form.type,
      amount: rupeesToPaise(form.amount),
      description: form.description.trim(),
      category_id: form.category_id || null,
      date: form.date,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    setForm({ type: 'expense', amount: '', description: '', category_id: '', date: new Date().toISOString().slice(0, 10) });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">Transactions</Typography>
          <Typography variant="body2">Track your income and spending</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Transaction
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Month</InputLabel>
          <Select value={filterMonth} label="Month" onChange={(e) => setFilterMonth(e.target.value)}>
            {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={(_, v) => v && setFilterType(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="income">Income</ToggleButton>
          <ToggleButton value="expense">Expenses</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Chip
          label={`Income: ${formatINR(totalIncome)}`}
          sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
        />
        <Chip
          label={`Expenses: ${formatINR(totalExpenses)}`}
          sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 600 }}
        />
        <Chip
          label={`Balance: ${formatINR(totalIncome - totalExpenses)}`}
          sx={{
            bgcolor: totalIncome >= totalExpenses ? '#e3f2fd' : '#ffebee',
            color: totalIncome >= totalExpenses ? '#01579b' : '#c62828',
            fontWeight: 600,
          }}
        />
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">No transactions found for this period.</Typography>
            </Box>
          ) : (
            filtered.map((tx) => {
              const cat = tx.expense_categories || categories.find((c) => c.id === tx.category_id);
              return (
                <Box
                  key={tx.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: cat?.color ? `${cat.color}22` : '#f5f5f5',
                        border: `2px solid ${cat?.color || '#e0e0e0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat?.color || '#795548' }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>{tx.description}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Typography>
                        {cat && (
                          <Chip
                            label={cat.name}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${cat.color}22`, color: cat.color }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 700, color: tx.type === 'income' ? 'success.main' : 'error.main' }}
                    >
                      {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDelete(tx.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Transaction</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ToggleButtonGroup
            value={form.type}
            exclusive
            onChange={(_, v) => v && setForm((f) => ({ ...f, type: v, category_id: '' }))}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="income" sx={{ '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#2e7d32' } }}>
              Income
            </ToggleButton>
            <ToggleButton value="expense" sx={{ '&.Mui-selected': { bgcolor: '#ffebee', color: '#c62828' } }}>
              Expense
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Description"
            fullWidth
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount (₹)"
            fullWidth
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            sx={{ mb: 2 }}
            inputProps={{ min: 0.01, step: 0.01 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category_id}
              label="Category"
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              <MenuItem value="">None</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color }} />
                    {c.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            fullWidth
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !form.amount || !form.description}
          >
            {saving ? 'Saving...' : 'Add Transaction'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
