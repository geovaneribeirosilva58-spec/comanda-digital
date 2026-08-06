-- Criar tipos
create type user_role as enum ('admin', 'garcom');
create type table_status as enum ('livre', 'aberta', 'fechada');
create type order_status as enum ('aberta', 'fechada');
create type order_item_status as enum ('pendente', 'entregue', 'cancelado');

-- 1. profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role user_role default 'garcom',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. tables
create table public.tables (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status table_status default 'livre',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. products
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  active boolean default true,
  observation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  table_id uuid references public.tables(id) on delete restrict,
  waiter_id uuid references public.profiles(id) on delete restrict,
  status order_status default 'aberta',
  total numeric(10,2) default 0,
  opened_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. order_items
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  note text,
  status order_item_status default 'pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security)

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Políticas Profiles
create policy "Perfis visíveis para todos os usuários logados"
  on public.profiles for select to authenticated using (true);

create policy "Apenas admins podem inserir perfis"
  on public.profiles for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Apenas admins podem atualizar perfis"
  on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Políticas Tables
create policy "Mesas visíveis para todos logados"
  on public.tables for select to authenticated using (true);

create policy "Admins podem fazer tudo em mesas"
  on public.tables for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Garçons podem atualizar status da mesa"
  on public.tables for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'garcom'));

-- Políticas Products
create policy "Produtos visíveis para todos logados"
  on public.products for select to authenticated using (true);

create policy "Apenas admins podem gerenciar produtos"
  on public.products for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Políticas Orders
create policy "Orders visíveis para todos logados"
  on public.orders for select to authenticated using (true);

create policy "Admins e Garçons podem inserir orders"
  on public.orders for insert to authenticated with check (true);

create policy "Admins e Garçons podem atualizar orders"
  on public.orders for update to authenticated using (true);

-- Políticas Order_items
create policy "Order_items visíveis para todos logados"
  on public.order_items for select to authenticated using (true);

create policy "Admins e Garçons podem inserir itens"
  on public.order_items for insert to authenticated with check (true);

create policy "Admins e Garçons podem atualizar itens"
  on public.order_items for update to authenticated using (true);

create policy "Garçons podem deletar itens (antes de enviado/confirmado) e admins podem gerenciar"
  on public.order_items for delete to authenticated using (true);

-- Functions & Triggers para sincronizar perfis
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  v_name text;
  v_role text;
begin
  v_name := 'Administrador';
  v_role := 'garcom';

  if new.raw_user_meta_data is not null then
    if new.raw_user_meta_data->>'name' is not null then
      v_name := new.raw_user_meta_data->>'name';
    end if;
    if new.raw_user_meta_data->>'role' is not null then
      v_role := new.raw_user_meta_data->>'role';
    end if;
  end if;

  insert into public.profiles (id, name, role)
  values (new.id, v_name, v_role::user_role);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Habilitar Realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.tables;
