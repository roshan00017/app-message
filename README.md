# Real-Time Customer Support Chat Platform

A full-stack, real-time customer support platform built with React, Node.js, Socket.IO, MongoDB, and Redis. Supports three user roles — **Customer**, **Agent**, and **Admin** — each with their own tailored dashboard and capabilities.

---

## Features

### Customer Experience
- Start conversations with the support team
- Real-time messaging with Socket.IO
- Typing indicators (debounced)
- Message status: Sent → Delivered → Read
- Unread message counts
- Push notifications (Web Push)
- Chat export (JSON / CSV)
- Agent presence indicators

### Agent Dashboard
- Assigned conversation list with status filters
- Real-time messaging with customers
- Customer presence and typing indicators
- Availability toggle (Available / Unavailable)
- Load-based auto-assignment when coming online
- Settings page

### Admin Dashboard
- Real-time analytics (active users, online agents, message volume)
- Agent management (list, presence, availability, skills, active chats)
- Conversation management (filter, search, assign, reassign, close)
- Assignment via multiple algorithms: load-balanced, skill-based, hybrid

---

## Architecture

```
                     ┌───────────────────────┐
                     │       Frontend        │
                     │ React + TypeScript    │
                     └───────────┬───────────┘
                                 │
                    REST + Socket.IO
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │       Backend         │
                     │ Node + Express        │
                     │ Socket.IO             │
                     └───────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             ┌──────────────┐          ┌──────────────┐
             │   MongoDB    │          │    Redis     │
             │              │          │              │
             │ Messages     │          │ Cache        │
             │ Conversations│          │ Socket scale │
             │ Users        │          │ Presence     │
             │ Agents       │          │ Sessions     │
             └──────────────┘          └──────────────┘
                                            │
                                            ▼
                                     Notification Queue
                                            │
                                            ▼
                                       Push Worker
                                            │
                                            ▼
                                        Web Push
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, TanStack Router, TanStack Query, Zustand, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Socket.IO, BullMQ |
| Database | MongoDB 7 (Mongoose ODM) |
| Cache / Pub-Sub | Redis 7 (ioredis) |
| Real-Time | Socket.IO with Redis Adapter (horizontal scaling) |
| Push | Web Push (VAPID), Service Worker, BullMQ queue |
| Auth | Server-side sessions (express-session), MongoDB store |
| Docs | OpenAPI / Swagger UI |
| Monorepo | pnpm workspaces + Turborepo |
| Infra | Docker Compose (MongoDB + Redis) |

---

## User Roles

| Role | Access | Description |
|------|--------|-------------|
| **Customer** (`user`) | `/customer/*` | Start conversations, chat with agents, view history |
| **Agent** (`agent`) | `/agent/*` | View assigned conversations, chat with customers, toggle availability |
| **Admin** (`admin`) | `/admin/*`, `/agent/*` | Full access to dashboards, agent management, analytics, conversation management |

---

## Key Implementation Details

### Real-Time Messaging
- Messages sent via Socket.IO → persisted to MongoDB → broadcast to conversation room
- Optimistic UI with failed message state and retry
- Duplicate prevention using server-generated IDs

### Agent Assignment
- **Auto-assign**: When a customer starts a conversation, the least-loaded available agent is assigned automatically
- **Manual assign**: Admin can assign/reassign agents from the dashboard
- **On agent connect**: If waiting conversations exist, they're auto-assigned when an agent comes online
- **Algorithms**: Round-robin, load-balanced, skill-based, hybrid

### Message Lifecycle
```
SENT → DELIVERED → READ
```
- Status updates are idempotent and atomic
- Delivery checked via Redis presence
- Read status broadcast to conversation room

### Presence
- Redis TTL-based (30s heartbeat)
- Agent MongoDB status synced on socket connect/disconnect
- Graceful offline detection with delayed check after TTL expiry

### Push Notifications
- VAPID-authenticated Web Push
- BullMQ queue with exponential backoff (3 attempts)
- Expired/invalid subscriptions auto-removed
- Notification click navigates to conversation

---

## API Documentation

Swagger UI is available at: `http://localhost:3001/api-docs/docs`

OpenAPI JSON: `http://localhost:3001/api-docs/openapi.json`

---

## License

Private — For assessment purposes.
