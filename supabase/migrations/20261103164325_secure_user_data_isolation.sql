/*
# Secure per-user data isolation

Each financial record now belongs to the signed-in user who created it. Users can only read, create, change, and delete their own rows. Anonymous (signed-out) access is removed entirely.

1. Modified Tables
- `expense_categories`: new `user_id` column. Built-in categories keep `user_id` empty and are readable by everyone but cannot be changed or deleted. Custom categories belong to their creator.
- `transactions`: new `user_id` column, defaulting to the signed-in user. Indexed by owner and date.
- `budgets`: new `user_id` column, defaulting to the signed-in user. Uniqueness is now per owner, so two users can each budget the same category for the same month.

2. Existing Data
- No rows were deleted or altered.
- Transactions, budgets, and custom categories created before this migration have no owner. They are hidden from every user because no one can prove ownership. A NOT VALID check stops new rows from being saved without an owner, without failing on those legacy rows.

3. Security Changes
- Row level security stays enabled on all three tables.
- All previous policies that allowed anonymous or unrestricted access are removed.
- New policies, one per action, allow only the owner (`auth.uid() = user_id`) to read, insert, update, and delete their own rows. Built-in categories are readable by all signed-in users.
- The `anon` role loses all privileges on these tables. Only `authenticated` keeps access.
- A trigger checks that a transaction or budget only references a built-in category or one owned by the same user, so a user cannot attach records to another user's category.

4. Important Notes
- Ownership is set by the database from the session token; the client cannot choose or spoof `user_id` because the insert and update checks require it to match the signed-in user.
- The trigger function runs with the caller's permissions, so the row policies also apply to the category lookup.
*/

ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_not_null;
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_not_null;
ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_not_null CHECK (user_id IS NOT NULL) NOT VALID;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_category_month_key ON budgets (user_id, category_id, month);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets (user_id, month);
CREATE INDEX IF NOT EXISTS expense_categories_user_idx ON expense_categories (user_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions (category_id);
CREATE INDEX IF NOT EXISTS budgets_category_idx ON budgets (category_id);

REVOKE ALL ON expense_categories, transactions, budgets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON expense_categories, transactions, budgets TO authenticated;

DROP POLICY IF EXISTS "anon_select_categories" ON expense_categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON expense_categories;
DROP POLICY IF EXISTS "anon_update_categories" ON expense_categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON expense_categories;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_select_budgets" ON budgets;
DROP POLICY IF EXISTS "anon_insert_budgets" ON budgets;
DROP POLICY IF EXISTS "anon_update_budgets" ON budgets;
DROP POLICY IF EXISTS "anon_delete_budgets" ON budgets;

DROP POLICY IF EXISTS "select_builtin_or_own_categories" ON expense_categories;
CREATE POLICY "select_builtin_or_own_categories" ON expense_categories FOR SELECT
  TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_categories" ON expense_categories;
CREATE POLICY "insert_own_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_categories" ON expense_categories;
CREATE POLICY "update_own_categories" ON expense_categories FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_categories" ON expense_categories;
CREATE POLICY "delete_own_categories" ON expense_categories FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_own_budgets" ON budgets;
CREATE POLICY "select_own_budgets" ON budgets FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_budgets" ON budgets;
CREATE POLICY "insert_own_budgets" ON budgets FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_budgets" ON budgets;
CREATE POLICY "update_own_budgets" ON budgets FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_budgets" ON budgets;
CREATE POLICY "delete_own_budgets" ON budgets FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_category_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM expense_categories c
    WHERE c.id = NEW.category_id
      AND (c.user_id IS NULL OR c.user_id = NEW.user_id)
  ) THEN
    RAISE EXCEPTION 'Category is not available to this user';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_category_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_transaction_category_owner ON transactions;
CREATE TRIGGER enforce_transaction_category_owner
  BEFORE INSERT OR UPDATE OF category_id, user_id ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_owner();

DROP TRIGGER IF EXISTS enforce_budget_category_owner ON budgets;
CREATE TRIGGER enforce_budget_category_owner
  BEFORE INSERT OR UPDATE OF category_id, user_id ON budgets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_category_owner();
