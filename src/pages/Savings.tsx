import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  InputAdornment,
  Alert,
  CircularProgress,
  Slider,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatINR, rupeesToPaise, currentMonth, monthRange } from '../lib/inr';

interface ProjectionPoint {
  month: string;
  savings: number;
  withReturns: number;
}

function generateProjection(monthlySavings: number, annualReturnPct: number, months: number): ProjectionPoint[] {
  const monthlyRate = annualReturnPct / 100 / 12;
  let corpus = 0;
  const points: ProjectionPoint[] = [];
  for (let i = 1; i <= months; i++) {
    const simpleSavings = monthlySavings * i;
    corpus = (corpus + monthlySavings) * (1 + monthlyRate);
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    points.push({ month: label, savings: simpleSavings, withReturns: Math.round(corpus) });
  }
  return points;
}

export default function Savings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoIncome, setAutoIncome] = useState(0);
  const [autoExpenses, setAutoExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [annualReturn, setAnnualReturn] = useState(12);
  const [projectionYears, setProjectionYears] = useState(5);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const month = currentMonth();
    const { data, error: err } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', monthRange(month).start)
      .lte('date', monthRange(month).end);
    if (err) { setError(err.message); setLoading(false); return; }
    const income = (data || []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = (data || []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    setAutoIncome(income);
    setAutoExpenses(expenses);
    setMonthlyIncome(String(income / 100));
    setMonthlyExpenses(String(expenses / 100));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const incomeVal = rupeesToPaise(monthlyIncome || '0');
  const expensesVal = rupeesToPaise(monthlyExpenses || '0');
  const monthlySavings = Math.max(0, incomeVal - expensesVal);
  const yearlySavings = monthlySavings * 12;
  const projectionMonths = projectionYears * 12;
  const projectionData = generateProjection(monthlySavings / 100, annualReturn, projectionMonths);
  const finalCorpus = projectionData[projectionData.length - 1]?.withReturns || 0;
  const finalSimple = projectionData[projectionData.length - 1]?.savings || 0;

  const savingsPct = incomeVal > 0 ? (monthlySavings / incomeVal) * 100 : 0;

  // Milestone labels every year
  const milestoneData = projectionData.filter((_, i) => (i + 1) % 12 === 0);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Savings Planner</Typography>
        <Typography variant="body2">Project your savings growth over time</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Monthly Figures</Typography>
              {(autoIncome > 0 || autoExpenses > 0) && (
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Pre-filled from this month's transactions. Adjust as needed.
                </Alert>
              )}
              <TextField
                label="Monthly Income (₹)"
                fullWidth
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 100 }}
              />
              <TextField
                label="Monthly Expenses (₹)"
                fullWidth
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: 100 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Investment Assumptions</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Expected Annual Return: <strong>{annualReturn}%</strong> (e.g. Mutual Fund / SIP)
              </Typography>
              <Slider
                value={annualReturn}
                onChange={(_, v) => setAnnualReturn(v as number)}
                min={0}
                max={24}
                step={0.5}
                marks={[{ value: 7, label: '7%' }, { value: 12, label: '12%' }, { value: 18, label: '18%' }]}
                sx={{ mb: 3 }}
                color="primary"
              />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Projection Period: <strong>{projectionYears} {projectionYears === 1 ? 'year' : 'years'}</strong>
              </Typography>
              <Slider
                value={projectionYears}
                onChange={(_, v) => setProjectionYears(v as number)}
                min={1}
                max={30}
                step={1}
                marks={[{ value: 5, label: '5y' }, { value: 10, label: '10y' }, { value: 20, label: '20y' }, { value: 30, label: '30y' }]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Monthly Savings', value: monthlySavings, sub: `${savingsPct.toFixed(1)}% of income`, color: '#0d6e3f', bg: '#e6f4ec' },
          { label: 'Yearly Savings', value: yearlySavings, sub: 'Without returns', color: '#01579b', bg: '#e3f2fd' },
          { label: `Corpus in ${projectionYears}y (Simple)`, value: finalSimple * 100, sub: 'No returns', color: '#e65100', bg: '#fff3e0' },
          { label: `Corpus in ${projectionYears}y (With ${annualReturn}% p.a.)`, value: finalCorpus * 100, sub: `₹${(((finalCorpus * 100 - finalSimple * 100) / 100)).toLocaleString('en-IN')} extra from returns`, color: '#2e7d32', bg: '#e8f5e9' },
        ].map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{card.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: card.color }}>
                  {formatINR(card.value)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{card.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Savings Growth Projection</Typography>
          {monthlySavings === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">Enter your monthly income and expenses to see projections.</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projectionData.filter((_, i) => i % 3 === 2 || i === 0)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatINR(v * 100, true)} />
                <Tooltip formatter={(v: unknown) => formatINR((v as number) * 100)} />
                <Line
                  type="monotone"
                  dataKey="savings"
                  name="Simple Savings"
                  stroke="#01579b"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="withReturns"
                  name={`With ${annualReturn}% Returns`}
                  stroke="#2e7d32"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {milestoneData.length > 0 && monthlySavings > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Year-by-Year Milestones</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
                {milestoneData.map((point, i) => (
                  <Box
                    key={i}
                    sx={{
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: i % 2 === 0 ? '#f5f6fa' : '#fff',
                      border: '1px solid',
                      borderColor: 'divider',
                      minWidth: 140,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">Year {i + 1}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                      {formatINR(point.withReturns * 100, true)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Simple: {formatINR(point.savings * 100, true)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
