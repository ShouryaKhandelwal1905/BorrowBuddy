-- ========================================================
-- BorrowBuddy Complete Supabase Database Setup Script
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wrikxgglpabvtcsvopwc/sql
-- ========================================================

-- 1. Profiles Table (User Accounts)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  locality text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Items Table (Items listed by neighbours to borrow)
create table if not exists public.items (
  id bigint primary key,
  o int default 0,
  name text not null,
  e text default '📦',
  occ text[],
  max int default 3,
  d text,
  bk jsonb default '[]'::jsonb,
  img text,
  p int default 100,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Loans Table (Borrowing requests and active loans)
create table if not exists public.loans (
  id bigint primary key,
  item bigint,
  s int,
  e int,
  ret int,
  occ text,
  amt int,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Reviews Table (Borrower reviews and ratings)
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  item bigint,
  n text,
  r int default 5,
  t text,
  d int,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.loans enable row level security;
alter table public.reviews enable row level security;

-- 6. Create permissive access policies so your frontend can read & write smoothly
drop policy if exists "Allow all access to profiles" on public.profiles;
create policy "Allow all access to profiles" on public.profiles for all using (true) with check (true);

drop policy if exists "Allow all on items" on public.items;
create policy "Allow all on items" on public.items for all using (true) with check (true);

drop policy if exists "Allow all on loans" on public.loans;
create policy "Allow all on loans" on public.loans for all using (true) with check (true);

drop policy if exists "Allow all on reviews" on public.reviews;
create policy "Allow all on reviews" on public.reviews for all using (true) with check (true);

-- 7. Automatically create a profile when a new user signs up via Auth / Google / GitHub
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, locality)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'locality', 'My Society')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    locality = coalesce(excluded.locality, public.profiles.locality),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
