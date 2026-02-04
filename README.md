# CRM Pos-Obra - Assistencia Tecnica

![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06b6d4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/Licenca-Privado-red)

Sistema web para gestao de chamados de assistencia tecnica pos-obra, com acompanhamento de SLA, vistorias, materiais, notificacoes em tempo real e dashboard analitico. Monorepo com frontend React e backend Express, ambos em TypeScript.

---

## Funcionalidades

### Gestao de Chamados
- **Abertura e acompanhamento** de chamados com numero unico sequencial
- **Status**: Aberto, Em Andamento, Aguardando, Finalizado
- **Prioridade**: Baixa, Media, Alta, Urgente
- **Categorias**: Hidraulica, Eletrica, Pintura, Esquadrias, Impermeabilizacao, Estrutural, Outros
- **Tipo de imovel**: Residencial, Comercial
- **Dados do cliente**: nome, telefone, email, endereco da unidade
- **Historico completo** de alteracoes, comentarios e atribuicoes

### SLA (Acordo de Nivel de Servico)
- **Calculo automatico** de prazo por prioridade
- **Monitoramento** de chamados dentro e fora do SLA
- **Alertas** de proximidade de vencimento

### Vistorias
- Registro de vistoria vinculada ao chamado
- Data, horario de inicio/fim, tecnico responsavel
- Constatacoes tecnicas, causa e parecer

### Materiais
- Registro de materiais utilizados por chamado
- Quantidade, preco unitario e status de aprovacao

### Anexos
- Upload de arquivos (fotos, documentos) por chamado
- Rastreamento de usuario e data de envio

### Notificacoes em Tempo Real
- **Socket.IO** para notificacoes instantaneas
- **Tipos**: novo chamado, status alterado, atribuicao, comentario, alerta de SLA
- Marcacao de leitura individual

### Kanban
- Visualizacao de chamados em quadro Kanban
- Drag & drop entre colunas de status

### Relatorios & Exportacao
- **Dashboard** com metricas e graficos (Recharts)
- Exportacao em **PDF** (jsPDF) e **Excel** (xlsx)
- Estatisticas por status, prioridade, categoria e empreendimento

### Gestao Organizacional
- **Empreendimentos** com endereco e status ativo/inativo
- **Usuarios** com 3 papeis: Admin, Coordenador, Tecnico
- **Perfil de usuario** com avatar
- **Configuracoes** do sistema (chave-valor)
- **Tema escuro/claro** com customizacao

---

## Arquitetura

```
crm-pos-obra/
├── frontend/          # React 18 + Vite + Tailwind + Radix UI
├── backend/           # Express + TypeORM + SQLite (sql.js)
├── docker-compose.yml # Deploy com Docker
├── pnpm-workspace.yaml
└── package.json       # Scripts do monorepo
```

**Gerenciador de pacotes**: pnpm

---

## Pre-requisitos

- [Node.js](https://nodejs.org/) >= 20.x
- [pnpm](https://pnpm.io/) >= 8.x

## Instalacao

```bash
# Instalar todas as dependencias
pnpm install

# Popular dados iniciais (admin, empreendimentos)
pnpm seed
```

## Executando

```bash
# Frontend + Backend simultaneamente (recomendado)
pnpm dev

# Apenas frontend (http://localhost:3000)
pnpm dev:frontend

# Apenas backend (http://localhost:3333)
pnpm dev:backend
```

## Build & Deploy

```bash
# Build completo
pnpm build

# Build individual
pnpm --filter frontend build    # Gera dist/ estatico
pnpm --filter backend build     # Compila TypeScript para dist/

# Producao (backend)
pnpm start
```

## Testes

```bash
# Backend
pnpm --filter backend test

# Frontend
pnpm --filter frontend test

# Lint
pnpm lint
```

## Docker

```bash
# Build e executar com Docker Compose
docker-compose up --build

# Containers:
# - crm-posobra-backend  na porta 3333
# - crm-posobra-frontend na porta 80
```

---

## Frontend

### Estrutura

```
frontend/src/
├── components/
│   ├── ui/                  # Componentes Radix UI customizados
│   │   ├── Button, Input, Select, Dialog, Card, Tabs...
│   │   └── Badge, Tooltip, Dropdown, Skeleton
│   ├── chamados/            # ChamadoModal, tabs de Anexos, Historico,
│   │                          Materiais, Vistoria
│   ├── layouts/             # DashboardLayout
│   ├── NotificacoesDropdown.tsx
│   ├── ThemeCustomizer.tsx
│   └── ProtectedRoute.tsx
├── pages/                   # 10+ paginas
│   ├── LoginPage
│   ├── DashboardPage
│   ├── ChamadosPage / ChamadoFormPage / ChamadoDetalhesPage
│   ├── AssistenciaTecnicaPage
│   ├── EmpreendimentosPage
│   ├── TecnicosPage
│   ├── KanbanPage
│   ├── ProfilePage
│   └── ConfiguracoesPage
├── services/                # 8 servicos de API
│   ├── api.ts                     # Axios com interceptor JWT
│   ├── auth.service.ts
│   ├── chamados.service.ts
│   ├── users.service.ts
│   ├── empreendimentos.service.ts
│   ├── dashboard.service.ts
│   ├── notificacoes.service.ts
│   └── settings.service.ts
├── hooks/                   # Hooks customizados
│   ├── useNotificacoes, useSocket, usePermissions
├── contexts/
│   ├── AuthContext.tsx       # JWT + sessionStorage
│   └── ThemeContext.tsx      # Tema escuro/claro com customizacao
├── lib/
│   ├── utils.ts, sla.ts, export.ts
├── types/                   # Definicoes TypeScript
└── index.css                # Estilos globais Tailwind
```

### Principais Bibliotecas

| Biblioteca | Uso |
|---|---|
| **React 18** | Framework UI |
| **Vite** | Build tool com HMR |
| **Tailwind CSS** | Estilizacao utility-first |
| **Radix UI** | Componentes acessiveis sem estilo |
| **React Query** (TanStack) | Cache e estado do servidor |
| **React Hook Form** + **Zod** | Formularios com validacao |
| **Axios** | Cliente HTTP com interceptors |
| **Socket.IO Client** | Notificacoes em tempo real |
| **Recharts** | Graficos e visualizacoes |
| **@dnd-kit** | Drag & drop (Kanban) |
| **Lucide React** | Icones SVG |
| **Sonner** | Notificacoes toast |
| **jsPDF** + **xlsx** | Exportacao PDF e Excel |
| **date-fns** | Manipulacao de datas |

---

## Backend

### Estrutura

```
backend/src/
├── app.ts                   # Express app (porta 3333)
├── database/
│   ├── data-source.ts       # TypeORM + SQLite (sql.js)
│   └── seed.ts              # Script de inicializacao
├── entities/                # Modelos do banco de dados
│   ├── User.ts
│   ├── Chamado.ts
│   ├── Empreendimento.ts
│   ├── Vistoria.ts
│   ├── Material.ts
│   ├── Anexo.ts
│   ├── Historico.ts
│   ├── Comentario.ts
│   ├── Notificacao.ts
│   └── Settings.ts
├── routes/                  # Endpoints da API
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   ├── chamados.routes.ts
│   ├── empreendimentos.routes.ts
│   ├── dashboard.routes.ts
│   ├── notificacoes.routes.ts
│   └── settings.routes.ts
├── middlewares/
│   ├── auth.middleware.ts   # Verificacao JWT
│   ├── error.middleware.ts  # Tratamento de erros
│   └── upload.middleware.ts # Multer para uploads
├── services/
│   └── email.service.ts     # Envio de emails (Nodemailer)
├── socket.ts                # Socket.IO para tempo real
├── utils/
│   ├── notificacao.ts
│   └── sla.ts
└── types/
    └── index.ts
```

### Endpoints da API

#### Autenticacao (`/api/auth`)
| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/login` | Login com email/senha |
| GET | `/me` | Perfil do usuario autenticado |

#### Usuarios (`/api/users`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Listar usuarios |
| POST | `/` | Criar usuario |
| GET | `/:id` | Detalhes do usuario |
| PUT | `/:id` | Atualizar usuario |
| DELETE | `/:id` | Remover usuario |

#### Chamados (`/api/chamados`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Listar chamados (paginacao e filtros) |
| POST | `/` | Criar chamado |
| GET | `/:id` | Detalhes do chamado |
| PUT | `/:id` | Atualizar chamado |
| DELETE | `/:id` | Remover chamado |

#### Empreendimentos (`/api/empreendimentos`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Listar empreendimentos |
| POST | `/` | Criar empreendimento |
| GET | `/:id` | Detalhes do empreendimento |
| PUT | `/:id` | Atualizar empreendimento |

#### Dashboard (`/api/dashboard`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/stats` | Estatisticas do dashboard |

#### Notificacoes (`/api/notificacoes`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Listar notificacoes do usuario |
| PUT | `/:id` | Marcar como lida |
| DELETE | `/:id` | Remover notificacao |

#### Configuracoes (`/api/settings`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Obter configuracoes |
| PUT | `/` | Atualizar configuracoes |

### Variaveis de Ambiente

Crie `.env` na raiz (veja `.env.example`):

```env
# JWT Secret (trocar em producao)
JWT_SECRET=assistencia-tecnica-secret-key

# Porta do servidor
PORT=3333

# SMTP (opcional - emails serao ignorados se nao configurado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=CRM Pos-Obra <noreply@suaempresa.com>
```

---

## Banco de Dados

O sistema utiliza **SQLite** via **sql.js** com TypeORM, sem necessidade de servidor de banco externo. O arquivo do banco e gerado automaticamente na primeira execucao.

### Entidades principais

| Entidade | Campos chave |
|---|---|
| **User** | id, nome, email, senha (bcrypt), papel (admin/coordenador/tecnico), ativo, avatar |
| **Chamado** | id, numero, titulo, descricao, status, prioridade, categoria, tipo_imovel, cliente, SLA |
| **Empreendimento** | id, nome, endereco, ativo |
| **Vistoria** | id, chamado_id, data, horarios, tecnico, constatacoes, causa, parecer |
| **Material** | id, chamado_id, descricao, quantidade, preco_unitario, aprovado |
| **Anexo** | id, chamado_id, arquivo, tipo, tamanho, usuario |
| **Historico** | id, chamado_id, tipo (criacao/status/responsavel/edicao/comentario), dados |
| **Comentario** | id, chamado_id, usuario_id, texto |
| **Notificacao** | id, usuario_id, tipo, mensagem, lida |
| **Settings** | id, chave, valor |

### Niveis de Acesso

| Papel | Acesso |
|---|---|
| **Admin** | Acesso total: usuarios, empreendimentos, chamados, configuracoes, dashboard |
| **Coordenador** | Gestao de chamados, atribuicao de tecnicos, relatorios |
| **Tecnico** | Visualizacao e atualizacao dos chamados atribuidos |

---

## Seguranca

- **Helmet** para headers HTTP seguros
- **CORS** configurado para origens permitidas
- **JWT** para autenticacao via Bearer token
- **bcryptjs** para hash de senhas
- **Middleware de autenticacao** em todas as rotas protegidas
- **Controle de acesso** por papel no frontend e backend
- **Socket.IO** autenticado via JWT no handshake

## Deploy

| Componente | Plataforma |
|---|---|
| Frontend | Docker (Nginx) na porta 80 |
| Backend | Docker (Node.js 20 Alpine) na porta 3333 |
| Banco de dados | SQLite embarcado (sem servidor externo) |
| Arquivos | Volume Docker `/uploads` |

---

Desenvolvido para **GIO Empreendimentos**
