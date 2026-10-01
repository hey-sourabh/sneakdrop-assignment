# SneakDrop Assignment

## System Architecture & Design Decisions

This project is a high-concurrency sneaker drop platform built with **Node.js, Express, Redis, and React**. The core challenge of this assignment is preventing race conditions when thousands of users attempt to buy a limited stock (20 pairs) simultaneously.

### 1. Preventing Overselling (Atomic Operations)
A naive approach (checking `stock > 0` in Node.js and then decrementing) results in the classic Time-of-Check to Time-of-Use (TOCTOU) race condition. 

To solve this, the core logic relies on **Redis Lua Scripts**. By wrapping the stock check, stock decrement, and the creation of the 5-minute hold key inside a single Lua script, the entire operation is atomic. Redis executes scripts sequentially, guaranteeing that no two users can race for the last pair. We verified this with a 100-user concurrent load test.

### 2. 5-Minute Holds & The Waitlist
When a user reserves a pair, a hold is placed.
- **TTL (Time to Live)**: The hold is stored in Redis using `SETEX` with a 300-second (5 min) expiry.
- **Automated Waitlist**: Instead of using unreliable `cron` jobs or `setTimeout` intervals in Node, the system listens to **Redis Keyspace Notifications** (`__keyevent@0__:expired`). 
- When a hold expires, Redis fires an event, which our `expiryWatcher.js` catches to instantly pop the next user from the waitlist and grant them the hold.
- **Fallback**: For managed Redis environments (like AWS ElastiCache) where keyspace notifications might be disabled, the watcher gracefully degrades to a highly-efficient polling mechanism that uses `scanIterator` and set-difference to detect expired hold keys.

### 3. Payment Idempotency & Simulated Webhooks
The assignment requires an external payment provider simulation. 
- The fake provider (`payment.js`) intentionally introduces chaos: random delays (0.5s - 4s), and a 30% chance to send **duplicate webhooks** to simulate a messy real-world network.
- **Idempotency**: Webhook processing is fully idempotent. We use Redis `SET NX` (Set if Not eXists) to atomically claim the processing lock for a specific payment ID. If duplicate webhooks arrive concurrently, only one wins the lock; the other safely skips processing. 

### 4. Waitlist Safety & Crash Resilience
If the server crashes exactly when a hold expires, we don't want a user popped from the waitlist to be lost.
The waitlist advancement is also handled via an atomic Lua script: it atomically `LPOP`s the waitlist and either creates the new hold key or increments the stock back to the pool if the queue is empty.

---

## How to Run & Verify

### Prerequisites
- **Node.js** v18+
- **Redis** installed and available in your PATH (the backend requires it on `localhost:6379`)
- **npm** (comes with Node.js)

---

### Step 1 — Start Redis

Redis must be running **before** starting the app. Open a dedicated terminal and run:

```bash
redis-server --port 6379
```

Leave this terminal running. You should see Redis print `Ready to accept connections`.

> **Windows users**: If `redis-server` is not found, install it via [Memurai](https://www.memurai.com/) (Windows-native Redis) or run it via WSL.

---

### Step 2 — Install Root Dependencies

From the **project root** (`sneakdrop-assignment/`), install backend + tooling dependencies:

```bash
npm install
```

---

### Step 3 — Install Client Dependencies

The React frontend is a separate package inside `src/client/`. Install its dependencies:

```bash
cd src/client
npm install
cd ../..
```

> This only needs to be done once (or whenever `src/client/package.json` changes).

---

### Step 4 — Configure Environment Variables

A `.env.example` is included in the repo. Copy it to `.env` before running:

```bash
cp .env.example .env
```

> On Windows PowerShell: `Copy-Item .env.example .env`

The defaults work out of the box for local development — no changes needed:

```env
PORT=3001
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
BASE_URL=http://localhost:3001
```

If you change the Redis port or server address, update `REDIS_URL` accordingly.

---

### Step 5 — Start the Full Stack (Server + Client)

From the **project root**, run:

```bash
npm run dev
```

This uses `concurrently` to start **both** services in parallel:

| Service | Command internally | URL |
|---|---|---|
| Express API server | `tsx src/server/index.ts` | `http://localhost:3001` |
| Vite React frontend | `cd src/client && npm run dev` | `http://localhost:5173` |

Open **`http://localhost:5173`** in your browser to use the app.

---

### Step 6 — Run the Concurrent Load Test

To verify the system does **not** oversell under high concurrency, run:

```bash
npm run test:load
```

This fires **100 simultaneous "Buy" requests** against `http://localhost:3001`.

**Expected result:**
- Exactly **20** requests succeed with a hold placed
- Exactly **80** fail cleanly with `"out of stock"`
- Stock drops to `0` — no negative stock, no overselling

> Make sure the server is running (Step 5) and Redis is running (Step 1) before executing the load test.

---

### Quick-Start Summary (copy-paste order)

```bash
# Terminal 1 — Redis (keep running)
redis-server --port 6379

# Terminal 2 — install & run
npm install
cd src/client && npm install && cd ../..
npm run dev

# Terminal 3 — load test (optional, server must be running first)
npm run test:load
```

---

## Technical Stack
* **Backend**: Node.js, Express, Redis (v6 Client), `tsx` for TypeScript execution
* **Frontend**: React 18, Vite 5, TypeScript, CSS Modules
* **Data Store**: Redis — source of truth for stock, holds, purchases, and waitlist
* **Dev Tooling**: `concurrently`, `tsx`, TypeScript 7
