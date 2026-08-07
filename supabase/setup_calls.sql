-- Cria a tabela de chamados das mesas
CREATE TABLE public.table_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id uuid REFERENCES public.tables(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pendente', -- 'pendente' ou 'resolvido'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa RLS
ALTER TABLE public.table_calls ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita pelo admin/garçons logados
CREATE POLICY "Permitir select para usuários logados"
ON public.table_calls FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir update para usuários logados"
ON public.table_calls FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir insert para clientes anônimos"
ON public.table_calls FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Habilita Realtime para essa tabela
alter publication supabase_realtime add table public.table_calls;
