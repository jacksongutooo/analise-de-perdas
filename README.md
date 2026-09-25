# Análise de Perdas — análise documental de perdas em apostas online

Site responsivo (mobile first) para receber, organizar e analisar solicitações de pessoas que tiveram
perdas em apostas esportivas ou cassino online. O documento principal da análise é o **ComprovaBet anual
de 2025**, em nome do próprio solicitante: o cliente responde um formulário curto, informa o CPF, envia o
ComprovaBet, passa pela validação documental, paga a análise e acompanha o caso por protocolo. A equipe
trabalha em um painel administrativo com conferência do CPF, ações rápidas com confirmação, leitura
automática dos documentos, conferência de valores e solicitação de documentos complementares.

> O site **não promete recuperação, restituição ou indenização**, não se apresenta como serviço oficial
> ou governamental e não usa números, depoimentos ou contadores fictícios.

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

O seed cria 11 casos fictícios (protocolos `DEMO-100001` a `DEMO-100011`), um para cada etapa do fluxo.
Os ComprovaBets são PDFs gerados na hora, marcados como **DOCUMENTO FICTÍCIO**, com CPFs fictícios
(`000.000.0XX-XX`), e passam pela mesma leitura de CPF dos envios reais:

| Protocolo | Situação |
|---|---|
| `DEMO-100001` | Validação documental — CPF compatível (leitura automática) |
| `DEMO-100007` | Validação documental — CPF mascarado no documento: aguardando conferência documental |
| `DEMO-100008` | CPF divergente marcado pela equipe — documento em nome de outra pessoa |
| `DEMO-100003` | Complemento solicitado — ComprovaBet de outro ano (período incorreto) |
| `DEMO-100002` | Documento aprovado — aguardando pagamento |
| `DEMO-100009` | Condições aceitas e pagamento informado — em confirmação pela equipe |
| `DEMO-100010` | Pagamento confirmado — pronto para iniciar a análise |
| `DEMO-100004` | Análise em andamento, com complemento enviado durante a análise |
| `DEMO-100005` / `DEMO-100006` | Análise concluída (elementos insuficientes / concluída com valor validado) |
| `DEMO-100011` | Caso anterior ao ComprovaBet (sem CPF e sem etapa de pagamento) |

Acesso ao painel: `demo@example.com` / `demonstracao-2026` (ou `DEMO_ADMIN_PASSWORD`). Acompanhamento do
cliente: protocolo + e-mail da tabela exibida pelo seed.

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

Cadastro → CPF do solicitante → envio do ComprovaBet → validação documental → pagamento da análise →
análise pela equipe → acompanhamento pelo painel.

- `/` — página inicial curta, com o que ter em mãos (CPF, ComprovaBet, e-mail e WhatsApp).
- `/analise` — formulário em etapas curtas, com barra de progresso, “Voltar”, salvamento automático no navegador
  (“✓ Informações salvas”) e retomada de onde parou. A etapa 6 traz os dados do solicitante com o **CPF**
  (máscara `000.000.000-00` e dígitos verificadores); a etapa 7 é o envio do **ComprovaBet**; depois vêm o
  compromisso voluntário e a revisão “Confira sua solicitação”.
- `/analise/recebida` — protocolo `ANL-XXXXXX` e próximos passos.
- `/acompanhar` — acesso com protocolo + e-mail: etapa atual, linha do tempo em 6 etapas (Cadastro realizado ·
  ComprovaBet enviado · Validação documental · Pagamento confirmado · Análise em andamento · Análise concluída),
  situação do documento, valores e prazo.
- `/acompanhar/documentos` — envio de documentação complementar quando a equipe solicitar (inclusive um novo ComprovaBet).
- `/acompanhar/pagamento` — liberado depois da validação documental: aviso “Importante”, aceite obrigatório das
  condições (registrado com data, hora e versão) e, em seguida, o link de pagamento ou as instruções da equipe.

## ComprovaBet e CPF

- O CPF é validado no navegador e no servidor. Ele é registrado no rascunho **antes** do envio do documento
  e não fica salvo no navegador (só a versão mascarada, `***.***.***-25`). Depois do envio do ComprovaBet,
  o cliente não pode mais trocar o CPF; no painel, só o perfil `admin` corrige, com motivo, e apenas antes
  de a análise documental avançar.
- Arquivos aceitos: **PDF** (preferencial), JPG e PNG, até 5 por envio, com o limite de tamanho de `MAX_UPLOAD_MB`.
  O tipo é conferido pelo conteúdo real do arquivo (não pela extensão).
- **Conferência automática do CPF** (`src/lib/documents/comprovabet-check.ts`): só acontece quando o PDF tem
  texto selecionável. O texto é lido (até 10 páginas), os CPFs são normalizados (só os 11 dígitos) e comparados:
  - CPF cadastrado encontrado → **CPF compatível**;
  - outro CPF completo e válido, sem o cadastrado → **CPF divergente**: o envio é recusado com a mensagem
    “O CPF identificado no documento não corresponde ao CPF informado no cadastro. Confira os dados e envie o
    documento correto.” e o arquivo **não é armazenado**;
  - imagem, PDF digitalizado, PDF protegido, CPF mascarado ou ausente → **Aguardando conferência documental**
    (a equipe confere manualmente). O sistema nunca informa uma validação automática que não aconteceu.
- A leitura também anota os anos citados no documento, para a equipe conferir o período.
- **Nenhum documento é aprovado só por ter sido enviado**: a aprovação é sempre da equipe, e um ComprovaBet com
  CPF divergente não pode ser aprovado.

## Pagamento da análise

O projeto não traz um gateway de pagamento. Depois que a equipe aprova o ComprovaBet, o caso vai para
“Aguardando pagamento” e o cliente vê a etapa de pagamento no acompanhamento:

1. aviso “Importante”: o pagamento refere-se exclusivamente ao serviço de análise e não garante recuperação,
   restituição, indenização ou recebimento de valores;
2. checkbox obrigatório de aceite das condições — o botão só funciona depois de marcado; o aceite é gravado em
   `service_agreements` (data e hora, versão dos termos, texto aceito, IP e navegador);
3. link de pagamento (`PAYMENT_URL`, opcional) ou aviso de que a equipe enviará as instruções, e o botão
   “Já fiz o pagamento” (status **Pagamento em confirmação**);
4. a equipe confere o recebimento e clica em **Confirmar pagamento** no painel. O prazo estimado da análise
   (`REVIEW_DAYS`) passa a contar a partir daí.

Para integrar um gateway, basta marcar o pagamento como confirmado (mesmos campos de `confirmPayment`) a partir
do webhook do provedor.

## Os três valores (nunca se misturam)

| Valor | Origem | Quem vê |
|---|---|---|
| **Declarado** | Depósitos − saques − saldo informados pelo cliente (negativo vira zero e é sinalizado) | Cliente e equipe |
| **Identificado** | Leitura automática dos documentos, sempre marcada como “Extraído automaticamente — necessita validação”, ou valor conferido pela equipe | Equipe; o cliente só vê depois de conferido |
| **Validado** | Definido **somente** manualmente pela equipe | Cliente e equipe, com o aviso de que não representa valor a ser recuperado |

Divergências relevantes (a partir de R$ 100 e 2% do declarado) aparecem no caso como “Divergência encontrada”.

## Status

**Caso:** `submitted` (Solicitação recebida) · `documents_received` (Validação documental) ·
`additional_documents` (Documentação complementar necessária) · `awaiting_payment` (Aguardando pagamento) ·
`payment_confirmed` (Pagamento confirmado) · `under_review` (Análise em andamento) ·
`eligible` (Caso com possibilidade de prosseguimento) · `not_eligible` (Elementos insuficientes para prosseguir) ·
`completed` (Análise concluída).

**Documento:** Aguardando análise · Documento em análise · Documento aprovado · CPF divergente ·
Documento inconsistente · Documento inválido · Documento ilegível · Documentação complementar necessária ·
Aguardando conferência manual · Possível duplicidade.

**Conferência do CPF (equipe):** Aguardando conferência documental · CPF compatível · CPF divergente · CPF conferido pela equipe.

**Pagamento:** Pagamento pendente · Pagamento em confirmação · Pagamento confirmado · Não se aplica (casos anteriores
ao ComprovaBet, que seguem sem a etapa de pagamento).

**Ações rápidas no painel** (todas com diálogo de confirmação): Aprovar documento · CPF divergente · Solicitar
complemento · Documento inválido · Confirmar pagamento · Iniciar análise · Concluir análise. Nas ações de problema,
a equipe escolhe os motivos e escreve a orientação que aparece para o cliente.

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
- Registro do compromisso voluntário (aceite, data, IP e navegador), do consentimento LGPD e do aceite das
  condições do serviço antes do pagamento.
- CPF tratado como dado pessoal: mascarado nas listas, no acompanhamento e nas respostas da API; o número completo
  só aparece no painel autorizado, sob demanda (“Mostrar”), e cada visualização é registrada. O CPF nunca é
  gravado nos registros de acesso. Documento com CPF de outra pessoa é recusado sem ser armazenado.
- Cabeçalhos de segurança e CSP em produção (`next.config.ts`); áreas privadas com `noindex`.
- O site nunca pede senhas, códigos SMS ou códigos de autenticação.

## Testes

```bash
npm test
```

Cobrem formatação de valores, cálculo da perda, validação do formulário no servidor, CPF (dígitos verificadores,
máscaras, busca no texto e conferência de PDFs com CPF igual, divergente, mascarado ou ausente), linha do tempo
em 6 etapas, regras de divergência e de andamento, senhas, validação do conteúdo dos arquivos e a leitura
automática de CSV, XLSX e PDF.

## Antes de publicar

- [ ] Revisar **Política de Privacidade** e **Termos de Uso** com assessoria jurídica (os textos são modelos).
- [ ] Preencher razão social, CNPJ, e-mail de contato e do encarregado (DPO) no `.env`.
- [ ] Definir o nome/marca em `NEXT_PUBLIC_SITE_NAME` (a imagem de compartilhamento usa esse nome automaticamente).
- [ ] Trocar o ícone, se houver logotipo próprio: `src/app/icon.svg` e `src/app/apple-icon.png`.
- [ ] Usar `AUTH_SECRET` e `CRON_SECRET` fortes e exclusivos de produção.
- [ ] Confirmar que o bucket está privado e com backup/versionamento conforme a política de retenção.
- [ ] Testar a leitura automática com históricos reais de cada plataforma e ajustar as regras se necessário.
- [ ] Testar a conferência do CPF com ComprovaBets reais (PDF com texto) e conferir `COMPROVABET_YEAR`.
- [ ] Definir o pagamento: `ANALYSIS_PRICE`, `PAYMENT_URL` (ou as instruções enviadas pela equipe) e revisar o texto
      das condições do serviço. Ao mudar esse texto, atualize `SERVICE_TERMS_VERSION` em `src/lib/comprovabet.ts`.
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
