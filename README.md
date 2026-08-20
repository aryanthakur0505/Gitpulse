<div align="center">

<img src="docs/images/dashboard.png" alt="GitPulse Dashboard" width="100%" />

# ⚡ GitPulse

### Chat with any GitHub repository using AI

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![Gemini](https://img.shields.io/badge/Gemini-3.6%20Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-00B050?style=flat-square)](https://www.pinecone.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**GitPulse** is a full-stack AI-powered developer tool that lets you import any public GitHub repository and have a natural language conversation with its codebase. Ask questions, explore architecture, and understand code — all powered by RAG (Retrieval-Augmented Generation).

[Features](#-features) · [Architecture](#-architecture) · [Screenshots](#-screenshots) · [Getting Started](#-getting-started) · [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **GitHub OAuth** | Sign in securely with your GitHub account via NextAuth.js |
| 📦 **One-Click Import** | Paste any public GitHub repo URL and GitPulse indexes it automatically |
| 🤖 **AI Chat** | Ask natural language questions about any file, function, or architecture decision |
| 📎 **Source Citations** | Every AI answer cites the exact file and line numbers it used |
| 🔄 **Async Processing** | Background workers handle cloning, chunking, and embedding — no UI blocking |
| 📊 **Dashboard Analytics** | Real-time stats: code chunks indexed, language distribution, conversation history |
| ♻️ **Re-indexing** | Re-index any repository on demand with a single click |
| 💬 **Conversation History** | All chats are persisted and browsable across all repositories |
| ⚡ **Streaming Responses** | AI answers stream token-by-token via Server-Sent Events (SSE) |
| 🎨 **Premium UI** | Dark glassmorphism design with smooth animations and responsive layout |

---

## 🏗 Architecture

<div align="center">
<img src="docs/images/architecture.png" alt="GitPulse System Architecture" width="85%" />
</div>

### How it works

```
User Question
     │
     ▼
Next.js (Web)  ──REST/SSE──▶  Express API (:4000)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
               GitHub API       PostgreSQL          Redis Queue
               (metadata)       (Prisma ORM)         (BullMQ)
                    │                                    │
                    ▼                                    ▼
              Git Clone                        Repository Processor
                    │                          + Embedding Worker
                    ▼                                    │
              File Chunks                               ▼
                    │                          all-MiniLM-L6-v2
                    └──────────────────▶       (384-dim vectors)
                                                        │
                                                        ▼
                                                   Pinecone
                                                 (Vector DB)
                                                        │
              User Question → Embed → Query Pinecone → Top-K chunks
                                                        │
                                                        ▼
                                              Gemini 3.6 Flash
                                            (RAG answer + stream)
                                                        │
                                                        ▼
                                            SSE ──▶ Browser
```

### Processing Pipeline

1. **Import** — User submits a GitHub URL → API fetches repo metadata → job queued in Redis
2. **Clone** — Background worker clones the repository via `simple-git`
3. **Parse** — Files are read, filtered (source code only), and split into overlapping chunks
4. **Embed** — Each chunk is embedded locally using `all-MiniLM-L6-v2` (384 dims, zero API cost)
5. **Store** — Vectors upserted to Pinecone, chunk metadata saved to PostgreSQL
6. **Chat** — User question embedded → Pinecone similarity search → top-8 chunks → Gemini streams the answer

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%">
      <strong>Dashboard — Analytics &amp; Repo List</strong><br/>
      <img src="docs/images/dashboard.png" alt="Dashboard" width="100%"/>
    </td>
    <td width="50%">
      <strong>AI Chat — Streaming with Source Citations</strong><br/>
      <img src="docs/images/chat.png" alt="Chat Interface" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>Repository Detail &amp; Import Modal</strong><br/>
      <img src="docs/images/repo-detail.png" alt="Repository Detail" width="100%"/>
    </td>
    <td width="50%">
      <strong>System Architecture</strong><br/>
      <img src="docs/images/architecture.png" alt="Architecture" width="100%"/>
    </td>
  </tr>
</table>

---

## 🛠 Tech Stack

### Frontend (`apps/web`)
| Technology | Purpose |
|-----------|---------|
| [Next.js 15](https://nextjs.org) | React framework with App Router |
| [NextAuth.js](https://next-auth.js.org) | GitHub OAuth authentication |
| [TanStack Query](https://tanstack.com/query) | Server state, caching, and polling |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| [React Markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering in chat |
| [Prism Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) | Code block highlighting |
| [Lucide React](https://lucide.dev) | Icon library |

### Backend (`apps/api`)
| Technology | Purpose |
|-----------|---------|
| [Express.js](https://expressjs.com) | REST API server |
| [BullMQ](https://bullmq.io) | Redis-backed async job queue |
| [Prisma](https://www.prisma.io) | Type-safe ORM |
| [simple-git](https://github.com/steveukx/git-js) | Programmatic git clone |
| [jose](https://github.com/panva/jose) | JWT signing & verification |
| [@google/genai](https://github.com/google/generative-ai-js) | Gemini 3.6 Flash LLM |
| [@xenova/transformers](https://github.com/xenova/transformers.js) | Local `all-MiniLM-L6-v2` embeddings |
| [@pinecone-database/pinecone](https://www.pinecone.io) | Vector similarity search |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| PostgreSQL 16 | Relational database (users, repos, conversations) |
| Redis 7 | BullMQ job queue backend |
| Docker Compose | Local infrastructure orchestration |
| Turborepo | Monorepo build system |
| pnpm | Fast, disk-efficient package manager |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm install -g pnpm`
- **Docker Desktop** — for PostgreSQL and Redis
- **GitHub OAuth App** — for authentication
- **Pinecone account** — free tier works ([pinecone.io](https://pinecone.io))
- **Google AI Studio API key** — free ([aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repository

```bash
git clone https://github.com/aryanthakur0505/Gitpulse.git
cd Gitpulse
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start infrastructure

```bash
pnpm docker:up
```

Starts **PostgreSQL** on port `5432` and **Redis** on port `6379`.

### 4. Configure environment variables

**Root `.env`**
```env
DATABASE_URL="postgresql://gitpulse:gitpulse@localhost:5432/gitpulse"
```

**`apps/api/.env.local`**
```env
# Database
DATABASE_URL="postgresql://gitpulse:gitpulse@localhost:5432/gitpulse"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-jwt-secret-here"
API_INTERNAL_SECRET="your-internal-secret-here"

# CORS
ALLOWED_ORIGINS="http://localhost:3000"

# GitHub API (optional but recommended — raises rate limit to 5000 req/hr)
GITHUB_TOKEN="github_pat_xxxx"

# Google Gemini
GEMINI_API_KEY="AIzaSy..."

# Pinecone
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX="gitpulse"
```

**`apps/web/.env.local`**
```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# GitHub OAuth App (github.com/settings/developers)
GITHUB_ID="your-github-oauth-client-id"
GITHUB_SECRET="your-github-oauth-client-secret"

# API
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
API_URL="http://localhost:4000/api"
API_INTERNAL_SECRET="your-internal-secret-here"
```

> **GitHub OAuth App setup:**
> Go to **GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App**
> - Homepage URL: `http://localhost:3000`
> - Callback URL: `http://localhost:3000/api/auth/callback/github`

### 5. Set up the database

```bash
pnpm db:generate
pnpm db:push
```

### 6. Create Pinecone index

In your Pinecone dashboard, create an index with:
- **Name:** `gitpulse`
- **Dimensions:** `384`
- **Metric:** `cosine`

### 7. Start the development server

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API server | http://localhost:4000 |
| API health | http://localhost:4000/api/health |

---

## 📁 Project Structure

```
gitpulse/
├── apps/
│   ├── api/                         # Express API server
│   │   └── src/
│   │       ├── config/              # Environment validation (Zod)
│   │       ├── lib/                 # GitHub, Pinecone, LLM, embeddings, queue
│   │       ├── middleware/          # JWT auth, error handler
│   │       ├── routes/              # REST endpoints
│   │       ├── services/            # RAG pipeline, file processor
│   │       └── workers/             # BullMQ: repo processor + embedding worker
│   │
│   └── web/                         # Next.js 15 app
│       └── src/
│           ├── app/
│           │   ├── (auth)/          # Sign-in page
│           │   └── (dashboard)/     # Protected routes
│           │       ├── dashboard/   # Analytics & repo list
│           │       ├── repositories/[id]/
│           │       │   └── chat/[conversationId]/
│           │       ├── conversations/
│           │       └── settings/
│           ├── components/          # UI components
│           ├── hooks/               # TanStack Query hooks
│           ├── lib/                 # API client, auth config
│           └── providers/           # QueryClient, SessionProvider
│
├── packages/
│   └── db/                          # Shared Prisma client & schema
│
├── docker/
│   └── docker-compose.yml           # PostgreSQL + Redis
│
└── turbo.json                       # Turborepo pipeline
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (server + database) |
| `POST` | `/api/repositories` | Import a new GitHub repository |
| `GET` | `/api/repositories` | List all user repositories |
| `GET` | `/api/repositories/:id` | Get repository details with stats |
| `POST` | `/api/repositories/:id/reindex` | Wipe + re-index a repository |
| `DELETE` | `/api/repositories/:id` | Delete repository and all vectors |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations` | List all conversations (optional repo filter) |
| `GET` | `/api/conversations/:id` | Get conversation with messages |
| `POST` | `/api/conversations/:id/messages` | Send a message — streams SSE response |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET` | `/api/stats` | Dashboard analytics aggregate |

---

## 🧠 How RAG Works

```
Question: "How does authentication work?"
     │
     ▼
  Embed with all-MiniLM-L6-v2  →  384-dim vector
     │
     ▼
  Query Pinecone  →  top-8 chunks by cosine similarity
     │
     ▼
  ┌─────────────────────────────────────┐
  │ src/middleware/auth.ts   L12-45     │
  │ src/lib/jwt.ts           L5-28      │
  │ src/routes/auth.ts       L8-67      │
  └─────────────────────────────────────┘
     │
     ▼
  [System prompt] + [Code context] + [Question]
     │
     ▼
  Gemini 3.6 Flash  →  streams tokens via SSE  →  Browser
```

Every answer is **grounded in actual source code**, not hallucinated. Exact file paths and line numbers are returned alongside every response for full traceability.

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Embedding throughput | ~2,000 chunks/min (local, no API cost) |
| Vector query latency | ~200–400ms (Pinecone) |
| First token latency | < 1s (Gemini 3.6 Flash) |
| Concurrent repositories | Unlimited (isolated namespaces) |
| Embedding dimensions | 384 (all-MiniLM-L6-v2) |

---

## 🔒 Security

- All API routes require JWT authentication signed by `JWT_SECRET`
- GitHub OAuth tokens are never stored — only used to create the session JWT
- All DB queries are scoped by `userId` — cross-user access is impossible
- Pinecone namespaces use `repo-{id}` — complete vector isolation per repository
- Secrets are gitignored and never committed

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please follow existing conventions: TypeScript strict mode, Prisma for all DB access, TanStack Query for all client data fetching.

---

## 📄 License

MIT © [Aryan Thakur](https://github.com/aryanthakur0505)

---

<div align="center">

Built with ❤️ by [Aryan Thakur](https://github.com/aryanthakur0505)

⭐ **Star this repo if you found it useful!**

</div>
