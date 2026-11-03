import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string | null;
  date: string;
  created_at: string;
  expense_categories?: Category;
}

export interface Budget {
  id: string;
  category_id: string;
  monthly_limit: number;
  month: string;
  created_at: string;
  expense_categories?: Category;
}
