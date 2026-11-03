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
  LinearProgress,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../lib/supabase';
import type { Budget, Category } from '../lib/supabase';
import { formatINR, rupeesToPaise, monthLabel, monthRange } from '../lib/inr';

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
});

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);

  const [form, setForm] = useState({ category_id: '', monthly_limit: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [budgetRes, catRes, txRes] = await Promise.all([
      supabase.from('budgets').select('*, expense_categories(*)').eq('month', selectedMonth),
      supabase.from('expense_categories').select('*').order('name'),
      supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('type', 'expense')
        .gte('date', monthRange(selectedMonth).start)
        .lte('date', monthRange(selectedMonth).end),
    ]);
    if (budgetRes.error) { setError(budgetRes.error.message); }
    else { setBudgets(budgetRes.data as Budget[]); }
    if (catRes.error) { setError(catRes.error.message); }
    else { setCategories(catRes.data as Category[]); }
    if (txRes.data) {
      const map: Record<string, number> = {};
      txRes.data.forEach((t) => {
        if (t.category_id) map[t.category_id] = (map[t.category_id] || 0) + t.amount;
      });
      setSpentMap(map);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpen = (budget?: Budget) => {
    if (budget) {
      setEditBudget(budget);
      setForm({ category_id: budget.category_id, monthly_limit: String(budget.monthly_limit / 100) });
    } else {
      setEditBudget(null);
      setForm({ category_id: '', monthly_limit: '' });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.category_id || !form.monthly_limit) return;
    setSaving(true);
    if (editBudget) {
      const { error: err } = await supabase.from('budgets').update({
        monthly_limit: rupeesToPaise(form.monthly_limit),
      }).eq('id', editBudget.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('budgets').insert({
        category_id: form.category_id,
        monthly_limit: rupeesToPaise(form.monthly_limit),
        month: selectedMonth,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('budgets').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const usedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = editBudget
    ? categories
    : categories.filter((c) => !usedCategoryIds.has(c.id));

  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category_id] || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">Budgets</Typography>
          <Typography variant="body2">Set and track monthly spending limits</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Set Budget
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FormControl size="small" sx={{ mb: 3, minWidth: 220 }}>
        <InputLabel>Month</InputLabel>
        <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
          {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </Select>
      </FormControl>

      {budgets.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Budget</Typography>
                <Typography variant="h6" color="primary.main">{formatINR(totalBudget)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Spent</Typography>
                <Typography variant="h6" color="error.main">{formatINR(totalSpent)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Remaining</Typography>
                <Typography variant="h6" sx={{ color: totalBudget - totalSpent >= 0 ? 'success.main' : 'error.main' }}>
                  {formatINR(totalBudget - totalSpent)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No budgets set for {monthLabel(selectedMonth)}.
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Set Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {budgets.map((budget) => {
            const cat = budget.expense_categories || categories.find((c) => c.id === budget.category_id);
            const spent = spentMap[budget.category_id] || 0;
            const pct = Math.min((spent / budget.monthly_limit) * 100, 100);
            const over = spent > budget.monthly_limit;
            return (
              <Grid key={budget.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat?.color || '#795548' }} />
                        <Typography variant="subtitle1">{cat?.name || 'Category'}</Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpen(budget)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(budget.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Spent: <strong style={{ color: over ? '#c62828' : 'inherit' }}>{formatINR(spent)}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Limit: <strong>{formatINR(budget.monthly_limit)}</strong>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#f5f5f5',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: over ? 'error.main' : pct > 80 ? 'warning.main' : cat?.color || 'primary.main',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Chip
                        label={over ? 'Over budget!' : `${pct.toFixed(0)}% used`}
                        size="small"
                        color={over ? 'error' : pct > 80 ? 'warning' : 'default'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                      <Typography variant="caption" color={over ? 'error.main' : 'text.secondary'}>
                        {over ? `${formatINR(spent - budget.monthly_limit)} over` : `${formatINR(budget.monthly_limit - spent)} left`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editBudget ? 'Edit Budget' : 'Set Budget'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }} disabled={!!editBudget}>
            <InputLabel>Category</InputLabel>
            <Select
              value={form.category_id}
              label="Category"
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            >
              {(editBudget ? categories : availableCategories).map((c) => (
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
            label="Monthly Limit (₹)"
            fullWidth
            type="number"
            value={form.monthly_limit}
            onChange={(e) => setForm((f) => ({ ...f, monthly_limit: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            inputProps={{ min: 1, step: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !form.category_id || !form.monthly_limit}
          >
            {saving ? 'Saving...' : editBudget ? 'Update' : 'Set Budget'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
