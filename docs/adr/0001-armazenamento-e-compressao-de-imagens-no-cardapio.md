# Armazenamento e Compressão Client-Side de Imagens no Cardápio

## Contexto e Decisão

Para viabilizar a exibição de fotos no cardápio mantendo o projeto no plano gratuito do Supabase (1 GB de Storage e 10 GB de transferência mensal), decidimos não armazenar binários ou Base64 no banco de dados e realizar a compressão/redimensionamento das fotos no navegador do administrador antes do upload.

O arquivo original selecionado é validado no navegador para não ultrapassar 5 MB. Em seguida, é convertido via Canvas para WebP (máximo 800×800px, qualidade ~80%), gerando um arquivo final de 40 KB a 70 KB, que também é validado para não exceder o teto estrito de 300 KB.

O bucket público `products` no Supabase Storage é configurado para aceitar **exclusivamente** o tipo MIME `image/webp` com limite físico de 300 KB (`file_size_limit = 307200`). O arquivo é enviado para `items/<uuid>.webp`, persistindo no banco de dados apenas o caminho relativo (`image_path`).

A renderização no cliente utiliza a tag nativa `<img>` com `loading="lazy"`, `decoding="async"`, `alt` descritivo e espaço reservado (aspect ratio/dimensões mínimas para prevenir Layout Shift / CLS). Não utilizamos o componente `<Image />` do Next.js porque as imagens já nascem padronizadas e otimizadas em WebP no cliente e são servidas diretamente pela borda/CDN do Supabase Storage, dispensando transformações intermediárias na Vercel (que no plano Hobby possui cota de 5.000 transformações mensais).

A autorização de upload, atualização e exclusão no Storage segue a mesma regra de autorização do projeto (`public.profiles.role = 'admin'`).

A substituição de fotos segue o padrão de transação compensatória:
1. Upload da nova imagem otimizada para `items/<novo-uuid>.webp`.
2. Atualização do `image_path` na tabela `products`.
3. Se o update tiver sucesso, exclusão do arquivo antigo no Storage.
4. Se o update falhar, remoção imediata do arquivo novo recém-enviado para evitar arquivos órfãos.

## Opções Consideradas e Trade-offs

- **URL Completa vs. Caminho Relativo (`image_path`)**: Optamos pelo caminho relativo no banco para evitar acoplamento a domínios ou URLs de ambiente específicas do Supabase, facilitando eventuais migrações de bucket ou proxies de CDN.
- **Base64 / Binário no PostgreSQL**: Rejeitado por inchar o banco de dados (cota de 500 MB no plano gratuito), degradar backups e aumentar o tempo de resposta das consultas.
- **Supabase Image Transformations (na nuvem)**: Rejeitado porque o redimensionamento dinâmico do Supabase é exclusivo do plano Pro ($25/mês).
- **Upload de fotos originais sem compressão**: Rejeitado pois fotos de celular (3 MB a 8 MB) esgotariam a cota de 1 GB com poucas dezenas de itens e consumiriam a cota mensal de tráfego rapidamente.
- **`<img>` nativo vs `next/image`**: Optamos por `<img>` nativo com dimensões reservadas e carregamento preguiçoso, pois os arquivos já chegam comprimidos e dimensionados do admin, aproveitando o cache direto do CDN do Supabase sem intermediários.
