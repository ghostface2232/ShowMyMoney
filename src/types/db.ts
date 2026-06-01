// Shared TypeScript types mapping 1:1 to DB tables. uuid as string, timestamps as ISO string.

export type Account = {
  id: string;
  pin_hash: string;
  display_name: string;
  first_used_at: string;
  updated_at: string;
};

export type CategoryGroup = {
  id: string;
  account_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  group_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Snapshot = {
  id: string;
  account_id: string;
  year_month: number;
  note: string | null;
  created_at: string;
};

export type Entry = {
  id: string;
  snapshot_id: string;
  category_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  account_id: string;
  label: string;
  target_amount: number;
  target_date: string;
  created_at: string;
};
