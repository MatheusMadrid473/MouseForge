# MouseForge PDV

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

MouseForge PDV é uma aplicação full stack para gestão operacional de pequenos e médios mercados. O projeto combina frente de caixa, cadastro de produtos, controle de estoque, clientes, usuários, relatórios e uma base fiscal evolutiva para NFC-e/NF-e.

> Projeto em evolução, criado para demonstrar arquitetura, produto e execução técnica em um cenário realista de varejo.

---

## Visão Geral

O objetivo do MouseForge é entregar uma base enxuta e extensível para operações de ponto de venda, mantendo baixo custo inicial de infraestrutura e uma experiência web simples para operadores e administradores.

Principais frentes do produto:

- Autenticação com JWT e perfis de acesso.
- Gestão de usuários por empresa e filial.
- Cadastro e importação de produtos por CSV/planilha.
- Controle de estoque com movimentações.
- Registro de clientes e vendas.
- Dashboard operacional com indicadores.
- Configuração fiscal inicial por provedor.
- Termos e aceite para rastreabilidade.
- Exportação de dados operacionais.
- Base PWA com manifesto e service worker.

---

## Demonstração Técnica

Este repositório foi preparado para exibição pública sem credenciais reais versionadas. Os arquivos `.env.example` usam apenas placeholders e o backend exige configuração explícita de `JWT_SECRET` e `DATABASE_URL`.

Pontos de engenharia presentes no projeto:

- Monorepo separado em `api` e `web`.
- API HTTP com Fastify, TypeScript, Zod e Drizzle ORM.
- Frontend React com Vite, Tailwind CSS e TanStack Query.
- Banco PostgreSQL, com suporte direto a Supabase.
- Hash de senhas com `scrypt`.
- Escopo multiempresa e multifilial.
- Auditoria de ações operacionais.
- Versionamento semântico automatizado por hook local.

---

## Stack

### Backend

| Tecnologia | Uso |
| --- | --- |
| Node.js | Runtime da API |
| Fastify | Servidor HTTP |
| TypeScript | Tipagem estática |
| Drizzle ORM | Modelagem e acesso ao PostgreSQL |
| PostgreSQL/Supabase | Banco de dados |
| Zod | Validação de entradas |
| JWT | Sessões e rotas protegidas |
| Crypto scrypt | Hash de senhas |

### Frontend

| Tecnologia | Uso |
| --- | --- |
| React 18 | Interface web |
| Vite | Build e ambiente de desenvolvimento |
| TypeScript | Tipagem do frontend |
| Tailwind CSS | Estilização responsiva |
| TanStack Query | Cache e sincronização com a API |
| React Hook Form | Formulários |
| Sonner | Notificações |
| Lucide React | Ícones |

---

## Funcionalidades

- Login por e-mail ou usuário.
- Criação automática de superusuário via ambiente.
- Perfis `admin`, `manager` e `cashier`.
- Gestão de empresas, filiais e colaboradores.
- Redefinição de senha por administrador.
- Cadastro, edição, importação e exportação de produtos.
- Controle de clientes.
- Movimentações de estoque.
- Venda com baixa automática de estoque.
- Geração de documento fiscal pendente por venda.
- Configuração fiscal por empresa ou filial.
- Simulação de emissão fiscal em homologação.
- Relatórios por período.
- Dashboard com vendas, ticket médio, estoque crítico e pendências fiscais.
- Termos de uso e aceite obrigatório.
- Tema claro/escuro.

---

## Estrutura do Repositório

```text
MouseForge/
|-- api/
|   |-- src/
|   |   |-- auth/
|   |   |-- bootstrap/
|   |   |-- db/
|   |   |-- routes/
|   |   `-- server.ts
|   |-- drizzle.config.ts
|   |-- .env.example
|   `-- package.json
|
|-- web/
|   |-- public/
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
|-- scripts/
|-- ROADMAP.md
|-- VERSION
`-- README.md
```

---

## Pré-requisitos

- Node.js 18 ou superior.
- npm.
- PostgreSQL local ou projeto Supabase.

---

## Configuração

### 1. API

```bash
cd api
npm install
cp .env.example .env
```

Edite `api/.env`:

```bash
DATABASE_URL=postgresql://postgres:[SENHA]@[HOST]:5432/postgres
JWT_SECRET=troque-por-um-segredo-longo-e-aleatorio
CORS_ORIGIN=http://localhost:5173
PORT=3333

SUPER_USER_NAME=Super Administrador
SUPER_USER_EMAIL=admin@mouseforge.local
SUPER_USER_USERNAME=admin
SUPER_USER_PASSWORD=troque-essa-senha
```

Depois aplique o schema e inicie a API:

```bash
npx drizzle-kit push
npm run dev
```

A API roda por padrão em:

```text
http://localhost:3333
```

### 2. Web

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Edite `web/.env` se a API estiver em outra URL:

```bash
VITE_API_URL=http://localhost:3333
```

O frontend roda por padrão em:

```text
http://localhost:5173
```

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

## Segurança

- Não versionar arquivos `.env`.
- Usar um `JWT_SECRET` longo, aleatório e diferente por ambiente.
- Trocar `SUPER_USER_PASSWORD` antes de qualquer deploy público.
- Configurar `CORS_ORIGIN` com domínios explícitos em produção.
- Manter credenciais fiscais, certificados e segredos fora do repositório.
- Revisar o histórico do Git antes de tornar o projeto público caso alguma credencial real já tenha sido commitada.

---

## Deploy

### Supabase

1. Crie um projeto PostgreSQL no Supabase.
2. Copie a connection string do banco.
3. Configure `DATABASE_URL` na API.
4. Rode `npx drizzle-kit push` para aplicar o schema.

### Vercel

1. Publique a pasta `web`.
2. Configure `VITE_API_URL` com a URL pública da API.
3. O arquivo `web/vercel.json` redireciona rotas internas para o app React.

---

## Roadmap

O roadmap técnico e de produto está documentado em [ROADMAP.md](./ROADMAP.md).

Itens planejados:

- Cadastro fiscal completo por produto.
- Fluxo avançado de abertura e fechamento de caixa.
- Integração real com provedores fiscais.
- Contingência fiscal.
- Relatórios gerenciais avançados.
- Fila offline e sincronização para uso como PWA.
- Testes automatizados de API e interface.

---

## Versionamento

O projeto usa versionamento semântico a partir de `VERSION`, sincronizado com `api`, `web` e constantes exibidas no sistema.

Regras do hook local:

- `feat:` incrementa versão minor.
- `fix:` incrementa versão patch.
- `BREAKING CHANGE` ou `!:` incrementa versão major.
- `chore:`, `docs:`, `refactor:` e similares não alteram versão.

Para ativar o hook:

```bash
git config core.hooksPath .githooks
```

Para sincronizar manualmente:

```bash
node scripts/update-version.cjs
```

---

## Status

Projeto em fase inicial funcional, com autenticação, gestão operacional, estoque, vendas, fiscal em homologação e interface administrativa prontos para evolução.
