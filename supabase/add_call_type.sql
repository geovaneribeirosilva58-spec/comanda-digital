-- Adiciona a coluna call_type à tabela table_calls
ALTER TABLE public.table_calls 
ADD COLUMN call_type text NOT NULL DEFAULT 'garcom';

-- call_type pode ser 'garcom' ou 'cerveja'
