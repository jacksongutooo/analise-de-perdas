# Análise de Perdas — análise documental de perdas em apostas online

Site responsivo (mobile first) para receber, organizar e analisar solicitações de pessoas que tiveram
perdas em apostas esportivas ou cassino online. O cliente responde um formulário curto em 7 etapas,
envia os históricos das plataformas e acompanha o caso por protocolo. A equipe trabalha em um painel
administrativo com leitura automática dos documentos, conferência de valores e solicitação de documentos.

> O site **não promete recuperação de valores** e não usa números, depoimentos ou contadores fictícios.

## Stack

- **Next.js 15** (App Router, Server Actions, Route Handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens em `src/app/globals.css`), fonte IBM Plex Sans
- **PostgreSQL** + **Prisma 6** (migrations versionadas em `prisma/migrations`)
- Armazenamento privado de arquivos: pasta local (desenvolvimento) ou **S3 compatível** (AWS S3, Cloudflare R2, Backblaze B2, MinIO)
- Leitura de documentos: `papaparse` (CSV), `xlsx` (XLSX), `unpdf` (PDF com texto)
- Sem dependência de serviços de autenticação: senhas com scrypt (nativo do Node) e sessões no banco

## Prévia sem servidor

`previa/index.html` é uma prévia navegável do site com dados fictícios: abre com dois cliques no navegador
(precisa de internet só para carregar estilos e fonte). Ela usa os mesmos componentes desta versão do projeto, com
um "servidor simulado" no próprio navegador, e serve para apresentar o fluxo a clientes. Não substitui o sistema:
nada é enviado nem guardado fora do navegador. Painel na prévia: `demo@example.com` / `demonstracao-2026`.

## Rodando localmente

Pré-requisitos: Node.js 20.9+ e Docker (ou um PostgreSQL próprio).

### Instalação automática

```bash
npm run setup        # Linux e macOS
npm run setup:win    # Windows (PowerShell)
```

O script instala as dependências, cria o `.env` com segredos aleatórios, sobe o PostgreSQL no Docker
(quando o `DATABASE_URL` aponta para `localhost`), aplica as migrations e oferece criar o primeiro acesso
da equipe. Depois é só rodar `npm run dev`.

### Instalação manual

```bash
npm install
docker compose up -d            # sobe o PostgreSQL local
cp .env.example .env            # ajuste AUTH_SECRET (openssl rand -base64 48)
npx prisma migrate deploy       # cria as tabelas
npm run admin:create -- --email voce@empresa.com.br --name "Seu Nome"
npm run dev                     # http://localhost:3000
```

Painel da equipe: `http://localhost:3000/admin`.

### Modo demonstração (dados fictícios)

```bash
# no .env: DEMO_MODE="true"
npm run db:seed
npm run dev
```

O seed cria 7 casos fictícios (protocolos `DEMO-100001` a `DEMO-100007`) em todos os status, com
documentos CSV gerados, uma divergência (declarado R$ 30.000,00 × identificado R$ 18.500,00) e um pedido
de documentos adicionais. Acesso: `demo@example.com` / `demonstracao-2026` (ou `DEMO_ADMIN_PASSWORD`).

Com `DEMO_MODE=true` o site exibe a faixa **DEMO MODE** e passa a enxergar **somente** dados de
demonstração; com `DEMO_MODE=false`, somente dados reais. Os dois conjuntos nunca aparecem juntos, e os
acessos de demonstração não entram no painel real. O seed se recusa a rodar em produção.

## Deploy na Vercel

1. Crie um PostgreSQL gerenciado (Neon, Supabase, RDS...). Use a URL com pooling em `DATABASE_URL` e a
   conexão direta em `DIRECT_URL`.
2. Crie um bucket **privado** (sem acesso público) no S3/R2/B2 e uma chave com permissão de leitura,
   escrita e exclusão apenas nesse bucket. Configure `STORAGE_DRIVER=s3` e as variáveis `S3_*`.
   Na Vercel o armazenamento local não funciona (o sistema recusa essa configuração).
3. Cadastre as variáveis de `.env.example` no projeto da Vercel, incluindo `AUTH_SECRET` e `CRON_SECRET`
   fortes, `NEXT_PUBLIC_SITE_URL` com o domínio final e os dados da empresa.
4. O comando de build `vercel-build` já executa `prisma migrate deploy`.
5. Crie o primeiro acesso rodando `npm run admin:create` localmente apontando para o banco de produção.
6. `vercel.json` agenda a limpeza diária (`/api/cron/cleanup`), que apaga rascunhos abandonados e seus
   arquivos, sessões vencidas e registros de acesso antigos.

**Limite de upload:** na Vercel cada requisição tem limite de 4,5 MB, por isso `MAX_UPLOAD_MB=4`.
Fotos maiores são reduzidas no próprio navegador antes do envio. Em servidor próprio o limite pode subir.

## Fluxo do cliente

- `/` — página inicial curta, com o que ter em mãos.
- `/analise` — formulário em 7 etapas, com barra de progresso, “Voltar”, salvamento automático no navegador
  (“✓ Informações salvas”) e retomada de onde parou. Após a etapa 7 há os dados de contato e a revisão
  “Confira sua solicitação”.
- `/analise/recebida` — protocolo `ANL-XXXXXX` e prazo máximo estimado.
- `/acompanhar` — acesso com protocolo + e-mail: status, linha do tempo, valores e prazo.
- `/acompanhar/documentos` — envio de documentação adicional quando a equipe solicitar.

## Os três valores (nunca se misturam)

| Valor | Origem | Quem vê |
|---|---|---|
| **Declarado** | Depósitos − saques − saldo informados pelo cliente (negativo vira zero e é sinalizado) | Cliente e equipe |
| **Identificado** | Leitura automática dos documentos, sempre marcada como “Extraído automaticamente — necessita validação”, ou valor conferido pela equipe | Equipe; o cliente só vê depois de conferido |
| **Validado** | Definido **somente** manualmente pela equipe | Cliente e equipe, com o aviso de que não representa valor a ser recuperado |

Divergências relevantes (a partir de R$ 100 e 2% do declarado) aparecem no caso como “Divergência encontrada”.

## Status

`submitted` (Solicitação recebida) · `documents_received` (Documentos recebidos) · `under_review` (Em análise) ·
`additional_documents` (Documentação adicional necessária) · `eligible` (Caso com possibilidade de prosseguimento) ·
`not_eligible` (Elementos insuficientes para prosseguir) · `completed` (Análise concluída).

## Leitura automática dos documentos

`src/lib/extraction/` separa leitores (CSV, XLSX, PDF) das regras de classificação:

- identifica colunas de data, valor, tipo, status e saldo em planilhas;
- soma apenas depósitos e saques concluídos (ignora apostas, bônus, estornos, cancelados, recusados e pendentes);
- aponta período coberto, histórico incompleto (menos de 12 meses), plataforma diferente da informada,
  arquivo repetido em outro caso e movimentações repetidas entre arquivos do mesmo caso;
- PDFs precisam ter texto selecionável; **imagens (JPG/PNG) vão para conferência manual**.

Para ler imagens e PDFs digitalizados, conecte um serviço de OCR em `extractFromBuffer`
(`src/lib/extraction/process.ts`). A leitura automática nunca define o valor validado.

## LGPD no painel

Na página de cada caso, a seção **Dados pessoais (LGPD)** atende pedidos do titular (art. 18):

- **Exportar dados (JSON):** respostas, valores, consentimentos, andamento e lista de documentos. Notas internas
  e registros de conferência da equipe não entram na exportação; os arquivos podem ser entregues pelo botão Visualizar.
- **Excluir definitivamente** (somente perfil `admin`): apaga o caso, as respostas, os valores, as notas e os
  arquivos do armazenamento, após digitar o protocolo para confirmar. Os registros de acesso são mantidos pelo prazo legal.

Toda exportação e exclusão fica registrada.

## Segurança e privacidade

- Documentos em armazenamento privado, com nome aleatório; visualização só pelo painel, via link assinado
  de 5 minutos, com registro de cada acesso.
- Validação do conteúdo real dos arquivos (assinatura), bloqueio de executáveis, de planilhas com macros e
  de arquivos com extensão trocada; limite de tamanho e de quantidade por caso.
- Senhas com scrypt, sessões administrativas no banco (12 h), cookies `httpOnly`, limite de tentativas de
  login e de consulta por protocolo, verificação de origem nos envios.
- Registro do compromisso voluntário (aceite, data, IP e navegador) e do consentimento LGPD.
- Cabeçalhos de segurança e CSP em produção (`next.config.ts`); áreas privadas com `noindex`.
- O site nunca pede senhas, códigos SMS ou códigos de autenticação.

## Testes

```bash
npm test
```

Cobrem formatação de valores, cálculo da perda, validação do formulário no servidor, regras de divergência e de
andamento, senhas, validação do conteúdo dos arquivos e a leitura automática de CSV, XLSX e PDF.

## Antes de publicar

- [ ] Revisar **Política de Privacidade** e **Termos de Uso** com assessoria jurídica (os textos são modelos).
- [ ] Preencher razão social, CNPJ, e-mail de contato e do encarregado (DPO) no `.env`.
- [ ] Definir o nome/marca em `NEXT_PUBLIC_SITE_NAME` (a imagem de compartilhamento usa esse nome automaticamente).
- [ ] Trocar o ícone, se houver logotipo próprio: `src/app/icon.svg` e `src/app/apple-icon.png`.
- [ ] Usar `AUTH_SECRET` e `CRON_SECRET` fortes e exclusivos de produção.
- [ ] Confirmar que o bucket está privado e com backup/versionamento conforme a política de retenção.
- [ ] Testar a leitura automática com históricos reais de cada plataforma e ajustar as regras se necessário.
- [ ] A etapa 7 traz uma linha discreta sobre a autoexclusão oficial (gov.br/autoexclusaoapostas).
      Remova em `src/components/analysis/steps.tsx` se não fizer sentido para a operação.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run setup` / `npm run setup:win` | instalação local completa (Linux/macOS e Windows) |
| `npm run dev` | ambiente de desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run db:deploy` | aplica as migrations |
| `npm run db:migrate` | cria nova migration em desenvolvimento |
| `npm run db:seed` | dados fictícios (somente com `DEMO_MODE=true`) |
| `npm run admin:create -- --email ... --name ...` | cria ou atualiza acesso da equipe (`--role analyst` opcional) |
| `npm test` | testes automatizados |
| `npm run typecheck` | checagem de tipos |
