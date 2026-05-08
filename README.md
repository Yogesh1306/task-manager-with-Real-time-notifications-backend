# 📋 Task Manager — Backend

A **production-ready** RESTful backend for a collaborative task management application, built with **Node.js**, **Express**, **MongoDB**, **Socket.IO**, **BullMQ**, and **Redis**. Features JWT-based authentication, real-time notifications, background reminder jobs, Redis caching, and secure file uploads via Cloudinary.

---

## 🚀 Features

- 🔐 **JWT Authentication** — Secure registration, login, and protected routes
- 📡 **Real-Time Notifications** — Live updates using Socket.IO with Redis pub/sub adapter for horizontal scalability
- ⏰ **Background Reminder Jobs** — BullMQ-powered reminder queue with a dedicated worker process
- 🗃️ **Redis Caching** — Dedicated cache worker to reduce database load
- 📁 **File Uploads** — Profile/task image uploads with Multer + Cloudinary
- 🛡️ **Security** — Helmet, CORS, rate limiting (with Redis store), input validation via Zod
- 📊 **Structured Logging** — High-performance logging with Pino + pino-http
- 🧹 **Code Quality** — ESLint + Prettier configuration enforced across the codebase

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express v5 |
| Database | MongoDB (Mongoose) |
| Real-Time | Socket.IO + `@socket.io/redis-adapter` |
| Job Queue | BullMQ |
| Cache / Pub-Sub | Redis (ioredis) |
| Authentication | JSON Web Tokens (jsonwebtoken), bcryptjs |
| Validation | Zod |
| File Uploads | Multer + Cloudinary |
| Security | Helmet, express-rate-limit, rate-limit-redis |
| Logging | Pino, pino-http |
| Dev Tools | Nodemon, Morgan, ESLint, Prettier |

---

## 📁 Project Structure
```
task-manager-with-Real-time-notifications-backend/
├── src/
│ ├── config/ # Database, Cloudinary, Redis, Socket.IO config
│ ├── controllers/ # Route handlers (board, task, user, upload)
│ ├── helpers/ # Board, caching, and utility helpers
│ ├── middleware/ # Auth, error handling, rate limiting middleware
│ ├── models/ # Mongoose models (Board, Task, User)
│ ├── queues/ # BullMQ queue definitions (reminder queue)
│ ├── routes/ # Express route files
│ │ ├── board.routes.js
│ │ ├── task.routes.js
│ │ ├── upload.routes.js
│ │ └── user.routes.js
│ ├── services/ # Redis cache service
│ ├── utils/ # API error/response helpers, constants
│ ├── workers/
│ │ ├── reminder.worker.js # Processes scheduled task reminders
│ │ └── cache.worker.js # Background cache invalidation
│ ├── app.js # Express app setup, middleware, routes
│ └── constant.js # App-wide constants
├── .eslintignore
├── .eslintrc.json
├── .prettierignore
├── .prettierrc
├── .gitignore
├── package.json
└── package-lock.json
```

---

## ⚙️ Prerequisites

Ensure the following are installed on your system:

- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **Redis** v7+ (local or Redis Cloud)

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
CLIENT_URL=http://localhost:3000
```

---

## 📦 Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/Yogesh1306/task-manager-with-Real-time-notifications-backend.git
cd task-manager-with-Real-time-notifications-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Start the development server
npm run dev
```

---

## ▶️ Running the Application

### Main Server

```bash
# Development (with hot-reload)
npm run dev

# Production
npm start
```

### Background Workers

Workers must be run as **separate processes** alongside the main server:

```bash
# Reminder Queue Worker — processes scheduled task reminders
npm run worker:reminder

# Cache Worker — handles background cache invalidation
npm run worker:cache
```

> **Note:** All three processes (server + 2 workers) need to be running simultaneously in production for full functionality.

---

## 🔌 API Endpoints

### Auth / User — `/api/v1/users`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register a new user | ❌ |
| POST | `/login` | Login and receive JWT | ❌ |
| POST | `/logout` | Logout current user | ✅ |
| GET | `/me` | Get current user profile | ✅ |
| PATCH | `/update` | Update profile details | ✅ |

### Boards — `/api/v1/boards`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all boards for the user | ✅ |
| POST | `/` | Create a new board | ✅ |
| GET | `/:id` | Get board by ID | ✅ |
| PATCH | `/:id` | Update a board | ✅ |
| DELETE | `/:id` | Delete a board | ✅ |

### Tasks — `/api/v1/tasks`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all tasks | ✅ |
| POST | `/` | Create a new task | ✅ |
| GET | `/:id` | Get task by ID | ✅ |
| PATCH | `/:id` | Update a task | ✅ |
| DELETE | `/:id` | Delete a task | ✅ |

### Uploads — `/api/v1/upload`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Upload image to Cloudinary | ✅ |

---

## 🔔 Real-Time Events (Socket.IO)

The server emits the following events to connected clients:

| Event | Trigger |
|---|---|
| `task:created` | A new task is created |
| `task:updated` | A task is updated |
| `task:deleted` | A task is deleted |
| `reminder:due` | A task reminder fires (via BullMQ worker) |

---

## 🧪 Code Quality

```bash
# Lint the codebase
npm run lint

# Auto-format with Prettier
npm run format
```

---

## 🏗️ Architecture Overview

``` Client (React / Next.js)
│
▼
Express REST API ──── MongoDB (Mongoose)
│
├──── Socket.IO ──── Redis Pub/Sub (multi-instance support)
│
└──── BullMQ ──────── Redis Queue
│
├── reminder.worker.js (scheduled reminders)
└── cache.worker.js (cache invalidation)
```

---

## 👤 Author

**Yogesh Joshi** — [@Yogesh1306](https://github.com/Yogesh1306)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE)