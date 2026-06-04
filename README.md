# MouseForge PDV

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

> Frente de caixa web para pequenos e medios mercados, com base para emissao fiscal, controle operacional e evolucao futura como PWA.

---

## Sobre o Projeto

**MouseForge PDV** e uma aplicacao full stack criada para centralizar rotinas comuns de mercado em uma interface simples, rapida e preparada para crescer.

O objetivo e atender operacoes de pequeno e medio porte com:

- Login seguro para operadores e administradores
- Frente de caixa para vendas no balcao
- Controle de colaboradores por permissao
- Base para estoque, financeiro e fiscal
- Deploy acessivel usando Supabase e Vercel
- Preparacao para instalacao PWA no futuro

---

## Proposta de Valor

### Operacao de Caixa

Fluxo pensado para abertura de caixa, venda, formas de pagamento, sangria, suprimento e fechamento.

### Fiscal no Radar

Estrutura inicial voltada para evoluir ate NFC-e/NF-e, status de transmissao, contingencia e integracoes fiscais.

### Controle do Mercado

Base visual e tecnica para cadastro de produtos, codigos de barra, estoque, margens, reposicao e colaboradores.

### Baixo Custo

Projeto preparado para usar planos gratuitos no inicio: Supabase para PostgreSQL e Vercel para hospedagem web.

---

## Stack Tecnologica

### Backend

| Tecnologia | Uso |
| --- | --- |
| Node.js | Runtime da API |
| Fastify | Servidor HTTP leve e rapido |
| TypeScript | Tipagem da API |
| Drizzle ORM | Modelagem e acesso ao PostgreSQL |
| PostgreSQL/Supabase | Banco de dados |
| JWT | Autenticacao das rotas protegidas |
| Zod | Validacao de payloads |
| Crypto scrypt | Hash de senha sem depender de servico pago |

### Frontend

| Tecnologia | Uso |
| --- | --- |
| React 18 | Interface web |
| Vite | Build e desenvolvimento |
| TypeScript | Tipagem do frontend |
| Tailwind CSS | Estilizacao responsiva |
| TanStack Query | Cache e sincronizacao com a API |
| React Hook Form | Formularios |
| Sonner | Notificacoes |
| Lucide React | Icones |

---

## Funcionalidades Atuais

- Login com JWT
- Super usuario criado pelo ambiente ao iniciar a API
- Senhas armazenadas com hash `scrypt`
- Rotas de colaboradores protegidas
- Permissoes iniciais por cargo: `admin`, `manager`, `cashier`
- Lista e remocao de colaboradores
- Tela inicial com blocos para caixa, fiscal, estoque e financeiro
- Tema claro/escuro
- Configuracao inicial para deploy na Vercel
- Manifest e service worker basico para futura experiencia PWA

---

## Quick Start

### Pre-requisitos

- Node.js 18+
- Conta Supabase ou PostgreSQL local
- npm

### Backend

```bash
cd api
npm install
cp .env.example .env
npx drizzle-kit push
npm run dev
```

A API roda por padrao em:

```text
http://localhost:3333
```

### Frontend

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

O frontend roda por padrao em:

```text
http://localhost:5173
```

---

## Variaveis de Ambiente

### API

```bash
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
JWT_SECRET=troque-por-um-segredo-grande
CORS_ORIGIN=http://localhost:5173,https://seu-app.vercel.app
PORT=3333

SUPER_USER_NAME=Super Administrador
SUPER_USER_EMAIL=admin@mouseforge.local
SUPER_USER_USERNAME=admin
SUPER_USER_PASSWORD=troque-essa-senha
```

Quando `SUPER_USER_EMAIL` e `SUPER_USER_PASSWORD` estiverem definidos, a API cria ou atualiza esse usuario como `admin` ao iniciar.

### Web

```bash
VITE_API_URL=http://localhost:3333
```

---

## Arquitetura

```text
MouseForge/
|-- api/
|   |-- src/
|   |   |-- auth/
|   |   |   `-- password.ts
|   |   |-- bootstrap/
|   |   |   `-- super-user.ts
|   |   |-- db/
|   |   |   |-- index.ts
|   |   |   `-- schema.ts
|   |   |-- routes/
|   |   |   `-- users.ts
|   |   `-- server.ts
|   |-- drizzle.config.ts
|   |-- .env.example
|   `-- package.json
|
|-- web/
|   |-- public/
|   |   |-- manifest.webmanifest
|   |   `-- sw.js
|   |-- src/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- .env.example
|   |-- vercel.json
|   `-- package.json
|
`-- README.md
```

---

## Deploy

### Supabase

1. Crie um projeto no Supabase.
2. Copie a connection string PostgreSQL.
3. Configure `DATABASE_URL` na API.
4. Rode `npx drizzle-kit push` para aplicar o schema.

### Vercel

1. Publique a pasta `web`.
2. Configure `VITE_API_URL` com a URL publica da API.
3. O arquivo `web/vercel.json` ja redireciona rotas internas para o app React.

---

## Roadmap

O roadmap tecnico e de produto esta documentado em [ROADMAP.md](./ROADMAP.md).

- [ ] Cadastro completo de produtos
- [ ] Leitura por codigo de barras
- [ ] Carrinho e fluxo real de venda
- [ ] Abertura, sangria, suprimento e fechamento de caixa
- [ ] Controle de estoque e reposicao
- [ ] Formas de pagamento
- [ ] Emissao NFC-e/NF-e
- [ ] Contingencia fiscal
- [ ] Relatorios de vendas e margem
- [ ] Fila offline e sincronizacao para PWA

---

## Scripts

### API

```bash
npm run dev
npm run build
npm run start
```

### Web

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## Status

Projeto em fase inicial, com fundacao de autenticacao, deploy e interface operacional pronta para receber os fluxos principais de PDV.
