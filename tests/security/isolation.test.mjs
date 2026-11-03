import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');

const FOOD_CATEGORY_ID = '11111111-1111-1111-1111-111111111101';
const PASSWORD = 'IsolationTest!2026';
const stamp = Date.now();
const now = new Date();
const today = now.toISOString().slice(0, 10);
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

function makeClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function createUser(label) {
  const client = makeClient();
  const email = `isolation-${label}-${stamp}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD });
  if (error) throw new Error(`sign up ${label} failed: ${error.message}`);
  if (!data.session) {
    throw new Error(`sign up ${label} returned no session; email confirmation must be disabled for these tests`);
  }
  return { client, id: data.user.id };
}

const anon = makeClient();
const A = {};
const B = {};

async function readOwnTransaction(user, id) {
  const { data } = await user.client.from('transactions').select('id, amount, description').eq('id', id);
  return data?.[0] ?? null;
}

describe('multi-user data isolation', () => {
  before(async () => {
    Object.assign(A, await createUser('a'));
    Object.assign(B, await createUser('b'));

    const aTx = await A.client.from('transactions').insert({
      type: 'income', amount: 15000000, description: 'A salary', date: today,
    }).select().single();
    if (aTx.error) throw new Error(`seed A transaction: ${aTx.error.message}`);
    A.tx = aTx.data;

    const bTx = await B.client.from('transactions').insert({
      type: 'expense', amount: 650000, description: 'B private expense', date: today,
    }).select().single();
    if (bTx.error) throw new Error(`seed B transaction: ${bTx.error.message}`);
    B.tx = bTx.data;

    const bBudget = await B.client.from('budgets').insert({
      category_id: FOOD_CATEGORY_ID, monthly_limit: 1000000, month,
    }).select().single();
    if (bBudget.error) throw new Error(`seed B budget: ${bBudget.error.message}`);
    B.budget = bBudget.data;

    const bCat = await B.client.from('expense_categories').insert({
      name: `B private ${stamp}`, color: '#000000', icon: 'Star',
    }).select().single();
    if (bCat.error) throw new Error(`seed B category: ${bCat.error.message}`);
    B.category = bCat.data;
  });

  after(async () => {
    if (B.client) {
      await B.client.from('transactions').delete().eq('user_id', B.id);
      await B.client.from('budgets').delete().eq('user_id', B.id);
      await B.client.from('expense_categories').delete().eq('user_id', B.id);
    }
    if (A.client) {
      await A.client.from('transactions').delete().eq('user_id', A.id);
      await A.client.from('budgets').delete().eq('user_id', A.id);
      await A.client.from('expense_categories').delete().eq('user_id', A.id);
    }
  });

  test('new records are owned by the signed-in user', () => {
    assert.equal(A.tx.user_id, A.id);
    assert.equal(B.tx.user_id, B.id);
    assert.equal(B.budget.user_id, B.id);
    assert.equal(B.category.user_id, B.id);
  });

  test('user A cannot view user B transactions by ID', async () => {
    const { data, error } = await A.client.from('transactions').select('*').eq('id', B.tx.id);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test('user A transaction list (history, dashboard, exports) contains only A rows', async () => {
    const { data, error } = await A.client.from('transactions').select('*');
    assert.equal(error, null);
    assert.ok(data.length >= 1);
    assert.ok(data.every((row) => row.user_id === A.id));
    assert.ok(!data.some((row) => row.id === B.tx.id));
  });

  test('user A cannot view user B budgets or custom categories', async () => {
    const budgets = await A.client.from('budgets').select('*').eq('id', B.budget.id);
    const categories = await A.client.from('expense_categories').select('*').eq('id', B.category.id);
    assert.equal(budgets.error, null);
    assert.equal(categories.error, null);
    assert.equal(budgets.data.length, 0);
    assert.equal(categories.data.length, 0);
  });

  test('user A cannot edit user B salary or transaction', async () => {
    const { data, error } = await A.client.from('transactions')
      .update({ amount: 1 }).eq('id', B.tx.id).select();
    assert.equal(error, null);
    assert.equal(data.length, 0);
    const after = await readOwnTransaction(B, B.tx.id);
    assert.equal(after.amount, 650000);
  });

  test('user A cannot delete user B transactions', async () => {
    const { data, error } = await A.client.from('transactions')
      .delete().eq('id', B.tx.id).select();
    assert.equal(error, null);
    assert.equal(data.length, 0);
    assert.notEqual(await readOwnTransaction(B, B.tx.id), null);
  });

  test('user A cannot modify user B budget by changing its ID', async () => {
    const { data, error } = await A.client.from('budgets')
      .update({ monthly_limit: 1 }).eq('id', B.budget.id).select();
    assert.equal(error, null);
    assert.equal(data.length, 0);
    const { data: check } = await B.client.from('budgets').select('monthly_limit').eq('id', B.budget.id);
    assert.equal(check[0].monthly_limit, 1000000);
  });

  test('user A cannot delete user B budget', async () => {
    const { data, error } = await A.client.from('budgets')
      .delete().eq('id', B.budget.id).select();
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test('user A cannot insert a record owned by user B (impersonation)', async () => {
    const { error } = await A.client.from('transactions').insert({
      user_id: B.id, type: 'expense', amount: 100, description: 'forged', date: today,
    });
    assert.ok(error, 'insert with another user ID must be rejected');
  });

  test('user A cannot reassign their own transaction to user B', async () => {
    await A.client.from('transactions').update({ user_id: B.id }).eq('id', A.tx.id);
    const { data } = await A.client.from('transactions').select('user_id').eq('id', A.tx.id);
    assert.equal(data.length, 1);
    assert.equal(data[0].user_id, A.id);
  });

  test('user A cannot attach a transaction to user B custom category', async () => {
    const { error } = await A.client.from('transactions').insert({
      type: 'expense', amount: 100, description: 'linked', date: today, category_id: B.category.id,
    });
    assert.ok(error, 'category owned by another user must be rejected');
  });

  test('user A cannot set a budget against user B custom category', async () => {
    const { error } = await A.client.from('budgets').insert({
      category_id: B.category.id, monthly_limit: 100, month,
    });
    assert.ok(error, 'category owned by another user must be rejected');
  });

  test('user A cannot alter built-in categories', async () => {
    const { data, error } = await A.client.from('expense_categories')
      .update({ name: 'Hacked' }).eq('id', FOOD_CATEGORY_ID).select();
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test('user A can still read built-in categories', async () => {
    const { data, error } = await A.client.from('expense_categories').select('id').eq('id', FOOD_CATEGORY_ID);
    assert.equal(error, null);
    assert.equal(data.length, 1);
  });

  test('unauthenticated visitors cannot read financial data', async () => {
    const tx = await anon.from('transactions').select('*');
    const budgets = await anon.from('budgets').select('*');
    assert.ok(tx.error || tx.data.length === 0);
    assert.ok(budgets.error || budgets.data.length === 0);
  });

  test('unauthenticated visitors cannot insert records', async () => {
    const { error } = await anon.from('transactions').insert({
      user_id: B.id, type: 'expense', amount: 100, description: 'anon', date: today,
    });
    assert.ok(error, 'anonymous insert must be rejected');
  });

  test('unauthenticated visitors cannot delete or edit records', async () => {
    const del = await anon.from('transactions').delete().eq('id', B.tx.id).select();
    const upd = await anon.from('transactions').update({ amount: 1 }).eq('id', B.tx.id).select();
    assert.ok(del.error || del.data.length === 0);
    assert.ok(upd.error || upd.data.length === 0);
  });

  test('after sign-out, user A loses access to their own data', async () => {
    await A.client.auth.signOut({ scope: 'local' });
    const { data, error } = await A.client.from('transactions').select('*');
    assert.ok(error || data.length === 0);
  });

  test('user B data is unchanged after all unauthorized attempts', async () => {
    const { data: tx } = await B.client.from('transactions').select('id, amount, description').eq('id', B.tx.id);
    const { data: budget } = await B.client.from('budgets').select('id, monthly_limit').eq('id', B.budget.id);
    const { data: cat } = await B.client.from('expense_categories').select('id, name').eq('id', B.category.id);
    assert.deepEqual(tx, [{ id: B.tx.id, amount: 650000, description: 'B private expense' }]);
    assert.deepEqual(budget, [{ id: B.budget.id, monthly_limit: 1000000 }]);
    assert.equal(cat.length, 1);
  });
});
