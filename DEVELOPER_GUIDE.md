# Developer Guide

Step-by-step instructions to run the application locally.

---

## Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Docker** & Docker Compose (for MongoDB and Redis)
- **Git**

---

## 1. Clone & Install

```bash
git clone git@github.com:roshan00017/chat-message-app.git
cd chat-message-app
pnpm install
```

---

## 2. Start Infrastructure (MongoDB + Redis)

```bash
pnpm docker:up
```

This starts:
| Service | Container | Port |
|---------|-----------|------|
| MongoDB 7 (Replica Set) | messaging-mongodb | `27017` |
| Redis 7 (password-protected) | messaging-redis | `6390` |

To stop: `pnpm docker:down`

---

## 3. Configure Environment Variables

### Backend

Copy the example and fill in values:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Your `apps/backend/.env` should look like:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/messaging?replicaSet=rs0&directConnection=true
REDIS_URL=redis://:redis123@localhost:6390
SESSION_SECRET=your-session-secret-change-in-production
FRONTEND_URL=http://localhost:5173
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_EMAIL=mailto:admin@example.com
CORS_ORIGINS=http://localhost:5173
```

### Frontend

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Your `apps/frontend/.env` should look like:

```env
VITE_API_URL=/api/v1
VITE_WS_URL=http://localhost:3001
VITE_VAPID_PUBLIC_KEY=<same-vapid-public-key-as-backend>
```

### Generate VAPID Keys

If you don't have VAPID keys yet:

```bash
npx web-push generate-vapid-keys
```

Copy the Public Key to both `VAPID_PUBLIC_KEY` (backend) and `VITE_VAPID_PUBLIC_KEY` (frontend).
Copy the Private Key to `VAPID_PRIVATE_KEY` (backend only).

---

## 4. Seed the Database

```bash
pnpm --filter backend seed
```

This creates demo accounts (all passwords: `password123`):

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | `admin@example.com` | `password123` | Full access to admin dashboard |
| Agent | `agent@example.com` | `password123` | Skills: general, billing |
| Agent | `sarah@example.com` | `password123` | Skills: technical, general |
| Agent | `mike@example.com` | `password123` | Skills: billing, accounts |
| Agent | `emma@example.com` | `password123` | Skills: technical, escalation |
| Agent | `alex@example.com` | `password123` | Skills: general, shipping |
| Agent | `lisa@example.com` | `password123` | Skills: technical, billing, escalation |

> **Note:** The seeder clears all existing data before seeding. Run it again to reset.

---

## 5. Start Development Servers

In separate terminals, or use the root command:

```bash
# Start everything (backend + frontend) via Turborepo:
pnpm dev
```

Or start individually:

```bash
# Terminal 1 — Backend (port 3001)
pnpm --filter backend dev

# Terminal 2 — Frontend (port 5173)
pnpm --filter frontend dev
```

---

## 6. Access the Application

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Frontend application |
| `http://localhost:3001/health` | Backend health check |
| `http://localhost:3001/api-docs/docs` | Swagger API documentation |

### Login as Customer

Register a new account at `http://localhost:5173/register` (role defaults to customer), or log in after seeding.

### Login as Agent

Go to `http://localhost:5173/login` and use any agent credentials from the seed (e.g., `agent@example.com` / `password123`).

### Login as Admin

Go to `http://localhost:5173/login` and use `admin@example.com` / `password123`.

---

## 7. Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
pnpm --filter backend test

# Run frontend tests only
pnpm --filter frontend test

# Run shared package tests
pnpm --filter @messaging/shared test

# Run with coverage
pnpm test:coverage
```

---

## 8. Project Structure

```
messaging/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/          # Environment, database, Redis
│   │   │   ├── middleware/      # Auth, CSRF, validation, error handling
│   │   │   ├── models/          # Mongoose models (User, Agent, Conversation, Message, etc.)
│   │   │   ├── modules/         # Feature modules (agents, conversations, notifications, analytics)
│   │   │   ├── openapi/         # Swagger/OpenAPI documentation
│   │   │   ├── routes/          # API route registration
│   │   │   ├── services/        # Cache, queue, status, conversation events
│   │   │   ├── socket/          # Socket.IO setup and handlers (message, presence, room, typing)
│   │   │   ├── utils/           # Logger, cookies
│   │   │   └── index.ts         # Server entry point
│   │   └── test/                # Backend unit tests
│   └── frontend/
│       ├── public/              # Static assets (sw.js service worker)
│       ├── src/
│       │   ├── components/      # UI components (conversation, message, layout, shared)
│       │   ├── contexts/        # Socket.IO context provider
│       │   ├── hooks/           # Custom hooks (typing, push, socket sync, unread)
│       │   ├── pages/           # Page components (customer, agent, admin)
│       │   ├── services/        # API client, socket, presence, push
│       │   ├── stores/          # Zustand stores (auth, typing, presence, UI, theme)
│       │   └── router.tsx       # TanStack Router with role-based guards
│       └── test/                # Frontend unit tests
├── packages/
│   └── shared/                  # Shared types, constants, utilities
├── docker-compose.yml           # MongoDB + Redis
├── turbo.json                   # Turborepo config
└── package.json                 # Root workspace config
```

---

## 9. Key Backend Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register new user |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/logout` | Yes | Logout |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| GET | `/api/v1/conversations` | Yes | List user's conversations |
| POST | `/api/v1/conversations` | Yes | Create conversation |
| GET | `/api/v1/conversations/:id` | Yes | Get conversation by ID |
| GET | `/api/v1/conversations/:id/messages` | Yes | Get messages (cursor paginated) |
| POST | `/api/v1/conversations/:id/messages` | Yes | Send message (REST fallback) |
| PATCH | `/api/v1/conversations/:id/read` | Yes | Mark conversation as read |
| GET | `/api/v1/conversations/:id/export` | Yes | Export chat (JSON/CSV) |
| GET | `/api/v1/conversations/unread-counts` | Yes | Get unread counts |
| GET | `/api/v1/agents` | Yes | List agents |
| POST | `/api/v1/agents/:conversationId/assign` | Yes | Assign agent to conversation |
| PATCH | `/api/v1/agents/:id/toggle-availability` | Yes | Toggle agent availability |
| GET | `/api/v1/conversations/admin/all` | Admin | List all conversations |
| GET | `/api/v1/analytics/realtime` | Admin | Get real-time metrics |
| POST | `/api/v1/notifications/subscribe` | Yes | Subscribe to push notifications |
| DELETE | `/api/v1/notifications/subscribe` | Yes | Unsubscribe from push |
| GET | `/api-docs/docs` | No | Swagger UI |

---

## 10. Key Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `conversation:join` | Client → Server | Join a conversation room |
| `conversation:leave` | Client → Server | Leave a conversation room |
| `message:send` | Client → Server | Send a message |
| `message:new` | Server → Client | New message received |
| `message:status` | Server → Client | Message status update (sent/delivered/read) |
| `message:read` | Client → Server | Mark messages as read |
| `typing:start` | Client → Server | User started typing |
| `typing:stop` | Client → Server | User stopped typing |
| `typing:update` | Server → Client | Typing indicator update |
| `presence:update` | Client → Server | Update own presence |
| `presence:change` | Server → Client | Presence change broadcast |
| `conversation:update` | Server → Client | Conversation updated (assignment, status) |
| `conversation:status-change` | Server → Client | Conversation status changed |
| `agent:assigned` | Server → Client | Agent assigned to conversation |
| `analytics:subscribe` | Client → Server | Subscribe to analytics updates |
| `analytics:update` | Server → Client | Real-time analytics data |
| `unread:sync` | Server → Client | Unread count synchronization |

---

## 11. Generating New VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key:  <copy to VAPID_PUBLIC_KEY and VITE_VAPID_PUBLIC_KEY>
Private Key: <copy to VAPID_PRIVATE_KEY>
```

---

## 12. Troubleshooting

### MongoDB replica set not initialized

```bash
docker exec messaging-mongodb mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]})"
```

### Redis connection refused

Ensure Redis is running:
```bash
docker ps | grep redis
# If not running:
pnpm docker:up
```

### Push notifications not working

1. Ensure VAPID keys are set in both backend `.env` and frontend `.env`
2. Restart both servers after changing `.env` files
3. Enable notifications in the Settings page
4. Check browser DevTools → Application → Service Workers for registration status

### Port already in use

```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9   # Backend
lsof -ti:5173 | xargs kill -9   # Frontend
```

### Reset database

```bash
pnpm --filter backend seed
```
