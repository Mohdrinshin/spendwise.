/*
# Personal Finance App Schema (India, INR)

1. New Tables
   - `income_sources`: Monthly income entries (salary, freelance, etc.)
     - id, name, amount (paise as integer), frequency, created_at
   - `expense_categories`: User-defined expense categories
     - id, name, color, icon, created_at
   - `transactions`: Individual income/expense transactions
     - id, type ('income'/'expense'), amount, description, category_id, date, created_at
   - `budgets`: Monthly budget limits per category
     - id, category_id, monthly_limit, month (YYYY-MM), created_at

2. Security
   - RLS enabled on all tables with anon + authenticated policies (no sign-in required)
   - Full CRUD for anon and authenticated roles
*/

CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#1976d2',
  icon text NOT NULL DEFAULT 'Category',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON expense_categories TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_categories" ON expense_categories;
CREATE POLICY "anon_select_categories" ON expense_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON expense_categories;
CREATE POLICY "anon_insert_categories" ON expense_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON expense_categories;
CREATE POLICY "anon_update_categories" ON expense_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON expense_categories;
CREATE POLICY "anon_delete_categories" ON expense_categories FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount bigint NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  monthly_limit bigint NOT NULL CHECK (monthly_limit > 0),
  month text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, month)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_budgets" ON budgets;
CREATE POLICY "anon_select_budgets" ON budgets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_budgets" ON budgets;
CREATE POLICY "anon_insert_budgets" ON budgets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_budgets" ON budgets;
CREATE POLICY "anon_update_budgets" ON budgets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_budgets" ON budgets;
CREATE POLICY "anon_delete_budgets" ON budgets FOR DELETE TO anon, authenticated USING (true);

-- Seed default categories
INSERT INTO expense_categories (id, name, color, icon) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Food & Dining', '#f44336', 'Restaurant'),
  ('11111111-1111-1111-1111-111111111102', 'Transport', '#ff9800', 'DirectionsCar'),
  ('11111111-1111-1111-1111-111111111103', 'Housing', '#9c27b0', 'Home'),
  ('11111111-1111-1111-1111-111111111104', 'Healthcare', '#e91e63', 'LocalHospital'),
  ('11111111-1111-1111-1111-111111111105', 'Entertainment', '#00bcd4', 'Movie'),
  ('11111111-1111-1111-1111-111111111106', 'Shopping', '#ff5722', 'ShoppingCart'),
  ('11111111-1111-1111-1111-111111111107', 'Education', '#3f51b5', 'School'),
  ('11111111-1111-1111-1111-111111111108', 'Utilities', '#607d8b', 'Power'),
  ('11111111-1111-1111-1111-111111111109', 'Salary', '#4caf50', 'Work'),
  ('11111111-1111-1111-1111-111111111110', 'Freelance', '#8bc34a', 'Laptop'),
  ('11111111-1111-1111-1111-111111111111', 'Investment', '#009688', 'TrendingUp'),
  ('11111111-1111-1111-1111-111111111112', 'Other', '#795548', 'MoreHoriz')
ON CONFLICT (id) DO NOTHING;
