BEGIN;

-- ==============================================================================
-- 1. ADICIONAR COLUNAS RETROCOMPATÍVEIS NA TABELA PRODUCTS
-- ==============================================================================
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_path text,
ADD COLUMN IF NOT EXISTS description text;

-- ==============================================================================
-- 2. GARANTIR A EXISTÊNCIA DO BUCKET PÚBLICO 'products'
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  307200, -- 300 KB limite estrito no bucket
  ARRAY['image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 307200,
  allowed_mime_types = ARRAY['image/webp'];

-- ==============================================================================
-- 3. POLÍTICAS DE RLS DO STORAGE (BASEADAS EM profiles.role = 'admin')
-- ==============================================================================

-- Leitura: aberta a todos (clientes anônimos e usuários do sistema)
DROP POLICY IF EXISTS "Imagens de produtos são públicas para leitura" ON storage.objects;
CREATE POLICY "Imagens de produtos são públicas para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Inserção: apenas administradores autenticados
DROP POLICY IF EXISTS "Apenas admins podem enviar imagens de produtos" ON storage.objects;
CREATE POLICY "Apenas admins podem enviar imagens de produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Atualização: apenas administradores autenticados
DROP POLICY IF EXISTS "Apenas admins podem atualizar imagens de produtos" ON storage.objects;
CREATE POLICY "Apenas admins podem atualizar imagens de produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Exclusão: apenas administradores autenticados
DROP POLICY IF EXISTS "Apenas admins podem excluir imagens de produtos" ON storage.objects;
CREATE POLICY "Apenas admins podem excluir imagens de produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

COMMIT;
