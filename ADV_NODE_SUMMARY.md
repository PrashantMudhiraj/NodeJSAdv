# Advanced Node.js — In-depth Notes

## Overview

This document expands the workspace summary into practical, in-depth notes for each advanced Node.js topic represented in this repository. Each section includes: conceptual explanation, key APIs, example snippets, best practices, common pitfalls, and links to example files in this workspace.

## Table of Contents

**Phase 1 — Node.js Fundamentals & Internals**

- 1.1 [Module System](#11-module-system) — CommonJS vs ESM, require resolution, circular deps
- 1.2 [Event Loop](#12-event-loop) — phases, timers, microtasks, senior Q&A
- 1.3 [libuv Thread Pool](#13-libuv-thread-pool) — UV_THREADPOOL_SIZE, which APIs use it, tuning
- 1.4 [Buffer & Binary Data](#14-buffer--binary-data) — encoding, allocation, TypedArrays, performance

**Phase 2 — Core Async & Data Flow**

- 2.1 [Async Patterns](#21-async-patterns) — callbacks, promises, async/await, error handling
- 2.2 [Error Handling Patterns](#22-error-handling-patterns) — operational vs programmer errors, custom errors, domains
- 2.3 [Event Emitters](#23-event-emitters) — patterns, memory leaks, listener management
- 2.4 [Streams & Pipelines](#24-streams--pipelines) — backpressure, transform streams, memory optimization

**Phase 3 — I/O & System APIs**

- 3.1 [File System (fs)](#31-file-system-fs) — streams, watchers, concurrent writes, performance
- 3.2 [HTTP Server & NodeServer](#32-http-server--nodeserver) — streaming responses, range requests, backpressure
- 3.3 [Child Processes (exec / spawn / fork)](#33-child-processes-exec--spawn--fork) — exec, spawn, IPC, process management

**Phase 4 — Concurrency & Scaling**

- 4.1 [Worker Threads & Atomics](#41-worker-threads--atomics) — shared memory, synchronization, race conditions
- 4.2 [Cluster & Fork](#42-cluster--fork) — master/worker, load distribution, sticky sessions
- 4.3 [Inter-thread / IPC Patterns](#43-inter-thread--ipc-patterns) — message passing, postMessage, Atomics
- 4.4 [Concurrency Models Comparison](#44-concurrency-models-comparison) — decision matrix, tradeoffs

**Phase 5 — Architecture & Production**

- 5.1 [System Design & Architecture](#51-system-design--architecture) — scalability, request flow, scenarios
- 5.2 [Database & Caching Patterns](#52-database--caching-patterns) — pooling, Redis, queues, consistency
- 5.3 [Debugging, Memory Profiling & Observability](#53-debugging-memory-profiling--observability) — leak detection, profiling, monitoring
- 5.4 [Production Practices & Security](#54-production-practices--security) — error handling, graceful shutdown, security
- 5.5 [Interview Scenarios & System Design Problems](#55-interview-scenarios--system-design-problems) — real-world challenges

**Phase 6 — Networking & Real-time**

- 6.1 [HTTP/2, TLS & Transport Security](#61-http2-tls--transport-security) — certs, HSTS, CORS, helmet, HTTP/2 multiplexing
- 6.2 [WebSockets & Real-time Communication](#62-websockets--real-time-communication) — ws vs socket.io, scaling, heartbeat, backpressure
- 6.3 [Message Queues & Background Jobs](#63-message-queues--background-jobs) — RabbitMQ, Kafka, BullMQ, retry, dead-letter queues

**Phase 7 — Testing, Performance & API Design**

- 7.1 [Testing & CI/CD](#71-testing--cicd) — unit, integration, e2e, mocking, coverage, CI pipelines
- 7.2 [Performance & Benchmarking](#72-performance--benchmarking) — load testing, event-loop latency, clinic, autocannon
- 7.3 [API Design & Versioning](#73-api-design--versioning) — REST vs GraphQL, pagination, idempotency, rate limiting

**Phase 8 — Deployment, Security & Operations**

- 8.1 [Deployment & Operations](#81-deployment--operations) — Docker, Kubernetes basics, health checks, PM2, rolling updates
- 8.2 [Security Checklist & Hardening](#82-security-checklist--hardening) — OWASP, dependency scanning, CSP, input validation, secrets management
- 8.3 [Observability: Tracing & APM](#83-observability-tracing--apm) — OpenTelemetry, distributed traces, correlation IDs, dashboards

**Appendix**

- A.1 [Quick Reference: Example Files](#a1-quick-reference-example-files) — workspace file index by topic
- A.2 [Glossary & Cheat Sheet](#a2-glossary--cheat-sheet) — quick-reference commands, API table, interview prompts

---

## Phase 1 — Node.js Fundamentals & Internals

### 1.1 Module System

### Concepts

When you write a Node.js application, you don't put all your code in a single file. You split it into **modules** — small, reusable pieces of code. Think of modules like LEGO blocks: each one does one thing, and you snap them together to build something bigger.

Node.js has two module systems:

- **CommonJS (CJS):** The original system, using `require()` to load and `module.exports` to share code. It works **synchronously** — when Node hits a `require()`, it stops everything, loads the file, runs it, and returns the result. This is fine at startup but can block the event loop if done carelessly at runtime.

- **ES Modules (ESM):** The modern JavaScript standard, using `import` / `export`. It loads **asynchronously** — the engine can analyze all imports before executing, enabling optimizations like **tree shaking** (removing unused code). ESM is the future, but CJS is still everywhere in existing packages.

**How does Node find a module?** When you call `require('express')`, Node follows a **resolution algorithm**: first it checks built-in modules (like `fs`, `http`), then looks for a `node_modules` folder in the current directory, then the parent directory, and so on up to the root. For relative paths like `require('./utils')`, it tries adding `.js`, `.json`, `.node`, and `/index.js` extensions.

**Module caching** is a key concept: once a module is loaded, Node stores it in memory. Every subsequent `require()` for the same module returns the **exact same object** — not a fresh copy. This means if module A modifies something on the exported object, module B will see those changes. This is how singletons work naturally in Node.

```mermaid
graph TD
    A["require('express')"] --> B{"Is it a built-in module?<br/>fs, http, path, etc."}
    B -->|Yes| C["Return built-in module"]
    B -->|No| D{"Is it a relative path?<br/>./utils or ../lib"}
    D -->|Yes| E["Resolve file path:<br/>./utils.js → .json → .node<br/>→ ./utils/index.js"]
    D -->|No| F{"Already in require.cache?"}
    F -->|Yes| G["Return cached module<br/>(same object every time)"]
    F -->|No| H["Search node_modules/<br/>current dir → parent → root"]
    H --> I["Load, compile & execute<br/>the module file"]
    I --> J["Store in require.cache"]
    J --> G
    E --> F

    style C fill:#4caf50,color:#fff
    style G fill:#2196f3,color:#fff
    style I fill:#ff9800,color:#fff
```

### CommonJS vs ES Modules

| Feature              | CommonJS (`require`)                     | ES Modules (`import`)                        |
| -------------------- | ---------------------------------------- | -------------------------------------------- |
| **Loading**          | Synchronous                              | Asynchronous                                 |
| **Syntax**           | `require()` / `module.exports`           | `import` / `export`                          |
| **Top-level await**  | ❌ Not supported                         | ✅ Supported                                 |
| **Tree shaking**     | ❌ No (dynamic)                          | ✅ Yes (static analysis)                     |
| **File extension**   | `.js` (default)                          | `.mjs` or `"type": "module"` in package.json |
| **`this` in module** | `module.exports`                         | `undefined`                                  |
| **Dynamic import**   | `require(path)` anywhere                 | `await import(path)`                         |
| **Circular deps**    | Partial exports (what's been set so far) | Live bindings (always up-to-date)            |

### Module Resolution Algorithm

```js
// When you call require('my-module'), Node searches:
// 1. Built-in modules (fs, http, path, etc.)
// 2. node_modules in current directory
// 3. node_modules in parent directory (repeats up to root)
// 4. Global install paths

// Exact resolution order for require('./utils'):
// ./utils.js → ./utils.json → ./utils.node → ./utils/index.js → ./utils/index.json

// Check resolved path:
console.log(require.resolve("express")); // Full absolute path to entry point
```

### Module Caching & Singletons

```js
// Modules are cached: require() returns SAME object every time
// counter.js
let count = 0;
module.exports = {
    increment: () => ++count,
    getCount: () => count,
};

// app.js
const counter1 = require("./counter");
const counter2 = require("./counter");
counter1.increment();
console.log(counter2.getCount()); // 1 — Same instance!

// Verify caching:
console.log(counter1 === counter2); // true

// ⚠️ Force re-load (NOT recommended in production):
delete require.cache[require.resolve("./counter")];
const counter3 = require("./counter");
console.log(counter3.getCount()); // 0 — Fresh instance
```

### Circular Dependencies

```js
// ❌ PROBLEM: Circular require
// a.js
const b = require("./b");
console.log("In A, b.value =", b.value); // undefined (b hasn't finished!)
module.exports = { value: "A" };

// b.js
const a = require("./a");
console.log("In B, a.value =", a.value); // 'A' or undefined depending on load order
module.exports = { value: "B" };

// ✅ Fix 1: Lazy require (defer to function call)
// a.js
module.exports = {
    value: "A",
    getB: () => require("./b"), // Loaded only when called
};

// ✅ Fix 2: Restructure — extract shared code into a third module
// shared.js (no circular deps)
module.exports = { sharedValue: "shared" };

// ✅ Fix 3: Use ESM (live bindings handle circular deps better)
// a.mjs
import { value } from "./b.mjs";
export const aValue = "A";
// ESM provides live binding — value updates when b.mjs sets it
```

### Senior-Level Q&A

**Q1: What's the difference between `require()` and `import`? Can you mix them?**

A: `require()` is synchronous (CJS), `import` is asynchronous (ESM). You can:

- Use `import()` (dynamic) inside CJS files
- Use `createRequire()` to use `require()` inside ESM files
- Cannot use static `import` in CJS files

```js
// CJS file using dynamic import
const loadESM = async () => {
    const { default: esModule } = await import("./es-module.mjs");
    return esModule;
};

// ESM file using require
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const cjsModule = require("./cjs-module.js");
```

**Q2: How does `require.cache` work? When would you clear it?**

A: `require.cache` is an object mapping resolved filenames to loaded modules. Clearing it forces re-evaluation.

```js
// Inspect the cache
console.log(Object.keys(require.cache)); // All loaded module paths

// Use case: Hot-reload config in development
function reloadConfig() {
    const configPath = require.resolve("./config");
    delete require.cache[configPath];
    return require("./config");
}
```

**Q3: Your app has a circular dependency bug. How do you detect and fix it?**

A:

- **Detect:** Use `madge` tool: `npx madge --circular src/`
- **Symptoms:** `undefined` values from imported modules, initialization order bugs
- **Fix:** Extract shared logic into a separate module, use lazy requires, or restructure

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What's the difference between require and import?"_ → `require` is synchronous (CJS), `import` is async (ESM). CJS returns a cached copy; ESM provides live bindings.
> - _"How does Node resolve modules?"_ → Built-in → node_modules (current → parent → root). For relative paths: .js → .json → .node → /index.js.
> - _"What causes circular dependency bugs?"_ → Module A requires B while B requires A. The partially-loaded exports object is returned, leading to `undefined` values. Fix with lazy require or restructuring.

> **📝 Quick Revision — Module System:**
>
> | Concept       | Key Point                                                |
> | ------------- | -------------------------------------------------------- |
> | CJS vs ESM    | `require()` sync, cached; `import` async, tree-shakeable |
> | Module cache  | Same object returned every time; singleton by default    |
> | Circular deps | CJS returns partial exports; ESM uses live bindings      |
> | Resolution    | built-in → node_modules → parent node_modules → root     |
> | Hot reload    | Delete from `require.cache`, then re-require (dev only)  |

[↑ Back to Index](#table-of-contents)

---

### 1.2 Event Loop

### Concepts

The event loop is the **heart of Node.js**. It's what allows Node to handle thousands of concurrent operations using just a single thread. Understanding it deeply is the difference between writing fast Node code and writing code that mysteriously hangs.

**The simple analogy:** Imagine you're a chef (the single thread) in a busy kitchen. You don't stand and watch each pot boil — you start cooking rice, then while it boils, you chop vegetables, then while they sauté, you prepare the sauce. The event loop is your system for checking back on each task at the right time.

**How it works technically:**
Node runs your JavaScript on **one main thread**. When your code calls something asynchronous (like reading a file or making an HTTP request), Node doesn't block — it hands the work to the operating system or a background thread pool (libuv), and continues running your next line of code. When the async work finishes, a callback is placed in a queue. The event loop's job is to continuously check these queues and execute callbacks when the main thread is free.

**The phases:** Each "tick" of the event loop goes through these phases in order:

1. **Timers** — Execute callbacks from `setTimeout()` and `setInterval()` whose time has expired
2. **Pending callbacks** — Execute I/O callbacks deferred from the previous loop (e.g., TCP errors)
3. **Idle/Prepare** — Internal housekeeping (you never interact with this directly)
4. **Poll** — The most important phase. Retrieves new I/O events and executes I/O callbacks (file reads, network responses, etc.). If there's nothing to do, it **waits here** for new events
5. **Check** — Execute `setImmediate()` callbacks
6. **Close callbacks** — Execute close event callbacks (e.g., `socket.on('close', ...)`)

**Between every phase**, Node drains the **microtask queues**: first all `process.nextTick()` callbacks, then all Promise `.then()` callbacks. This is why `process.nextTick` has the highest priority — it runs before the event loop can move to the next phase. But be careful: if you recursively call `process.nextTick`, you'll **starve** the event loop (I/O callbacks never run).

**Key rules to remember:**

- Synchronous code always runs first and blocks everything
- `process.nextTick` > Promises > `setTimeout(0)` > `setImmediate` (in priority order)
- `setTimeout(fn, 0)` and `setImmediate(fn)` ordering is **non-deterministic** in the main module, but inside an I/O callback, `setImmediate` always runs first
- Any blocking operation (heavy loop, sync file read) **freezes the entire server** — no requests can be handled

### Key APIs / Patterns

- `setTimeout(cb, delay)` — runs in **timers phase** (minimum ~1-4ms delay depending on system load).
- `setImmediate(cb)` — runs in **check phase** (after I/O polling).
- `process.nextTick(cb)` — runs _before_ next phase (microtask, highest priority).
- `Promise.resolve().then(cb)` — runs as microtask (after `process.nextTick` queue empties).

### Event Loop Phases Diagram

This diagram shows exactly what happens during one complete "tick" of the event loop. Notice how microtask queues (pink) are drained between **every** phase — this is why `process.nextTick` and Promises have such high priority.

```mermaid
graph TD
    A["START New Loop Iteration"] --> B

    subgraph Phase1 ["1. TIMERS PHASE"]
        B["Execute expired callbacks<br/>setTimeout & setInterval"]
    end

    B --> MT1["Drain Microtask Queue<br/>nextTick first, then Promises"]

    subgraph Phase2 ["2. PENDING CALLBACKS"]
        D["Execute deferred I/O callbacks<br/>TCP errors, DNS failures"]
    end

    MT1 --> D
    D --> MT2["Drain Microtask Queue"]

    subgraph Phase3 ["3. POLL PHASE — Most Important"]
        H["Retrieve new I/O events<br/>fs callbacks, network data<br/>Waits here if idle"]
    end

    MT2 --> H
    H --> MT3["Drain Microtask Queue"]

    subgraph Phase4 ["4. CHECK PHASE"]
        J["Execute setImmediate callbacks<br/>Runs right after Poll"]
    end

    MT3 --> J
    J --> MT4["Drain Microtask Queue"]

    subgraph Phase5 ["5. CLOSE CALLBACKS"]
        L["Execute close handlers<br/>socket.on close, server.close"]
    end

    MT4 --> L
    L --> MT5["Drain Microtask Queue"]
    MT5 --> A

    style MT1 fill:#ef5350,color:#fff
    style MT2 fill:#ef5350,color:#fff
    style MT3 fill:#ef5350,color:#fff
    style MT4 fill:#ef5350,color:#fff
    style MT5 fill:#ef5350,color:#fff
    style Phase3 fill:#66bb6a,color:#fff
```

**Key insight:** Microtask queues (pink) are drained between **every** phase. The Poll phase (green) is where Node spends most of its time — waiting for I/O to complete.

### Simple Example

```js
setTimeout(() => console.log("timer"), 0);
setImmediate(() => console.log("immediate"));
Promise.resolve().then(() => console.log("microtask"));
process.nextTick(() => console.log("nextTick"));
console.log("sync");

// Output order:
// sync
// nextTick
// microtask
// timer (usually before immediate, but depends on prior I/O)
// immediate
```

### Senior-Level Q&A

**Q1: Why does `setTimeout(..., 0)` not execute immediately? What's the actual minimum delay?**

A: `setTimeout` is scheduled in the **timers phase**. If the event loop is already past the timers phase in the current iteration, your callback must wait for the next full cycle. Additionally:

- OS timer granularity: typically 1-4ms (not 0ms).
- If your system is busy, the timer fires but execution waits for JS execution to be free.
- Even `setTimeout(cb, 0)` in a tight loop won't block; it queues all callbacks for the _next_ timers phase.

```js
// Example: Timer delay varies based on event loop phase
const start = performance.now();
setTimeout(() => {
    console.log("Actual delay:", performance.now() - start); // Often 1-4ms, not 0
}, 0);
```

**Q2: Can you explain event loop starvation and how to avoid it?**

A: **Starvation** occurs when one phase prevents the event loop from progressing to I/O handling (poll phase). Common causes:

- **`process.nextTick` abuse:** Infinite `process.nextTick` loops starve I/O.

    ```js
    // BAD: Starves I/O
    function recurse() {
        process.nextTick(recurse);
    }
    recurse(); // I/O callbacks (HTTP requests, fs operations) never run
    ```

- **Tight sync loops:** Block the entire event loop.

    ```js
    // BAD: CPU blocking
    while (true) {
        /* compute */
    } // Poll phase never executes
    ```

- **Solution:** Use `setImmediate` to yield to I/O between batches.
    ```js
    // GOOD: Yields to I/O
    function batchProcess(items) {
        let i = 0;
        function process() {
            const end = Math.min(i + 100, items.length);
            for (; i < end; i++) {
                /* process item */
            }
            if (i < items.length) setImmediate(process);
        }
        process();
    }
    ```

**Q3: What's the relationship between the microtask queue and macrotask queue? Give an example of starvation.**

A:

- **Microtask queue:** `process.nextTick`, Promises (highest priority, run _between_ phases).
- **Macrotask queue:** Timers, I/O callbacks, `setImmediate` (run _during_ phases).
- Microtasks execute _before_ any macrotask in the next phase.

**Starving macrotasks with microtasks:**

```js
function recursivePromise() {
    return Promise.resolve().then(() => {
        console.log("Promise");
        return recursivePromise(); // Create infinite microtask chain
    });
}
recursivePromise();

setTimeout(() => {
    console.log("This timer may starve — never executes!"); // Waits for Promise chain
}, 0);
```

**Fix:** Yield to the event loop with a macrotask.

```js
function recursivePromise() {
    return Promise.resolve().then(() => {
        console.log("Promise");
        return new Promise((resolve) => setImmediate(() => resolve())).then(
            () => recursivePromise(),
        );
    });
}
```

**Q4: In which phase does `fs.readFile` callback execute? Why?**

A: In the **poll phase** (or pending callbacks phase if delayed). The actual file I/O is offloaded to libuv's thread pool; once complete, the callback is queued and executed when the event loop reaches the poll phase.

```js
fs.readFile("file.txt", (err, data) => {
    console.log("Runs in poll phase");
});
setImmediate(() => console.log("Check phase"));
// Output: Poll phase callback first, then check phase
```

**Q5: What happens if you call `setTimeout` with a negative or very large delay?**

A:

- **Negative:** Treated as 0 (minimum delay).
- **Large (> 24.8 days = 2^31-1 ms):** Overflows system timer, may wrap or be capped.

```js
setTimeout(() => console.log("runs"), -100); // Same as 0
setTimeout(() => console.log("large"), 2 ** 31); // May wrap on some systems; use smaller delays
```

### Best Practices

- Use `process.nextTick` only for critical post-execution callbacks; prefer `setImmediate` for scheduling work after I/O.
- Organize code: sync → `process.nextTick` (microtask) → I/O (poll) → `setImmediate` (check).
- For CPU-bound work, use `setImmediate` to yield to I/O instead of blocking the entire loop.
- Monitor event loop lag with tools like [node-clinicjs](https://clinicjs.org/) to detect blocking code.

### Common Pitfalls

- **Blocking CPU-bound work on the main thread** stalls the event loop — use worker threads or child processes for heavy computation.
- **Misunderstanding ordering** of `setTimeout(..., 0)` vs `setImmediate` leads to race surprises across different OS/Node versions.
- **Infinite microtask loops** starve macrotasks (timers, I/O); always yield with `setImmediate` in loops.
- **Assuming timer precision:** `setTimeout(cb, 100)` may execute at 101-110ms due to system load and OS granularity.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Explain the event loop in one sentence."_ → It's a single-threaded loop that processes async callbacks in 6 phases (timers → pending → idle → poll → check → close), draining microtasks between every phase.
> - _"process.nextTick vs setImmediate?"_ → `nextTick` fires before any I/O (microtask, highest priority); `setImmediate` fires after I/O in the check phase.
> - _"What blocks the event loop?"_ → Any synchronous CPU-bound operation (tight loops, JSON.parse of huge data, sync fs calls, RegEx backtracking).
> - _"setTimeout(fn, 0) vs setImmediate(fn)?"_ → Non-deterministic in the main module; inside an I/O callback, `setImmediate` always runs first.

> **📝 Quick Revision — Event Loop:**
>
> | Phase              | What runs                      | Example API                        |
> | ------------------ | ------------------------------ | ---------------------------------- |
> | Timers             | Expired setTimeout/setInterval | `setTimeout(cb, 100)`              |
> | Pending            | Deferred I/O callbacks         | TCP errors                         |
> | Poll               | New I/O events; waits if idle  | `fs.readFile` callback             |
> | Check              | setImmediate callbacks         | `setImmediate(cb)`                 |
> | Close              | Close event callbacks          | `socket.on('close')`               |
> | **Between phases** | **Microtask queue**            | `process.nextTick`, `Promise.then` |
>
> **Priority order:** sync code > `process.nextTick` > `Promise.then` > `setTimeout(0)` > `setImmediate`

### Example file: [eventloop.js](eventloop.js)

### Execution Order Visualization

This shows how different async operations execute in a real program. Follow the arrows to understand the exact order.

```mermaid
sequenceDiagram
    participant Main as Your Code
    participant Stack as Call Stack
    participant Micro as Microtask Queue
    participant Timer as Timer Queue
    participant IO as I/O Queue
    participant Check as Check Queue

    Main->>Stack: console.log('sync')
    Note over Stack: Runs immediately

    Main->>Micro: process.nextTick(cb)
    Main->>Micro: Promise.then(cb)
    Main->>Timer: setTimeout(cb, 0)
    Main->>IO: fs.readFile(cb)
    Main->>Check: setImmediate(cb)

    Note over Stack: Sync code done

    Stack->>Micro: Drain nextTick first
    Micro->>Micro: nextTick callback runs
    Micro->>Micro: Promise callback runs

    Note over Stack: Enter Timers phase
    Timer->>Stack: setTimeout callback runs

    Note over Stack: Enter Poll phase
    IO->>Stack: fs.readFile callback runs

    Note over Stack: Enter Check phase
    Check->>Stack: setImmediate callback runs

    Note over Stack: Loop complete, repeat
```

[↑ Back to Index](#table-of-contents)

---

### 1.3 libuv Thread Pool

### Concepts

Node.js is famous for being "single-threaded," but that's only half the story. Under the hood, Node uses a C library called **libuv** that manages a **thread pool** — a group of background worker threads that handle operations the OS can't do asynchronously.

**Why does Node need a thread pool?** Some system operations are inherently blocking at the OS level. For example, reading a file on most operating systems requires a blocking system call (`read()`). If Node tried to do this on its main thread, the entire server would freeze. So libuv offloads these blocking operations to background threads — your JavaScript keeps running while the file read happens in the background.

**The default pool has only 4 threads.** This is the most important thing to understand. Those 4 threads are **shared** across ALL operations that use the pool — file system operations, DNS lookups (`dns.lookup`), crypto operations, and compression (zlib). If you have 4 heavy `crypto.pbkdf2()` calls running, all 4 threads are busy, and your `fs.readFile()` must **wait in line** until a thread frees up.

**What DOESN'T use the thread pool?** Network I/O (TCP, HTTP, WebSocket) uses the operating system's own async mechanisms — `epoll` on Linux, `kqueue` on macOS, `IOCP` on Windows. These are truly non-blocking at the OS level, so they don't need pool threads. This is why Node handles thousands of network connections efficiently on a single thread.

**Think of it this way:** The event loop is like a receptionist who can handle many phone calls simultaneously (network I/O). But when someone asks for a file from the back room, the receptionist must send one of only 4 assistants (thread pool) to fetch it. If all 4 assistants are busy, the next file request waits.

```mermaid
graph TB
    EL["Event Loop<br/>(Main Thread)<br/>Your JavaScript runs here"]

    subgraph ThreadPool ["libuv Thread Pool (default: 4 threads)"]
        T1["Thread 1"]
        T2["Thread 2"]
        T3["Thread 3"]
        T4["Thread 4"]
    end

    subgraph OSAsync ["OS Async Primitives<br/>(no pool needed)"]
        Net["TCP/HTTP sockets"]
        DNS2["dns.resolve()"]
        Timers["setTimeout/setInterval"]
    end

    FS["fs.readFile<br/>fs.writeFile"] --> T1
    DNS["dns.lookup()"] --> T2
    Crypto["crypto.pbkdf2<br/>crypto.randomBytes"] --> T3
    Zlib["zlib.gzip<br/>zlib.deflate"] --> T4

    HTTP["http.get<br/>net.connect"] --> Net
    Resolve["dns.resolve4()"] --> DNS2
    Timer["setTimeout(cb)"] --> Timers

    T1 --> EL
    T2 --> EL
    T3 --> EL
    T4 --> EL
    Net --> EL
    DNS2 --> EL
    Timers --> EL

    style EL fill:#2196f3,color:#fff
    style ThreadPool fill:#ffa726,color:#fff
    style OSAsync fill:#66bb6a,color:#fff
```

### Which APIs Use the Thread Pool?

| Uses Thread Pool             | Uses OS Async (no pool) |
| ---------------------------- | ----------------------- |
| `fs.*` (all file operations) | `net.*` (TCP sockets)   |
| `dns.lookup()`               | `dns.resolve()`         |
| `crypto.pbkdf2()`            | `http.*` (network I/O)  |
| `crypto.randomBytes()`       | Timers (`setTimeout`)   |
| `zlib.*` (compression)       | `child_process.*`       |
| Pipes (some platforms)       | `process.nextTick()`    |

### Thread Pool Saturation Problem

```js
// ❌ PROBLEM: 4 concurrent crypto operations saturate the pool
// All other fs/dns operations must wait!

const crypto = require("crypto");
const fs = require("fs");

// These 4 crypto ops occupy ALL 4 threads
for (let i = 0; i < 4; i++) {
    crypto.pbkdf2("password", "salt", 100000, 64, "sha512", () => {
        console.log(`Crypto ${i} done`);
    });
}

// This fs operation must WAIT until a thread frees up
fs.readFile("config.json", (err, data) => {
    console.log("File read done"); // Delayed by crypto operations!
});

// ✅ FIX: Increase thread pool size
// Set BEFORE any async operations (at very top of entry file)
process.env.UV_THREADPOOL_SIZE = 16; // Max recommended: 128

// Or set via command line:
// UV_THREADPOOL_SIZE=16 node app.js
```

### Senior-Level Q&A

**Q1: Your DNS lookups are slow in production. What could be wrong?**

A: `dns.lookup()` uses the libuv thread pool (not OS async). If pool is saturated (e.g., heavy `fs` or `crypto` ops), DNS lookups queue behind them.

```js
// ❌ Slow: dns.lookup uses thread pool
const http = require("http");
// http.get uses dns.lookup by default

// ✅ Fix 1: Increase pool size
process.env.UV_THREADPOOL_SIZE = 16;

// ✅ Fix 2: Use dns.resolve (bypasses thread pool, uses OS async)
const dns = require("dns");
const { Resolver } = dns;
const resolver = new Resolver();
resolver.resolve4("example.com", (err, addresses) => {
    // Uses OS async — not affected by thread pool saturation
});

// ✅ Fix 3: Cache DNS results
const dnscache = require("dnscache")({ enable: true, ttl: 300 });
```

**Q2: How do you determine the right `UV_THREADPOOL_SIZE` for your app?**

A: Profile your app to see how many concurrent thread-pool operations occur:

```js
// Monitor thread pool usage
const { performance, PerformanceObserver } = require("perf_hooks");

// Rule of thumb:
// UV_THREADPOOL_SIZE = max concurrent (fs + dns.lookup + crypto + zlib) operations
// Default: 4 | Heavy I/O apps: 16-64 | Max: 128

// ⚠️ Too many threads = context switching overhead + memory waste
// Each thread: ~8KB stack + OS overhead
```

**Q3: Why does `dns.lookup()` use the thread pool but `dns.resolve()` doesn't?**

A: `dns.lookup()` calls the OS's `getaddrinfo()` which is a blocking C library call — must be offloaded to a thread. `dns.resolve()` uses c-ares (async DNS library) that uses non-blocking I/O — no thread needed.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Is Node.js single-threaded?"_ → JavaScript runs on one thread, but libuv manages a thread pool (default 4) for blocking operations like fs, crypto, dns.lookup, and zlib.
> - _"Why are my DNS lookups slow?"_ → `dns.lookup()` uses the libuv thread pool. If it's saturated by fs/crypto ops, DNS queues behind them. Use `dns.resolve()` (OS async) or increase `UV_THREADPOOL_SIZE`.
> - _"How many threads should I use?"_ → `UV_THREADPOOL_SIZE` = max concurrent (fs + dns.lookup + crypto + zlib) operations. Default 4, max 128. Too many = context-switch overhead.

> **📝 Quick Revision — libuv Thread Pool:**
>
> | Uses Thread Pool                             | Uses OS Async (no pool)                    |
> | -------------------------------------------- | ------------------------------------------ |
> | `fs.*`, `dns.lookup()`, `crypto.*`, `zlib.*` | `net.*`, `http.*`, `dns.resolve()`, timers |
>
> **Key number:** Default = 4 threads. Set `UV_THREADPOOL_SIZE` **before** any async operation.

[↑ Back to Index](#table-of-contents)

---

### 1.4 Buffer & Binary Data

### Concepts

JavaScript was designed for web pages — it's great with text (strings), but traditionally weak with raw binary data. **Buffer** fills this gap in Node.js. It represents a chunk of raw memory (like an array of bytes) that Node uses to handle binary data: file contents, network packets, images, encrypted data, etc.

**Why not just use strings?** Strings in JavaScript are encoded as UTF-16 internally, which means every character takes 2 bytes minimum. Binary data (like a PNG image or a TCP packet) isn't text — it's just raw bytes. If you tried to read a PNG file as a string, you'd get garbled data. Buffer lets you work with the raw bytes directly.

**Where Buffers live in memory:** Unlike regular JavaScript objects that live on V8's heap (managed by the garbage collector), Buffers allocate memory **outside** the V8 heap using C++ bindings. This is important because V8's heap has a size limit (~1.5GB), but Buffer memory doesn't count against it. You can allocate much larger Buffers — though you should use streams for truly large data.

**Encoding** is how you convert between Buffers (raw bytes) and strings (human-readable text). Common encodings:

- `utf8` — Standard text encoding (default). Each character is 1-4 bytes
- `base64` — Encodes binary as ASCII text (used in APIs, email attachments)
- `hex` — Each byte represented as 2 hex characters (used in hashes, debugging)
- `ascii` — 7-bit encoding, only English characters

**The dangerous gotcha:** `Buffer.slice()` does NOT copy data — it creates a **view** into the same memory. If you modify the slice, the original changes too. And if you keep a tiny slice reference, the entire original buffer stays in memory. Always use `Buffer.from()` to make an independent copy.

```mermaid
graph LR
    subgraph JS ["V8 Heap (JavaScript Objects)"]
        Str["const name = 'Alice'<br/>Stored as UTF-16<br/>10 bytes for 5 chars"]
        Obj["const user = { id: 1 }<br/>Managed by GC"]
    end

    subgraph Native ["C++ Memory (Outside V8 Heap)"]
        Buf["Buffer.alloc(1024)<br/>Raw bytes<br/>Not limited by V8 heap"]
        Unsafe["Buffer.allocUnsafe(1024)<br/>Fast but may contain<br/>old memory data"]
    end

    subgraph Encode ["Encoding Conversions"]
        UTF8["UTF-8: 'Hello' → 48 65 6c 6c 6f"]
        B64["Base64: binary → ASCII text"]
        Hex["Hex: each byte → 2 hex chars"]
    end

    Buf --> UTF8
    Buf --> B64
    Buf --> Hex

    style JS fill:#42a5f5,color:#fff
    style Native fill:#ffa726,color:#fff
    style Encode fill:#66bb6a,color:#fff
```

### Key APIs

| Method                     | Description                                        | Returns  |
| -------------------------- | -------------------------------------------------- | -------- |
| `Buffer.alloc(size)`       | Allocate zero-filled buffer (safe)                 | Buffer   |
| `Buffer.allocUnsafe(size)` | Allocate without zeroing (fast, may leak old data) | Buffer   |
| `Buffer.from(string, enc)` | Create from string with encoding                   | Buffer   |
| `Buffer.from(array)`       | Create from byte array                             | Buffer   |
| `buf.toString(enc)`        | Convert to string                                  | String   |
| `buf.slice(start, end)`    | Reference same memory (no copy!)                   | Buffer   |
| `Buffer.concat(buffers)`   | Merge multiple buffers                             | Buffer   |
| `buf.compare(other)`       | Compare for sorting                                | -1, 0, 1 |

### Buffer Safety

```js
// ✅ SAFE: Zero-filled (no old data leakage)
const safeBuf = Buffer.alloc(256);

// ⚠️ UNSAFE: May contain old memory data (faster)
const unsafeBuf = Buffer.allocUnsafe(256);
// Only use when you will immediately overwrite all bytes

// ✅ From string
const greeting = Buffer.from("Hello, World!", "utf8");
console.log(greeting.toString()); // 'Hello, World!'
console.log(greeting.toString("base64")); // 'SGVsbG8sIFdvcmxkIQ=='
console.log(greeting.toString("hex")); // '48656c6c6f2c20576f726c6421'

// ⚠️ Slice shares memory (mutation affects original!)
const original = Buffer.from("Hello");
const slice = original.slice(0, 3);
slice[0] = 74; // ASCII 'J'
console.log(original.toString()); // 'Jello' — Original mutated!

// ✅ Safe copy
const copy = Buffer.from(original); // Independent copy
```

### Encoding Conversions

```js
// Base64 encode/decode (common for API tokens, file uploads)
const text = "user:password";
const base64 = Buffer.from(text).toString("base64"); // 'dXNlcjpwYXNzd29yZA=='
const decoded = Buffer.from(base64, "base64").toString(); // 'user:password'

// Hex for hashes
const crypto = require("crypto");
const hash = crypto.createHash("sha256").update("data").digest("hex");
// '3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7'

// Binary file handling
const fs = require("fs");
const fileBuffer = fs.readFileSync("image.png"); // Returns Buffer
console.log(fileBuffer.length); // File size in bytes
console.log(fileBuffer[0], fileBuffer[1]); // First 2 bytes (PNG magic: 137, 80)
```

### Senior-Level Q&A

**Q1: What's the difference between `Buffer.alloc()` and `Buffer.allocUnsafe()`? When use unsafe?**

A: `alloc()` zero-fills memory (safe but slower). `allocUnsafe()` skips zeroing (faster but may expose old data from memory).

Use `allocUnsafe()` only when you will **immediately fill** the entire buffer (e.g., receiving network data, reading file into buffer). Never send uninitialized buffer content to users.

**Q2: How do Buffers relate to streams?**

A: Streams internally use Buffers as chunks. Each `data` event emits a Buffer (unless in object mode). `highWaterMark` controls the Buffer size threshold for backpressure.

```js
const readable = fs.createReadStream("file.txt");
readable.on("data", (chunk) => {
    console.log(chunk instanceof Buffer); // true
    console.log(chunk.length); // Bytes in this chunk (≤ highWaterMark)
});
```

**Q3: Can Buffer operations cause memory leaks?**

A: Yes — `Buffer.slice()` shares memory with the original. If you keep a small slice reference, the entire original buffer stays in memory (can't be GC'd).

```js
// ❌ Memory leak: Keeping small slice prevents GC of large buffer
function leak() {
    const bigBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    return bigBuffer.slice(0, 10); // 10 bytes, but 10MB stays in memory!
}

// ✅ Fix: Copy the needed bytes
function noLeak() {
    const bigBuffer = Buffer.alloc(10 * 1024 * 1024);
    return Buffer.from(bigBuffer.slice(0, 10)); // Independent 10-byte copy
}
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What is a Buffer?"_ → A fixed-size chunk of raw memory outside V8's heap, used for binary data (files, network packets, crypto output).
> - _"alloc vs allocUnsafe?"_ → `alloc` zero-fills (safe, slower). `allocUnsafe` skips zeroing (fast, may leak old memory). Only use unsafe when you'll immediately overwrite all bytes.
> - _"Why does Buffer.slice() cause memory leaks?"_ → `slice()` shares the original memory. A 10-byte slice keeps the entire 10MB parent alive. Use `Buffer.from(slice)` to copy.

> **📝 Quick Revision — Buffer:**
>
> | Method                  | Safe?            | Use when                                              |
> | ----------------------- | ---------------- | ----------------------------------------------------- |
> | `Buffer.alloc(n)`       | ✅ Yes           | Default choice, zero-filled                           |
> | `Buffer.allocUnsafe(n)` | ⚠️ No            | Performance critical, will fill immediately           |
> | `Buffer.from(str, enc)` | ✅ Yes           | Converting strings ↔ binary                           |
> | `buf.slice()`           | ⚠️ Shares memory | Read-only views; copy with `Buffer.from()` if keeping |
>
> **Key gotcha:** Buffers live outside V8 heap → don't count against `--max-old-space-size` but DO count against system RAM.

[↑ Back to Index](#table-of-contents)

---

## Phase 2 — Core Async & Data Flow

### 2.1 Async Patterns

### Concepts

Asynchronous programming is the **core skill** of Node.js development. In traditional languages like Java or Python, when your code reads a file or calls an API, the thread **blocks** — it sits and waits for the result, doing nothing. Multiply that by thousands of users, and you need thousands of threads (expensive memory-wise).

Node.js flips this model: instead of waiting, your code says "go read that file, and here's a function to call when you're done" — then it immediately moves on to handle the next request. This is **non-blocking I/O**, and it's why a single Node process can handle thousands of concurrent connections.

**The evolution of async in JavaScript:**

1. **Callbacks (2009):** The original pattern. You pass a function that runs when the async work completes. The convention is `callback(error, result)` — error first. The problem? When you chain multiple operations, the code nests deeper and deeper, forming the infamous **"callback hell"** — unreadable, unmaintainable pyramids of code.

2. **Promises (2015, ES6):** A Promise is an object that represents a future value. Instead of nesting, you **chain** `.then()` calls. Errors propagate through `.catch()`. Much cleaner, but long chains still drift horizontally.

3. **Async/Await (2017, ES8):** Syntactic sugar over Promises. You write code that **looks** synchronous but behaves asynchronously. `await` pauses execution of the current function (not the thread!) until the Promise resolves. Combined with `try/catch`, it's the cleanest way to handle async operations.

**Key principle:** All three patterns do the same thing — they schedule work to run later. The difference is only in readability and error handling. Under the hood, `async/await` compiles to Promises, and Promises use the microtask queue.

```mermaid
flowchart LR
    subgraph Evolution ["JavaScript Async Evolution"]
        direction TB
        CB["Callbacks (2009)<br/>fs.readFile(path, callback)<br/><br/>Pros: Simple, universal<br/>Cons: Callback hell, error handling"]
        PR["Promises (2015)<br/>fs.promises.readFile(path)<br/>.then(data => ...)<br/><br/>Pros: Chainable, composable<br/>Cons: Horizontal drift"]
        AA["Async/Await (2017)<br/>const data = await readFile(path)<br/><br/>Pros: Reads like sync code<br/>Cons: Need Promise.all for parallel"]

        CB -->|"Improved by"| PR
        PR -->|"Improved by"| AA
    end

    style CB fill:#ef5350,color:#fff
    style PR fill:#ffee58,color:#000
    style AA fill:#66bb6a,color:#fff
```

### Key APIs

- `fs.readFile(path, cb)` (callback style) vs `fs.promises.readFile(path)` (promise style).
- `Promise.all(promises)` — wait for all; reject if any fails.
- `Promise.allSettled(promises)` — wait for all; resolve with results and reasons (no early rejection).
- `Promise.race(promises)` — return first settled promise.
- `Promise.any(promises)` — return first fulfilled promise (rejects only if all fail).

### Comparison Table

| Pattern         | Error Handling        | Composability  | Readability    | Common Issues                             |
| --------------- | --------------------- | -------------- | -------------- | ----------------------------------------- |
| **Callback**    | Passed as error param | Poor (nesting) | Hard to follow | Callback hell, forgotten error checks     |
| **Promise**     | `.catch()` chaining   | Good           | Better         | Unhandled rejections, need explicit catch |
| **Async/Await** | `try/catch` blocks    | Excellent      | Excellent      | Harder to parallelize without `.all()`    |

### Promise State Machine & Execution Flow

A Promise is always in one of three states. Once it moves to Fulfilled or Rejected, it **never** changes again — the value/error is locked in forever. This immutability is what makes Promises safe to share across multiple `.then()` handlers.

```mermaid
stateDiagram-v2
    [*] --> Pending: new Promise(executor)

    state Pending {
        [*] --> Waiting: Async operation running
        Waiting --> Waiting: Still processing...
    }

    Pending --> Fulfilled: resolve(value) called
    Pending --> Rejected: reject(error) called
    Pending --> Rejected: executor throws Error

    state Fulfilled {
        [*] --> ValueLocked: Value is immutable
        ValueLocked --> RunThen: Execute all .then() handlers
    }

    state Rejected {
        [*] --> ErrorLocked: Error is immutable
        ErrorLocked --> RunCatch: Execute all .catch() handlers
        ErrorLocked --> Unhandled: No .catch() attached!
    }

    Fulfilled --> [*]
    Rejected --> [*]
```

### Async Execution Order (Priority - Highest to Lowest)

This diagram shows the **exact execution order** when you mix different async patterns. This is the most common interview question about the event loop.

```mermaid
sequenceDiagram
    participant Code as Your Code
    participant NT as process.nextTick
    participant P as Promise.then
    participant T as setTimeout(0)
    participant I as setImmediate
    participant IO as I/O callback

    Note over Code: Step 1 — All sync code runs first
    Code->>Code: console.log('1 - sync')
    Code->>NT: schedule nextTick
    Code->>P: schedule Promise.then
    Code->>T: schedule setTimeout(0)
    Code->>I: schedule setImmediate
    Code->>IO: start fs.readFile

    Note over Code: Step 2 — Sync done, drain microtasks
    rect rgba(211, 47, 47, 0.25)
        NT->>NT: 2 - nextTick runs (highest priority)
        P->>P: 3 - Promise.then runs (microtask)
    end

    Note over Code: Step 3 — Event loop phases begin
    rect rgba(56, 142, 60, 0.25)
        T->>T: 4 - setTimeout runs (Timers phase)
        I->>I: 5 - setImmediate runs (Check phase)
        IO->>IO: 6 - fs callback (when I/O completes)
    end

    Note over Code: Final Output — 1, 2, 3, 4, 5, 6
```

### Detailed Examples

#### Callback Hell & Alternatives

```js
// Callback hell (hard to read and maintain)
fs.readFile("file1.txt", (err, data1) => {
    if (err) return console.error(err);
    fs.readFile("file2.txt", (err, data2) => {
        if (err) return console.error(err);
        fs.readFile("file3.txt", (err, data3) => {
            if (err) return console.error(err);
            console.log(data1, data2, data3);
        });
    });
});

// Promise chaining (clearer)
fs.promises
    .readFile("file1.txt", "utf8")
    .then((data1) =>
        fs.promises
            .readFile("file2.txt", "utf8")
            .then((data2) => [data1, data2]),
    )
    .then(([data1, data2]) =>
        fs.promises
            .readFile("file3.txt", "utf8")
            .then((data3) => [data1, data2, data3]),
    )
    .then(([data1, data2, data3]) => console.log(data1, data2, data3))
    .catch((err) => console.error(err));

// Async/await (most readable)
async function loadFiles() {
    try {
        const data1 = await fs.promises.readFile("file1.txt", "utf8");
        const data2 = await fs.promises.readFile("file2.txt", "utf8");
        const data3 = await fs.promises.readFile("file3.txt", "utf8");
        console.log(data1, data2, data3);
    } catch (err) {
        console.error(err);
    }
}
```

#### Error Handling Patterns

```js
// Pattern 1: Promise.catch()
fetchUser(id)
    .then((user) => fetchPosts(user.id))
    .then((posts) => console.log(posts))
    .catch((err) => console.error("Error:", err.message));

// Pattern 2: Async/await with try/catch
async function loadUserPosts(id) {
    try {
        const user = await fetchUser(id);
        const posts = await fetchPosts(user.id);
        console.log(posts);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

// Pattern 3: Catching specific errors
async function robustFetch(id) {
    try {
        return await fetchUser(id);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log("Not found, using default");
            return { id, name: "Default" };
        }
        throw err; // Re-throw unexpected errors
    }
}
```

### Senior-Level Q&A

**Q1: What's the difference between `Promise.all()` and `Promise.allSettled()`? When would you use each?**

A:

- **`Promise.all()`:** Rejects immediately if ANY promise rejects. You get all results only if ALL succeed.
- **`Promise.allSettled()`:** Always resolves (never rejects). Returns `[{status, value} | {status, reason}]` for each promise.

**Use `Promise.all()` when:**

- You need all results to proceed (e.g., loading critical resources).
- One failure should cancel everything (fail-fast).

**Use `Promise.allSettled()` when:**

- You need results from all even if some fail (e.g., batch user updates, metrics collection).
- You want to process successes and failures separately.

```js
// Example: Batch API calls with mixed success/failure
const results = await Promise.allSettled([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3), // One might fail
]);

results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
        console.log(`User ${idx}:`, result.value);
    } else {
        console.log(`User ${idx} failed:`, result.reason.message);
    }
});
```

**Q2: Explain how promise chaining can cause "horizontal drift" and how to avoid it.**

A: **Horizontal drift:** Each `.then()` adds nesting indentation, reducing readability of long chains.

```js
// Horizontal drift (hard to read)
user()
    .then((u) =>
        posts(u.id).then((p) =>
            likes(p[0].id).then((l) =>
                comments(l[0].id).then((c) => console.log(c)),
            ),
        ),
    )
    .catch(console.error);

// Fix: Flatten the chain by returning values
user()
    .then((u) => posts(u.id))
    .then((p) => likes(p[0].id))
    .then((l) => comments(l[0].id))
    .then((c) => console.log(c))
    .catch(console.error);

// Best: Use async/await
async function getComments() {
    try {
        const u = await user();
        const p = await posts(u.id);
        const l = await likes(p[0].id);
        const c = await comments(l[0].id);
        console.log(c);
    } catch (err) {
        console.error(err);
    }
}
```

**Q3: What's an unhandled promise rejection? How do you debug it?**

A: **Unhandled rejection:** A promise rejects but has no `.catch()` or `try/catch` handler.

```js
// Unhandled rejection (will crash or warn)
async function badCode() {
    throw new Error("Oops");
}
badCode(); // ⚠️ Unhandled rejection! Not caught!

// Catch it properly
badCode().catch(console.error); // ✅ Handled
```

**Debug with:**

```js
// Global handler for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
    // Log for debugging, then exit or recover
});

// Or use --unhandled-rejections flag
// node --unhandled-rejections=strict app.js
```

**Q4: Explain the difference between these two patterns:**

```js
// Pattern A
async function fetchData() {
    const a = await fetch1();
    const b = await fetch2();
    return [a, b];
}

// Pattern B
async function fetchDataFast() {
    const [a, b] = await Promise.all([fetch1(), fetch2()]);
    return [a, b];
}
```

A: **Time complexity:**

- **Pattern A:** Sequential. Total time = `fetch1()` + `fetch2()` (if fetch2 depends on a, this is correct).
- **Pattern B:** Parallel. Total time = max(`fetch1()`, `fetch2()`) (both run concurrently).

**Pattern B is faster if fetch1 and fetch2 are independent.** Use Pattern A only if the second operation depends on the first result.

```js
// Pattern A: Sequential (fetch2 needs data from fetch1)
async function getUser(id) {
    const user = await fetchUser(id); // Must come first
    const posts = await fetchPosts(user.id); // Depends on user.id
    return { user, posts };
}

// Pattern B: Parallel (independent operations)
async function getMetrics() {
    const [users, posts, comments] = await Promise.all([
        fetchAllUsers(), // Independent
        fetchAllPosts(), // Independent
        fetchAllComments(), // Independent
    ]);
    return { users, posts, comments };
}
```

**Q5: What's Promise.any() and when is it useful?**

A: **`Promise.any()`** — returns the first _fulfilled_ promise (2021 addition). Rejects only if ALL promises fail.

```js
// Use case: Race multiple CDNs, use first successful response
const image = await Promise.any([
    fetch('cdn1.example.com/image.jpg'),
    fetch('cdn2.example.com/image.jpg'),
    fetch('cdn3.example.com/image.jpg'),
]); // Returns first successful fetch

// vs Promise.race: Returns first *settled* (even if rejected)
const fastest = await Promise.race([...]); // Could return an error
```

### Best Practices

- **Always handle rejections:** Use `.catch()` or `try/catch` for every async operation.
- **Use async/await for readability** over promise chains in new code.
- **Parallelize when possible:** Use `Promise.all()` for independent async operations.
- **Fail fast on critical errors:** Use `Promise.all()` for critical paths; use `Promise.allSettled()` for optional/batch operations.
- **Monitor unhandled rejections:** Install a global handler in production apps.

### Common Pitfalls

- **Forgetting to await or `.catch()`** results in unhandled rejections.
- **Serial instead of parallel:** Using sequential `await` in loops when operations are independent (performance regression).

    ```js
    // ❌ BAD: Serial (slow)
    for (const id of ids) {
        await fetchData(id); // Wait for each one
    }

    // ✅ GOOD: Parallel (fast)
    await Promise.all(ids.map((id) => fetchData(id)));
    ```

- **Mixing callbacks and promises:** Error in callbacks don't automatically reject the promise.

    ```js
    // ❌ BAD: Callback error not caught by promise
    new Promise((resolve) => {
        fs.readFile("file", "utf8", (err, data) => {
            if (err) throw err; // Error escapes!
        });
    });

    // ✅ GOOD
    new Promise((resolve, reject) => {
        fs.readFile("file", "utf8", (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
    ```

### References: [async.js](async.js), [async.txt](async.txt)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Callbacks vs Promises vs async/await?"_ → Same thing under the hood. Callbacks nest (hell). Promises chain (.then). Async/await reads like sync code. All use microtask queue.
> - _"Promise.all vs allSettled?"_ → `all` fails fast (rejects if ANY rejects). `allSettled` always resolves — gives you `{status, value/reason}` for every promise.
> - _"Sequential vs parallel await?"_ → `await a; await b;` = sequential. `await Promise.all([a, b])` = parallel. If independent, always parallelize.
> - _"What's an unhandled rejection?"_ → A promise rejects with no `.catch()` or `try/catch`. Node 15+ crashes the process. Always add a global `unhandledRejection` handler.

> **📝 Quick Revision — Async Patterns:**
>
> | Pattern     | Error Handling            | Best For              |
> | ----------- | ------------------------- | --------------------- |
> | Callback    | `if (err) return cb(err)` | Legacy APIs           |
> | Promise     | `.catch()`                | Composition, chaining |
> | Async/Await | `try/catch`               | New code, readability |
>
> | Orchestration          | Behavior                          | Use When                                 |
> | ---------------------- | --------------------------------- | ---------------------------------------- |
> | `Promise.all()`        | Fail-fast on first reject         | All results needed, any failure is fatal |
> | `Promise.allSettled()` | Always resolves                   | Batch ops, partial success OK            |
> | `Promise.race()`       | First settled (fulfill or reject) | Timeout patterns                         |
> | `Promise.any()`        | First fulfilled                   | Fastest successful response (CDN racing) |

[↑ Back to Index](#table-of-contents)

---

### 2.2 Error Handling Patterns

### Concepts

Error handling in Node.js is not just about catching exceptions — it's about **building resilient systems** that fail gracefully, protect user data, and recover automatically.

**Why Node.js errors are special:** When an error isn't caught in a browser, the page might glitch but the user refreshes. When an error isn't caught in Node.js, **the entire server process crashes** — every connected user is disconnected, every pending request is lost. This is why error handling is a first-class concern.

**Two fundamentally different types of errors:**

1. **Operational errors** (expected things that go wrong): A database is down, a file doesn't exist, a user sends invalid input, a network request times out. These are **normal** — you should handle them gracefully (retry, show a message, use a fallback). Your code is correct; the external world is just unpredictable.

2. **Programmer errors** (bugs): Accessing a property on `undefined`, passing a string where a number is expected, forgetting to `await` a promise. These are **your fault** — the correct response is to **crash the process and fix the bug**. Trying to "handle" a bug often makes things worse by letting the process continue in a corrupted state.

**The Error-First Callback convention:** Node's original APIs all follow the pattern `callback(error, result)`. You **always** check `err` before using `result`. This convention predates Promises and is still used in many libraries. If you see `if (err) return callback(err)`, that's the error-first pattern.

**Unhandled rejections = silent bugs:** Before Node 15, an unhandled Promise rejection just printed a warning. Starting with Node 15, it **crashes the process** (like an uncaught exception). This was a deliberate change because unhandled rejections hide bugs that cause mysterious failures hours later.

### Error Classification

| Type            | Example                               | Action                        |
| --------------- | ------------------------------------- | ----------------------------- |
| **Operational** | ECONNREFUSED, ENOENT, 404, timeout    | Handle, retry, or inform user |
| **Programmer**  | TypeError, ReferenceError, null deref | Fix the bug, crash + restart  |
| **System**      | ENOMEM, EMFILE (too many open files)  | Alert, scale, or reduce load  |

### Custom Error Classes

```js
// Base application error
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class DatabaseError extends AppError {
    constructor(message) {
        super(message, 500, false); // Not operational — bug
    }
}

// Usage
async function getUser(id) {
    const user = await db.findById(id);
    if (!user) throw new NotFoundError("User");
    return user;
}
```

### Express Error Handling Middleware

```js
// Centralized error handler (MUST have 4 params)
function errorHandler(err, req, res, next) {
    // Log all errors
    console.error({
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
    });

    // Operational errors: send meaningful response
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }

    // Programmer errors: generic response, alert team
    res.status(500).json({ error: "Internal server error" });
}

// Usage
app.get("/users/:id", async (req, res, next) => {
    try {
        const user = await getUser(req.params.id);
        res.json(user);
    } catch (err) {
        next(err); // Pass to error middleware
    }
});

app.use(errorHandler); // Must be last middleware
```

### Global Error Handlers

```js
// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
    // In production: log, alert, then shutdown gracefully
    // process.exit(1); // Node 15+ crashes by default
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    // MUST exit — process state is unreliable after uncaught exception
    process.exit(1);
});

// Catch warnings (e.g., MaxListenersExceeded)
process.on("warning", (warning) => {
    console.warn("Warning:", warning.name, warning.message);
});
```

### Senior-Level Q&A

**Q1: Should you catch all errors and keep the process alive? Why not?**

A: **No.** After an uncaught exception, Node's state is unreliable (corrupted memory, leaked resources). You should:

1. Log the error with full context
2. Attempt graceful shutdown (close connections, finish requests)
3. Exit and let a process manager (PM2, systemd) restart

```js
process.on("uncaughtException", (err) => {
    logger.fatal(err, "Uncaught exception — shutting down");
    server.close(() => process.exit(1));
    // Force kill if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10000);
});
```

**Q2: How do you handle errors in `Promise.all()` without failing the entire batch?**

A: Use `Promise.allSettled()` or wrap individual promises:

```js
// Option 1: allSettled
const results = await Promise.allSettled(urls.map(fetch));
const successes = results.filter((r) => r.status === "fulfilled");
const failures = results.filter((r) => r.status === "rejected");

// Option 2: Wrap with error catch
const safeResults = await Promise.all(
    urls.map((url) => fetch(url).catch((err) => ({ error: err.message, url }))),
);
```

**Q3: What's the difference between `throw` in async vs sync functions?**

A:

- **Sync `throw`:** Creates a synchronous exception — caught by `try/catch`
- **Async `throw`:** Rejects the returned promise — caught by `.catch()` or `try/catch` with `await`

```js
// Sync: Caught by try/catch
function syncFn() {
    throw new Error("sync");
}
try {
    syncFn();
} catch (e) {
    /* caught */
}

// Async: Returns rejected promise
async function asyncFn() {
    throw new Error("async");
}
asyncFn().catch((e) => {
    /* caught */
});

// ⚠️ GOTCHA: throw inside callback is NOT caught by async try/catch
async function gotcha() {
    try {
        setTimeout(() => {
            throw new Error("oops");
        }, 0); // NOT caught!
    } catch (e) {
        // Never reaches here
    }
}
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Operational vs programmer errors?"_ → Operational = expected (DB down, file missing) → handle gracefully. Programmer = bugs (null deref, wrong types) → crash and fix.
> - _"Should you catch all errors and keep the process alive?"_ → No. After an uncaught exception, state is unreliable. Log, graceful shutdown, let PM2 restart.
> - _"How does Express handle errors?"_ → Error middleware with 4 params `(err, req, res, next)` — must be last `app.use()`. Async errors need `next(err)` or express-async-errors.

> **📝 Quick Revision — Error Handling:**
>
> | Error Type  | Example                    | Action                       |
> | ----------- | -------------------------- | ---------------------------- |
> | Operational | ECONNREFUSED, 404, timeout | Retry, fallback, inform user |
> | Programmer  | TypeError, null deref      | Crash, fix the bug, restart  |
> | System      | ENOMEM, EMFILE             | Alert ops team, scale up     |
>
> **Golden rule:** Never swallow errors silently. Log + alert + graceful shutdown.

[↑ Back to Index](#table-of-contents)

---

### 2.3 Event Emitters

### Concepts

Event Emitters implement the **Observer pattern** (also called pub/sub) in Node.js. Think of it like a radio station: the station **emits** (broadcasts) signals, and anyone with a radio **listens** for those signals. The station doesn't know how many radios are tuned in, and each radio doesn't know about the others.

**Why are they important?** EventEmitter is the **foundation of most Node.js APIs**. When you write `server.on('request', handler)`, `stream.on('data', chunk => ...)`, or `process.on('exit', ...)`, you're using EventEmitter. HTTP servers, streams, child processes, file watchers — they all inherit from EventEmitter.

**How it works:** An EventEmitter object maintains a list of listener functions for each event name. When you call `emitter.emit('data', payload)`, it calls every function registered for the `'data'` event, in the order they were added. It's **synchronous** — each listener runs one after another, not in parallel.

**The memory leak trap:** The #1 issue with EventEmitters is **forgetting to remove listeners**. Every time you call `.on()`, a new function reference is stored. If you attach listeners in a loop or request handler without removing them, the list grows forever. Node warns you at 10 listeners per event — this isn't a limit, it's a **leak detector**. If you legitimately need more, use `setMaxListeners()`, but first confirm you're not leaking.

```mermaid
graph TB
    subgraph Emitter ["EventEmitter Object"]
        direction TB
        Events["Internal listener map"]
        E1["'data' event → [handler1, handler2]"]
        E2["'error' event → [errorHandler]"]
        E3["'close' event → [cleanup]"]
    end

    Code1["Module A<br/>emitter.on 'data', handler1"] --> E1
    Code2["Module B<br/>emitter.on 'data', handler2"] --> E1
    Code3["Module C<br/>emitter.on 'error', errorHandler"] --> E2

    Trigger["emitter.emit 'data', payload"] --> E1
    E1 --> Run1["handler1(payload) runs"]
    E1 --> Run2["handler2(payload) runs"]
    Run1 --> Done["Both run synchronously<br/>in registration order"]
    Run2 --> Done

    style Emitter fill:#42a5f5,color:#fff
    style Trigger fill:#ffee58,color:#000
    style Done fill:#66bb6a,color:#fff
```

### Key APIs

- `emitter.on(event, listener)` — attach listener (runs every time event fires).
- `emitter.once(event, listener)` — attach listener for single execution.
- `emitter.removeListener(event, listener)` — remove specific listener.
- `emitter.removeAllListeners(event)` — remove all listeners for an event.
- `emitter.listeners(event)` — get array of listeners.
- `emitter.setMaxListeners(n)` — increase default limit (10).

### Senior-Level Q&A

**Q1: Why does Node warn at 10+ listeners and how do you debug this warning?**

A: The warning prevents **memory leaks** from forgotten listener references. A single event with 100+ listeners indicates:

- Listeners not removed in cleanup/destructors
- Repeated attachment without deduplication
- (Rarely) legitimately high listener count

```js
// ❌ Memory leak: Listeners pile up
const { EventEmitter } = require("events");
const emitter = new EventEmitter();

function attachListeners() {
    emitter.on("data", () => {
        console.log("Processing data");
    });
}

// Called repeatedly, listeners accumulate
setInterval(attachListeners, 100);
// After 1 second: 10 listeners, warning appears

// ✅ Fix: Remove listeners on cleanup
class DataProcessor {
    constructor(emitter) {
        this.emitter = emitter;
        this.handler = () => console.log("Processing");
    }

    attach() {
        this.emitter.on("data", this.handler);
    }

    detach() {
        this.emitter.removeListener("data", this.handler);
    }
}

// Debug: Check listener count
console.log(emitter.listenerCount("data")); // Get count for specific event
console.log(emitter.listeners("data")); // Get actual functions
```

**Q2: Your Express app creates a new EventEmitter inside each request handler. Is this a memory leak?**

A: Not if the emitter is garbage-collected after the request. But if you attach persistent listeners, they leak:

```js
// ❌ LEAK: Listener survives request
const express = require("express");
const app = express();
const { EventEmitter } = require("events");
const globalEmitter = new EventEmitter();

app.get("/api/data", (req, res) => {
    globalEmitter.on("update", () => {
        // Attached once per request, never removed
        res.json({ data: "updated" });
    });
});

// After 1000 requests: 1000 listeners on globalEmitter

// ✅ FIX: Cleanup on request end
app.get("/api/data", (req, res) => {
    const handler = () => res.json({ data: "updated" });
    globalEmitter.on("update", handler);

    res.on("finish", () => {
        globalEmitter.removeListener("update", handler);
    });
});

// ✅ BETTER: Use once()
app.get("/api/data", (req, res) => {
    globalEmitter.once("update", () => {
        res.json({ data: "updated" });
    });
});
```

**Q3: What's the difference between `on()` and `once()`? When do you use each?**

A:

- **`on()`:** Listener runs every time event fires (persistent).
- **`once()`:** Listener runs exactly once, then auto-removes.

```js
const { EventEmitter } = require("events");
const emitter = new EventEmitter();

// on(): Persistent
emitter.on("click", () => console.log("Clicked"));
emitter.emit("click"); // "Clicked"
emitter.emit("click"); // "Clicked" (still listening)

// once(): One-time
emitter.once("first-connect", () => console.log("Connected"));
emitter.emit("first-connect"); // "Connected"
emitter.emit("first-connect"); // (no output, listener removed)
```

**Use `once()` for:**

- Initialization events ("started", "connected", "loaded")
- Promise-like patterns (first result, error)
- One-off async operations

**Use `on()` for:**

- Continuous monitoring ("data", "update", "error")
- Pub/sub within app lifetime

**Q4: Design a pub/sub system with proper cleanup. How do you avoid memory leaks?**

A:

```js
class PubSub {
    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100); // Increase if legitimately needed
    }

    subscribe(topic, handler) {
        this.emitter.on(topic, handler);

        // Return unsubscribe function (cleanup interface)
        return () => {
            this.emitter.removeListener(topic, handler);
        };
    }

    subscribeOnce(topic, handler) {
        this.emitter.once(topic, handler);
        return () => {
            this.emitter.removeListener(topic, handler);
        };
    }

    publish(topic, data) {
        this.emitter.emit(topic, data);
    }

    // Debug: Get listener count
    getListenerCount(topic) {
        return this.emitter.listenerCount(topic);
    }
}

// Usage with cleanup
const pubsub = new PubSub();

const unsubscribe = pubsub.subscribe("user:login", (user) => {
    console.log(`${user.name} logged in`);
});

// Cleanup when done
unsubscribe();

// Verify cleanup
console.log(pubsub.getListenerCount("user:login")); // 0
```

**Q5: You have 50+ EventEmitters in your app. How do you track listener leaks?**

A: Use monitoring tools and patterns:

```js
// Pattern 1: Wrap EventEmitter to track leaks
const originalOn = EventEmitter.prototype.on;
let maxListenersWarnings = [];

EventEmitter.prototype.on = function (event, listener) {
    if (this.listenerCount(event) >= 10) {
        maxListenersWarnings.push({
            emitter: this.constructor.name,
            event,
            count: this.listenerCount(event),
            stack: new Error().stack,
        });
    }
    return originalOn.call(this, event, listener);
};

// Pattern 2: Global unhandledWarning listener
process.on("warning", (warning) => {
    if (warning.name === "MaxListenersExceededWarning") {
        console.warn("Listener leak detected:", warning.message);
        // Log for analysis
    }
});

// Pattern 3: Periodic audit
setInterval(() => {
    maxListenersWarnings.forEach((w) => {
        console.warn(`${w.emitter}.on('${w.event}'): ${w.count} listeners`);
    });
}, 60000);
```

### Best Practices

- **Always remove listeners:** Use `.removeListener()` or `.off()` when object is destroyed.
- **Prefer named handlers for removal:** Arrow functions in `.on()` can't be removed (no reference).

    ```js
    // ❌ Can't remove (anonymous)
    emitter.on("event", () => {
        /* do something */
    });

    // ✅ Can be removed (named)
    const handler = () => {
        /* do something */
    };
    emitter.on("event", handler);
    emitter.removeListener("event", handler);
    ```

- **Use `.once()` for one-off events:** Auto-cleanup prevents leaks.
- **Monitor listener counts in production:** Alert on `MaxListenersExceededWarning`.
- **Increase `.setMaxListeners()` only if intentional:** Don't suppress warnings.

### Common Pitfalls

- **Forgetting to remove listeners:** Grows memory with each instance.
- **Anonymous handler functions:** Can't be removed later.

    ```js
    // ❌ BAD
    emitter.on("data", () => console.log("data"));
    // Later: Can't remove this!

    // ✅ GOOD
    const handler = () => console.log("data");
    emitter.on("data", handler);
    emitter.removeListener("data", handler);
    ```

- **Attaching listeners in loops without cleanup:** Rapidly accumulates listeners.
- **Not cleaning up on object destruction:** Listeners reference destroyed objects, preventing GC.

### References: [EventEmitters/basics.js](EventEmitters/basics.js), [EventEmitters/listeners.js](EventEmitters/listeners.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What is EventEmitter?"_ → Observer pattern in Node.js. `.emit()` fires an event synchronously; all registered `.on()` listeners execute in order.
> - _"Why does Node warn at 10 listeners?"_ → It's a memory leak detector, not a limit. If you need more, call `setMaxListeners()` — but first check for leaks.
> - _".on() vs .once()?"_ → `.on()` = persistent, fires every time. `.once()` = auto-removes after first fire. Use `once()` for initialization, `on()` for continuous monitoring.
> - _"How to avoid listener leaks in Express?"_ → Don't attach `.on()` to global emitters inside request handlers. Use `.once()`, or remove listener on `res.on('close')`.

> **📝 Quick Revision — Event Emitters:**
>
> | Method                       | Purpose                  | Auto-cleanup?                       |
> | ---------------------------- | ------------------------ | ----------------------------------- |
> | `.on(event, fn)`             | Persistent listener      | No — must remove manually           |
> | `.once(event, fn)`           | One-time listener        | Yes — auto-removes after first call |
> | `.off(event, fn)`            | Remove specific listener | N/A                                 |
> | `.removeAllListeners(event)` | Remove all for an event  | N/A                                 |
>
> **Key number:** Default warning threshold = 10 listeners per event.

[↑ Back to Index](#table-of-contents)

---

### 2.4 Streams & Pipelines

### Concepts

Streams are Node's way of handling data **piece by piece** instead of all at once. Imagine filling a swimming pool: you could dump the entire water supply at once (loading a 2GB file into memory), or you could run a garden hose (streaming chunks of data, using only a small buffer).

**Why do streams matter?** Without streams, processing a 2GB file means loading 2GB into RAM. With 100 concurrent users doing this, that's 200GB of RAM — impossible. Streams solve this by processing data in small **chunks** (typically 16KB-64KB). Your memory usage stays constant regardless of file size.

**The four stream types:**

1. **Readable** — A source of data you read from. Examples: reading a file (`fs.createReadStream`), receiving an HTTP request body, stdin input
2. **Writable** — A destination you write to. Examples: writing to a file (`fs.createWriteStream`), sending an HTTP response, stdout output
3. **Duplex** — Both readable and writable, but the two sides are **independent**. Example: a TCP socket (you read data from the client AND write data back, but what you write isn't related to what you read)
4. **Transform** — A duplex stream where the output IS related to the input — data goes in, gets modified, and comes out. Examples: compression (gzip), encryption, parsing CSV lines

**Backpressure — the most important concept:** When you pipe a fast readable into a slow writable, data piles up in memory. Backpressure is the mechanism where the slow consumer **tells** the fast producer to pause. Think of it like a conveyor belt: if boxes pile up at the end, the belt stops until the worker catches up. Without backpressure handling, your Node process will run out of memory.

**`.pipe()` vs `pipeline()`:** The old `.pipe()` method handles backpressure but NOT error cleanup — if a stream errors, the others aren't destroyed, causing resource leaks. `stream.pipeline()` (added in Node 10) properly destroys all streams on error and calls a final callback. **Always prefer `pipeline()` in production code.**

```mermaid
graph LR
    subgraph Without ["Without Streams"]
        File1["2GB File"] -->|"Read entire file"| RAM1["2GB in RAM"]
        RAM1 -->|"Process all"| Out1["Output"]
    end

    subgraph With ["With Streams"]
        File2["2GB File"] -->|"Read 64KB chunk"| RAM2["64KB in RAM"]
        RAM2 -->|"Process chunk"| Out2["Output"]
        RAM2 -->|"Next 64KB"| RAM2
    end

    style RAM1 fill:#ef5350,color:#fff
    style RAM2 fill:#66bb6a,color:#fff
    style Without fill:#ffa726,color:#fff
    style With fill:#66bb6a,color:#fff
```

### Stream Types

1. **Readable:** Can read from (e.g., `fs.createReadStream`, HTTP request body).
2. **Writable:** Can write to (e.g., `fs.createWriteStream`, HTTP response).
3. **Duplex:** Both readable and writable (e.g., TCP socket).
4. **Transform:** Readable → Transform → Writable (e.g., compression, encryption).

### Key APIs

- `fs.createReadStream(path, options)` — stream file data.
- `fs.createWriteStream(path, options)` — write data to file.
- `stream.Transform` — custom transformation logic.
- `stream.pipeline(streams..., cb)` — compose streams with proper cleanup.
- `readable.pipe(writable)` — automatic backpressure handling.

### Backpressure Deep Dive

**What is backpressure?**

When a slow consumer can't keep up with a fast producer, the producer should reduce output (or buffer in memory, risking OOM).

```js
// ❌ NO BACKPRESSURE: Memory leak!
const fs = require("fs");
const readStream = fs.createReadStream("huge-file.txt");
const writeStream = fs.createWriteStream("output.txt");

readStream.on("data", (chunk) => {
    writeStream.write(chunk); // Ignores write() return value
    // If write() returns false, we're buffering too much!
});

// ✅ WITH BACKPRESSURE: Intelligent pumping
readStream.on("data", (chunk) => {
    const canContinue = writeStream.write(chunk);
    if (!canContinue) {
        readStream.pause(); // Stop reading until drain event
    }
});

writeStream.on("drain", () => {
    readStream.resume(); // Resume reading
});

// ✅ BEST: Use .pipe() (handles backpressure automatically)
readStream.pipe(writeStream);
```

**Performance example: Without vs with backpressure**

```js
// Measure memory without backpressure handling
const fs = require("fs");

// BAD: Leaks memory for large files
function badStream() {
    const read = fs.createReadStream("1gb-file.txt");
    const write = fs.createWriteStream("output.txt");

    read.on("data", (chunk) => {
        write.write(chunk);
        // No pause() = buffer grows → OOM
    });
}

// GOOD: Manages memory efficiently
function goodStream() {
    const read = fs.createReadStream("1gb-file.txt");
    const write = fs.createWriteStream("output.txt");
    read.pipe(write);
    // Backpressure managed automatically
}
```

### Stream Architecture & Backpressure Flow

This shows what happens step-by-step when a fast reader sends data to a slow writer. The key moment is when the buffer fills up and the system **automatically pauses** the reader.

```mermaid
sequenceDiagram
    participant Reader as Fast Reader (fs.createReadStream)
    participant Buffer as Internal Buffer (highWaterMark 64KB)
    participant Writer as Slow Writer (fs.createWriteStream)

    Note over Reader,Writer: PHASE 1 — Normal Flow

    Reader->>Buffer: Send chunk 1 (64KB)
    Buffer->>Writer: Forward chunk 1
    Writer->>Writer: Writing to disk...
    Reader->>Buffer: Send chunk 2 (64KB)
    Reader->>Buffer: Send chunk 3 (64KB)

    Note over Buffer: Buffer now 128KB — Exceeds highWaterMark!

    rect rgba(211, 47, 47, 0.25)
        Note over Reader,Writer: PHASE 2 — Backpressure Activated
        Buffer-->>Reader: write() returns false — STOP SENDING!
        Reader->>Reader: pause() — stop reading from disk
    end

    Writer->>Writer: Finishes writing chunk 1
    Buffer->>Writer: Forward chunk 2
    Writer->>Writer: Finishes writing chunk 2
    Buffer->>Writer: Forward chunk 3

    rect rgba(56, 142, 60, 0.25)
        Note over Reader,Writer: PHASE 3 — Drain and Resume
        Buffer-->>Reader: emit drain — OK SEND MORE!
        Reader->>Reader: resume() — start reading again
    end

    Reader->>Buffer: Send chunk 4 (64KB)
    Note over Reader,Writer: Cycle continues until EOF
```

### Memory Usage: Streams vs readFile

```mermaid
graph TB
    subgraph Bad ["readFile on 1GB file"]
        B1["Start: 30MB RSS"] --> B2["Loading: 500MB RSS"]
        B2 --> B3["Loaded: 1050MB RSS"]
        B3 --> B4["Processing: 1200MB RSS"]
        B4 --> B5["CRASH - Out of Memory"]
    end

    subgraph Good ["createReadStream on 1GB file"]
        G1["Start: 30MB RSS"] --> G2["Streaming: 35MB RSS"]
        G2 --> G3["Still streaming: 35MB RSS"]
        G3 --> G4["Done: 35MB RSS"]
        G4 --> G5["Safe with 1000+ users"]
    end

    style Bad fill:#b71c1c,color:#fff
    style Good fill:#1b5e20,color:#fff
    style B1 fill:#ef5350,color:#fff
    style B2 fill:#e53935,color:#fff
    style B3 fill:#d32f2f,color:#fff
    style B4 fill:#c62828,color:#fff
    style B5 fill:#b71c1c,color:#fff
    style G1 fill:#43a047,color:#fff
    style G2 fill:#388e3c,color:#fff
    style G3 fill:#2e7d32,color:#fff
    style G4 fill:#1b5e20,color:#fff
    style G5 fill:#1b5e20,color:#fff
```

### Transform Streams Examples

```js
const { Transform } = require("stream");
const fs = require("fs");

// Example 1: Uppercase transform
const upperTransform = new Transform({
    transform(chunk, encoding, callback) {
        this.push(chunk.toString().toUpperCase());
        callback(); // Signal completion
    },
});

fs.createReadStream("input.txt")
    .pipe(upperTransform)
    .pipe(fs.createWriteStream("output.txt"));

// Example 2: CSV to JSON transform
const csvToJson = new Transform({
    readableObjectMode: true,
    transform(chunk, encoding, callback) {
        const lines = chunk.toString().split("<br/>");
        const [headers, ...rows] = lines;
        const keys = headers.split(",");

        rows.forEach((row) => {
            const values = row.split(",");
            const obj = Object.fromEntries(
                keys.map((key, i) => [key.trim(), values[i]]),
            );
            this.push(obj);
        });
        callback();
    },
});

// Example 3: Compression transform (using zlib)
const zlib = require("zlib");
const gzip = zlib.createGzip();

fs.createReadStream("input.txt")
    .pipe(gzip)
    .pipe(fs.createWriteStream("input.txt.gz"));
```

### Pipeline Composition

```js
const { pipeline } = require("stream");
const fs = require("fs");
const zlib = require("zlib");

// Chain multiple streams safely
pipeline(
    fs.createReadStream("input.txt"),
    zlib.createGzip(),
    fs.createWriteStream("input.txt.gz"),
    (err) => {
        if (err) {
            console.error("Pipeline failed:", err.message);
            // Cleanup happens automatically
        } else {
            console.log("Pipeline succeeded");
        }
    },
);
```

### Senior-Level Q&A

**Q1: Explain backpressure. What happens if you ignore it on a 1GB file?**

A: **Backpressure** signals that the consumer is slower than the producer. Ignoring it floods memory:

```js
// Without backpressure: Memory usage ~500MB+ for 1GB file
const read = fs.createReadStream("1gb.txt", { highWaterMark: 64 * 1024 }); // 64KB chunks
const write = fs.createWriteStream("out.txt");

read.on("data", (chunk) => {
    write.write(chunk); // Ignores return value
});

// With backpressure: Memory usage stays ~64KB (one chunk)
read.on("data", (chunk) => {
    if (!write.write(chunk)) {
        read.pause();
    }
});

write.on("drain", () => read.resume());
```

**Q2: When would you use a Transform vs Duplex stream?**

A:

- **Transform:** One-way transformation (read → transform → write). Example: compression, parsing.
- **Duplex:** Two-way communication (can read AND write, independently). Example: TCP socket, WebSocket.

```js
// Transform example: Text transform (one-way)
const upperTransform = new Transform({
    transform(chunk, enc, cb) {
        cb(null, chunk.toString().toUpperCase());
    },
});

// Duplex example: Simple echo server (two-way)
const { Duplex } = require("stream");
const echoServer = new Duplex({
    read() {},
    write(chunk, enc, cb) {
        this.push(chunk); // Echo back
        cb();
    },
});
```

**Q3: Your transform stream is buffering data before calling callback. When is this a problem?**

A: If the transform is slow but you don't signal backpressure in the upstream, input will buffer:

```js
// ❌ SLOW TRANSFORM: Callback delayed, buffers input
const slowTransform = new Transform({
    transform(chunk, enc, cb) {
        setTimeout(() => {
            cb(null, chunk); // Delayed 1 second
        }, 1000); // Slow operation!
    },
});

// Effects:
// - Input stream buffers data → memory grows
// - Output stream can't process fast enough
// - Eventually hits highWaterMark and throws backpressure

// Solution: Accept backpressure from output
const slowTransform2 = new Transform({
    transform(chunk, enc, cb) {
        setTimeout(() => {
            const canContinue = this.push(chunk);
            cb(); // Always call callback, but result signals backpressure
        }, 1000);
    },
});
```

**Q4: What's the difference between `stream.pipe()` and `stream.pipeline()`?**

A:

- **`.pipe()`:** Direct piping; error in one stream doesn't clean up others.
- **`.pipeline()`:** Proper cleanup; destroys all streams on error; handles backpressure across all streams.

```js
// ❌ pipe() - manual cleanup needed
read.pipe(transform).pipe(write);
read.on("error", () => {
    /* cleanup? */
});
transform.on("error", () => {
    /* cleanup? */
});
write.on("error", () => {
    /* cleanup? */
});

// ✅ pipeline() - automatic cleanup
pipeline(read, transform, write, (err) => {
    if (err) console.error(err);
    // Streams auto-destroyed
});
```

**Q5: How does `highWaterMark` affect memory and performance?**

A: **`highWaterMark`** is the threshold for buffering. When internal buffer ≥ `highWaterMark`, backpressure signals "pause."

```js
// Small highWaterMark: More frequent pause/resume (CPU overhead, slower throughput)
const read = fs.createReadStream("file.txt", { highWaterMark: 16 * 1024 }); // 16KB

// Large highWaterMark: Less pause/resume (higher memory, better throughput)
const read2 = fs.createReadStream("file.txt", { highWaterMark: 256 * 1024 }); // 256KB

// Trade-off: Balance throughput vs memory
// Default: 16KB (readable), 16KB (writable)
// Typical tuning: 64KB-256KB
```

### Best Practices

- **Always use `.pipe()` or `.pipeline()`** for stream composition; never manually buffer without backpressure handling.
- **Handle `error` events** on all streams; errors can silently fail without explicit handlers.
- **Respect backpressure:** Check `.write()` return value or use `.pause()/.resume()`.
- **Choose appropriate `highWaterMark`:** Test with your typical data sizes and throughput.
- **Use Transform streams** for data transformation; avoid buffering entire file in memory.

### Common Pitfalls

- **Not handling errors:** Silent stream failures leave resources open.

    ```js
    // ❌ Error silently ignored
    read.pipe(write); // No error listener

    // ✅ Handle errors
    read.on("error", console.error);
    write.on("error", console.error);
    ```

- **Ignoring backpressure:** Floods memory for large files.
- **Converting streams to buffers:** `stream.pipe(new PassThrough().on("data", chunk => buffer += chunk))` defeats streaming benefits.
- **Not destroying streams on error:** Left-over file handles, sockets, etc.

### Advanced Stream Patterns

#### Object Mode Streams

```js
// Parse JSONL (JSON Lines: one JSON per line)
const { Transform } = require("stream");

const jsonlParser = new Transform({
    readableObjectMode: true, // Output objects, not buffers
    transform(chunk, enc, cb) {
        this.buffer = (this.buffer || "") + chunk.toString();
        const lines = this.buffer.split("<br/>");

        // Keep last incomplete line in buffer
        this.buffer = lines.pop();

        // Push complete lines as objects
        lines.forEach((line) => {
            if (line.trim()) {
                try {
                    this.push(JSON.parse(line));
                } catch (err) {
                    cb(err);
                }
            }
        });

        cb();
    },

    flush(cb) {
        if (this.buffer && this.buffer.trim()) {
            try {
                this.push(JSON.parse(this.buffer));
            } catch (err) {
                cb(err);
                return;
            }
        }
        cb();
    },
});

// Usage: Stream JSONL file without loading entire file
fs.createReadStream("data.jsonl")
    .pipe(jsonlParser)
    .on("data", (obj) => {
        console.log("Parsed object:", obj);
    });
```

#### Stream Composition & Error Handling

```js
const { pipeline } = require("stream");
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");

// Chain: read → encrypt → compress → write
// Error in ANY stream properly cleans up all

pipeline(
    fs.createReadStream("secret.txt"),
    crypto.createCipheriv(
        "aes-256-cbc",
        crypto.randomBytes(32),
        crypto.randomBytes(16),
    ),
    zlib.createGzip(),
    fs.createWriteStream("secret.txt.gz.enc"),
    (err) => {
        if (err) {
            console.error("Pipeline failed", err);
            // All streams automatically destroyed
        } else {
            console.log("Pipeline succeeded");
        }
    },
);
```

#### Buffering vs Streaming: Performance Impact

```js
// Benchmark: Read 100MB file
const fs = require("fs");
const { performance } = require("perf_hooks");

// Method 1: Buffer entire file (SLOW for large files)
async function bufferedRead() {
    const start = performance.now();
    const data = await fs.promises.readFile("100mb.bin");
    console.log(
        `Buffered: ${(performance.now() - start).toFixed(0)}ms, Memory: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
    );
}

// Method 2: Stream & process chunks (FAST)
async function streamRead() {
    const start = performance.now();
    let count = 0;

    for await (const chunk of fs.createReadStream("100mb.bin")) {
        count += chunk.length;
    }

    console.log(
        `Streamed: ${(performance.now() - start).toFixed(0)}ms, Count: ${count}, Memory: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
    );
}

// Buffered: ~500ms, Memory: 100MB+
// Streamed: ~150ms, Memory: ~10MB
```

### Stream Processing Patterns

#### Fan-out Pattern (One source → Multiple destinations)

One readable stream sends the same data to multiple processors simultaneously. Each consumer gets every chunk independently.

```mermaid
graph LR
    Source["Source File<br/>(read once)"]

    Source -->|"Each chunk sent<br/>to ALL consumers"| T1["Uppercase<br/>Transform"]
    Source -->|"Same chunk"| T2["Word Counter<br/>Transform"]
    Source -->|"Same chunk"| T3["Gzip Compress<br/>Transform"]

    T1 --> Out1["upper.txt"]
    T2 --> Out2["stats.json"]
    T3 --> Out3["file.gz"]

    style Source fill:#2196f3,color:#fff
    style Out1 fill:#4caf50,color:#fff
    style Out2 fill:#4caf50,color:#fff
    style Out3 fill:#4caf50,color:#fff
```

#### Backpressure Propagation Through Pipeline

When the slowest stage hits its limit, the pause signal travels **backwards** through the entire pipeline, all the way to the source. This keeps memory usage constant.

```mermaid
graph LR
    A["File Reader\n1 GB/s\nFAST"] -->|"64KB chunks"| B["JSON Parser\n500 MB/s"]
    B -->|"objects"| C["DB Writer\n10 MB/s\nSLOW!"]

    C -.->|"Buffer full!\nwrite() returns false"| B
    B -.->|"Pause propagates\nupstream pauses too"| A

    C -->|"drain event"| B
    B -->|"resume"| A

    style A fill:#2e7d32,color:#fff
    style B fill:#e65100,color:#fff
    style C fill:#b71c1c,color:#fff
```

### Additional Stream Q&A

**Q6: Design a CSV file processor that handles 1GB files without loading into memory.**

A:

```js
const fs = require("fs");
const { Transform } = require("stream");
const csv = require("csv-parser"); // or custom parser

function processCSV(filepath, onRow, onError) {
    fs.createReadStream(filepath)
        .pipe(csv())
        .on("data", (row) => {
            // Process row-by-row
            onRow(row);
        })
        .on("error", onError)
        .on("end", () => {
            console.log("Processing complete");
        });
}

// Usage
let rowCount = 0;
processCSV("large-data.csv", (row) => {
    // Maybe validate, aggregate, transform
    rowCount++;
    if (rowCount % 10000 === 0) {
        console.log(`Processed ${rowCount} rows`);
    }
});
```

**Q7: Your transform stream sometimes needs to emit multiple output chunks per input chunk. How do you handle this?**

A: Use `this.push()` multiple times in `transform()`:

```js
const { Transform } = require("stream");

// Example: Explode arrays into individual items
const arrayExploder = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(chunk, enc, cb) {
        if (Array.isArray(chunk)) {
            chunk.forEach((item) => this.push(item));
        } else {
            this.push(chunk);
        }
        cb();
    },
});

// Input: [1, 2, 3], [4, 5]
// Output: 1, 2, 3, 4, 5
```

**Q8: How do you implement a `retry` stream that replays failed chunks?**

A:

```js
const { Transform } = require("stream");

class RetryTransform extends Transform {
    constructor(fn, maxRetries = 3) {
        super({ objectMode: true });
        this.fn = fn;
        this.maxRetries = maxRetries;
        this.failedChunks = [];
    }

    async transform(chunk, enc, cb) {
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await this.fn(chunk);
                this.push(result);
                return cb();
            } catch (err) {
                if (attempt === this.maxRetries) {
                    this.failedChunks.push({ chunk, error: err });
                    return cb(err);
                }
                // Exponential backoff
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, attempt) * 100),
                );
            }
        }
    }

    getFailedChunks() {
        return this.failedChunks;
    }
}

// Usage
const retryStream = new RetryTransform(async (item) => {
    // Might fail (network, etc)
    return await processItem(item);
});

fs.createReadStream("data.jsonl")
    .pipe(jsonlParser)
    .pipe(retryStream)
    .on("end", () => {
        console.log("Failed items:", retryStream.getFailedChunks());
    });
```

### References: [NodeServer/\_\_streams.js](NodeServer/__streams.js), [\_Stream_Buffer.js](_Stream_Buffer.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What is backpressure?"_ → When a consumer is slower than a producer, the producer pauses to avoid flooding memory. `.pipe()` handles this automatically.
> - _"pipe() vs pipeline()?"_ → `pipe()` = no error cleanup (leaked streams). `pipeline()` = auto-destroys all streams on error. Always use `pipeline()` in production.
> - _"How to process a 5GB file without OOM?"_ → `fs.createReadStream()` → transform → writable. Memory stays at ~64KB regardless of file size.
> - _"What is highWaterMark?"_ → Buffer threshold (bytes) before backpressure kicks in. Default 16KB. Larger = faster throughput but more memory.

> **📝 Quick Revision — Streams:**
>
> | Stream Type | Direction               | Example                              |
> | ----------- | ----------------------- | ------------------------------------ |
> | Readable    | Source → you            | `fs.createReadStream`, HTTP req body |
> | Writable    | You → destination       | `fs.createWriteStream`, HTTP res     |
> | Duplex      | Both (independent)      | TCP socket, WebSocket                |
> | Transform   | Input → modify → output | gzip, crypto, CSV parser             |
>
> **Memory comparison (1GB file):**
>
> - `readFile()` = **1GB RAM**
> - `createReadStream()` = **~64KB RAM**
>
> **Golden rule:** If file size > 10MB, always use streams.

[↑ Back to Index](#table-of-contents)

---

## Phase 3 — I/O & System APIs

### 3.1 File System (fs)

### Concepts

The `fs` module lets Node.js interact with the file system — reading files, writing data, watching for changes, and managing directories. It's one of the most used modules, but also one of the easiest to misuse.

**Three API styles:** Node offers the same operations in three flavors:

- **Synchronous** (`fs.readFileSync`) — Blocks the event loop until done. Only use at startup (loading config) or in CLI tools. **Never** use in a server handling requests.
- **Callback** (`fs.readFile(path, callback)`) — The original async style. Non-blocking, but nests badly.
- **Promise** (`fs.promises.readFile(path)`) — Modern, clean, works with async/await. **Use this for all new code.**

**File descriptors:** Every time you open a file, the OS assigns a **file descriptor** (an integer). There's a system-wide limit (typically 1024-65535). If you open files without closing them, you'll hit `EMFILE: too many open files`. Streams handle this automatically; manual `fs.open()` requires manual `fs.close()`.

**The readFile vs createReadStream decision:** For small files (< 10MB), `readFile` is simpler. For large files, **always use streams** — `readFile` loads the entire file into memory. With 100 concurrent requests each reading a 50MB file, that's 5GB of RAM.

**File watching:** `fs.watch()` listens for file changes using OS-level mechanisms (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows). But it fires **multiple events** per save (editors write-rename-delete), so you need debouncing. The `chokidar` library wraps this with cross-platform reliability.

**Concurrent writes:** Node.js doesn't have built-in file locking. If two processes write to the same file simultaneously, data can be corrupted. Solutions include: lock files, append-only patterns, or using a database instead.

### Key APIs

- `fs.promises` — promise-based FS operations (preferred for new code).
- `fs.createReadStream` / `fs.createWriteStream` — streaming large files.
- `fs.watch(path, (eventType, filename) => {...})` — file change notifications (inotify on Linux, FSEvents on macOS).
- `fs.appendFile()` / `fs.appendFileSync()` — append data without reading entire file.
- `fs.access()` — check file permissions before operations.
- `fs.truncate()` — resize file.
- `fs.stat()` — get file metadata (size, timestamps, permissions).

### File Operations Decision Matrix

This diagram helps you choose the right `fs` API based on your situation. Follow the arrows from your operation type to the recommended approach.

```mermaid
graph TB
    Q["What do you need?"]

    Q -->|"Read file"| Size{"File larger<br/>than 10MB?"}
    Q -->|"Write data"| Write{"Appending or<br/>replacing?"}
    Q -->|"Watch changes"| Watch["Use chokidar library<br/>fs.watch is unreliable<br/>across platforms"]
    Q -->|"Check existence"| Check["fs.access()<br/>NOT fs.existsSync<br/>avoiding race conditions"]

    Size -->|"Small file"| Small["fs.promises.readFile()<br/>Simple, loads into RAM<br/>Max ~10MB safely"]
    Size -->|"Large file"| Large["fs.createReadStream()<br/>Uses only 64KB RAM<br/>Works for any file size"]

    Write -->|"Append"| Append["fs.appendFile()<br/>Atomic append with O_APPEND<br/>Safe for logging"]
    Write -->|"Replace"| Replace{"Needs atomicity?"}
    Replace -->|"Yes"| Atomic["Write to temp file<br/>then fs.rename()<br/>Atomic on same partition"]
    Replace -->|"No"| Simple["fs.promises.writeFile()"]

    style Large fill:#4caf50,color:#fff
    style Append fill:#2196f3,color:#fff
    style Atomic fill:#ff9800,color:#fff
    style Watch fill:#9c27b0,color:#fff
```

### Memory: readFile vs Streams

```mermaid
graph TB
    subgraph Small ["Small File: 5MB"]
        S1["readFile: OK<br/>5MB in RAM"]
        S2["Stream: Also OK<br/>but unnecessary"]
    end

    subgraph Medium ["Medium File: 100MB"]
        M1["readFile: Risky<br/>100MB per request<br/>10 users = 1GB RAM"]
        M2["Stream: Safe<br/>64KB per request<br/>10 users = 640KB RAM"]
    end

    subgraph Large ["Large File: 1GB+"]
        L1["readFile: CRASH<br/>Exceeds V8 heap"]
        L2["Stream: Safe<br/>Still only 64KB"]
    end

    style S1 fill:#66bb6a,color:#fff
    style S2 fill:#66bb6a,color:#fff
    style M1 fill:#ffee58,color:#000
    style M2 fill:#66bb6a,color:#fff
    style L1 fill:#ef5350,color:#fff
    style L2 fill:#66bb6a,color:#fff
```

### Performance Considerations

**Memory usage: Read entire file vs streaming**

```js
// ❌ BAD: Loads 1GB into memory
const fs = require("fs");
const data = fs.readFileSync("1gb-file.txt"); // Blocks, uses 1GB RAM
console.log(data.toString());

// ❌ ALSO BAD: Async callback, still loads 1GB
fs.readFile("1gb-file.txt", (err, data) => {
    console.log(data.toString()); // Uses 1GB RAM
});

// ✅ GOOD: Streams use ~64KB (one chunk)
fs.createReadStream("1gb-file.txt").on("data", (chunk) => {
    console.log(chunk.toString()); // Process chunk-by-chunk
});

// ✅ PIPE: Automatic backpressure
fs.createReadStream("1gb-file.txt").pipe(process.stdout); // Streaming with backpressure

// ✅ FOR-AWAIT: Modern, readable
for await (const chunk of fs.createReadStream("1gb-file.txt")) {
    console.log(chunk.toString());
}
```

### File Watching Patterns

#### File Change Detection with Debounce

Text editors fire **multiple** file system events per save (write temp file, rename, delete old). Without debouncing, your code runs 3-5 times per save.

```mermaid
sequenceDiagram
    participant Editor as Text Editor
    participant FS as File System
    participant Watcher as fs.watch()
    participant Debounce as Debounce Timer
    participant App as Your Handler

    Editor->>FS: Save file (write temp)
    FS->>Watcher: change event #1
    Watcher->>Debounce: Start 300ms timer

    Editor->>FS: Rename temp to target
    FS->>Watcher: rename event #2
    Watcher->>Debounce: Cancel timer, restart

    Editor->>FS: Delete temp file
    FS->>Watcher: change event #3
    Watcher->>Debounce: Cancel timer, restart

    Note over Debounce: 300ms of silence...

    Debounce->>App: Execute handler ONCE
    Note over App: Process file change
```

```js
// Platform differences: fs.watch is unreliable on some systems
// Use fs.watchFile as fallback or external library (chokidar)

const fs = require("fs");

// fs.watch: Inotify on Linux, FSEvents on macOS (faster)
fs.watch("file.txt", (eventType, filename) => {
    console.log(`Event: ${eventType} on ${filename}`);
});

// fs.watchFile: Polling (works everywhere, slower)
fs.watchFile("file.txt", (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        console.log("File modified");
    }
});

// Best practice: Use chokidar (cross-platform)
const chokidar = require("chokidar");
chokidar.watch("file.txt").on("change", () => console.log("Changed"));
```

### Concurrent File Writing Strategies

#### Strategy 1: Append-Only Files

```js
// Multiple processes can safely append (atomic at OS level)
const fs = require("fs");

// All writers append independently
function safeAppend(filename, data) {
    return fs.promises.appendFile(filename, data + "<br/>");
}

// Process 1
safeAppend("log.txt", "Message from process 1");

// Process 2
safeAppend("log.txt", "Message from process 2");

// Result: Both messages safely in file, no corruption
```

#### Strategy 2: File Locking with Lock File

```js
const fs = require("fs");
const path = require("path");

class FileLock {
    constructor(filepath, lockTimeout = 5000) {
        this.filepath = filepath;
        this.lockPath = filepath + ".lock";
        this.lockTimeout = lockTimeout;
    }

    async acquire() {
        const maxRetries = 50; // 5 seconds with 100ms backoff
        for (let i = 0; i < maxRetries; i++) {
            try {
                // Fail if lock file exists (O_EXCL = atomic)
                const fd = fs.openSync(this.lockPath, "wx");
                fs.closeSync(fd);
                return true;
            } catch (err) {
                if (err.code !== "EEXIST") throw err;

                // Check for stale lock (older than lockTimeout)
                const lockStat = await fs.promises
                    .stat(this.lockPath)
                    .catch(() => null);
                if (
                    lockStat &&
                    Date.now() - lockStat.mtimeMs > this.lockTimeout
                ) {
                    await fs.promises.unlink(this.lockPath);
                    continue;
                }

                // Backoff and retry
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        throw new Error("Could not acquire lock");
    }

    async release() {
        try {
            await fs.promises.unlink(this.lockPath);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }
}

// Usage
async function criticalWrite(data) {
    const lock = new FileLock("shared.txt");
    await lock.acquire();
    try {
        await fs.promises.appendFile("shared.txt", data + "<br/>");
    } finally {
        await lock.release();
    }
}
```

#### Strategy 3: Write-to-Temp-then-Rename (Atomic)

```js
const fs = require("fs");
const path = require("path");

async function atomicWrite(filepath, data) {
    const tempPath = filepath + ".tmp." + Date.now();

    try {
        // Write to temporary file
        await fs.promises.writeFile(tempPath, data, "utf8");

        // Atomic rename (POSIX guarantees atomicity)
        await fs.promises.rename(tempPath, filepath);
    } catch (err) {
        // Cleanup temp file on error
        await fs.promises.unlink(tempPath).catch(() => {});
        throw err;
    }
}

// Usage: Safe simultaneous writes (last one wins)
Promise.all([
    atomicWrite("config.json", JSON.stringify({ version: 1 })),
    atomicWrite("config.json", JSON.stringify({ version: 2 })),
    atomicWrite("config.json", JSON.stringify({ version: 3 })),
]);
```

### Directory Traversal with Streaming

```js
const fs = require("fs");
const path = require("path");

// Recursive directory walk (memory-efficient)
async function* walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        yield {
            path: fullPath,
            isDirectory: entry.isDirectory(),
            name: entry.name,
        };

        if (entry.isDirectory()) {
            yield* walk(fullPath); // Recursive generator
        }
    }
}

// Usage: Stream through all files (no memory buildup)
async function findLargeFiles(startDir, minSize) {
    for await (const file of walk(startDir)) {
        if (!file.isDirectory) {
            const stat = await fs.promises.stat(file.path);
            if (stat.size > minSize) {
                console.log(`${file.path}: ${stat.size} bytes`);
            }
        }
    }
}

findLargeFiles(".", 1024 * 1024); // Find all files > 1MB
```

### Senior-Level Q&A

**Q1: When would you use `fs.readFileSync` in a server? What are the consequences?**

A: **Never in production HTTP servers.** Blocks the entire event loop, freezing all other requests.

```js
// ❌ CATASTROPHIC: Blocks all requests
const express = require("express");
const app = express();

app.get("/config", (req, res) => {
    const config = fs.readFileSync("config.json"); // BLOCKS event loop for everyone!
    res.json(JSON.parse(config));
});

// Effects:
// - All pending HTTP requests hang
// - ~100ms block = 100ms lag for all concurrent users

// ✅ CORRECT: Use promise or callback
app.get("/config", async (req, res) => {
    const config = await fs.promises.readFile("config.json", "utf8");
    res.json(JSON.parse(config));
});
```

**Valid use cases for sync:**

- CLI tools (no concurrent requests)
- Single-run scripts
- Initialization (application startup, before server starts)

**Q2: Compare different ways to read a file. What's the memory footprint and when to use each?**

A:
| Method | Memory | Latency | Use Case |
|--------|--------|---------|----------|
| `readFileSync` | Entire file | Locks event loop | CLI, startup |
| `readFile` callback | Entire file | Non-blocking | Legacy code |
| `fs.promises.readFile` | Entire file | Non-blocking | Small files, JSON |
| `createReadStream` | ~64KB (highWaterMark) | Streaming | Large files, pipes |
| `for await` + stream | ~64KB | Streaming | Modern, readable |

```js
// Example: 100MB file
// readFile: Loads 100MB into memory
// createReadStream: Uses ~64KB, streams data in chunks

const fs = require("fs");

async function loadLargeFile() {
    // If file < 10MB: readFile is fine
    if (fileSize < 10 * 1024 * 1024) {
        return await fs.promises.readFile("file.json", "utf8");
    }

    // If file > 10MB: Use streams
    const chunks = [];
    for await (const chunk of fs.createReadStream("file.json")) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}
```

**Q3: You're building a file upload service. How would you handle a 5GB video file without running out of memory?**

A: **Use streams with backpressure:**

```js
const express = require("express");
const fs = require("fs");
const app = express();

app.post("/upload", (req, res) => {
    // req is a Readable stream (body)
    // res is a Writable stream

    const uploadPath = `./uploads/${Date.now()}.mp4`;
    const writeStream = fs.createWriteStream(uploadPath);

    // Pipe with error handling
    req.pipe(writeStream)
        .on("close", () => {
            res.json({ success: true, file: uploadPath });
        })
        .on("error", (err) => {
            fs.unlink(uploadPath, () => {}); // Clean up
            res.status(500).json({ error: err.message });
        });

    // Optional: limit file size
    let uploadedSize = 0;
    const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

    req.on("data", (chunk) => {
        uploadedSize += chunk.length;
        if (uploadedSize > MAX_SIZE) {
            req.pause();
            writeStream.destroy();
            res.status(413).json({ error: "File too large" });
        }
    });
});
```

**Q4: fs.watch fires multiple events for a single file change. How do you debounce it?**

A: File watchers can fire multiple events (e.g., one change triggers 2-3 events). Debounce to avoid duplicate processing:

```js
const fs = require("fs");

function watchFileDebounced(filepath, callback, delay = 500) {
    let timeout;

    fs.watch(filepath, (eventType, filename) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            callback(eventType, filename);
        }, delay);
    });
}

watchFileDebounced("config.json", (eventType, filename) => {
    console.log(`File changed: ${filename}`);
    // Reload config once per 500ms
});
```

**Q5: You need to write to a shared file from multiple processes safely. What are your options?**

A: Three strategies:

1. **Append-only:** Each process appends independently (safest, no locking)
2. **File lock:** Exclusive lock before write (can deadlock, performance hit)
3. **Atomic rename:** Write to temp, then rename (no intermediate corruption)

```js
// Best: Atomic write + append-only log
async function logEvent(event) {
    // Safe even with 100 concurrent writers
    await fs.promises.appendFile("events.log", JSON.stringify(event) + "<br/>");
}

// For structured data (JSON): Atomic write
async function saveState(data) {
    const tempFile = "state.json.tmp";
    await fs.promises.writeFile(tempFile, JSON.stringify(data));
    await fs.promises.rename(tempFile, "state.json"); // Atomic
}
```

**Q6: How do you handle very large directory trees (100k+ files) efficiently?**

A: Use async generators and streaming to avoid loading entire tree into memory:

```js
// ❌ BAD: Loads entire tree (recursive promise array)
async function badWalk(dir) {
    const entries = await fs.promises.readdir(dir);
    let files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(await badWalk(fullPath)); // Recursively concat
        } else {
            files.push(fullPath);
        }
    }
    return files; // Returns array of 100k items
}

// ✅ GOOD: Uses async generators (memory-efficient)
async function* walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        yield fullPath;
        if (entry.isDirectory()) {
            yield* walk(fullPath);
        }
    }
}

// Usage: Process files one at a time
for await (const file of walk(".")) {
    console.log(file); // Processes as it discovers
}
```

**Q7: What's the performance difference between fs.watch and fs.watchFile?**

A:

| Method                | Mechanism              | Latency   | CPU  | Reliability        | Best For                 |
| --------------------- | ---------------------- | --------- | ---- | ------------------ | ------------------------ |
| `fs.watch`            | inotify/FSEvents       | ~1-10ms   | Low  | Platform-dependent | Development, Linux/macOS |
| `fs.watchFile`        | Polling (stat() calls) | ~5000ms+  | High | Works everywhere   | Fallback                 |
| `chokidar` (external) | Hybrid + fallback      | ~10-100ms | Low  | High               | Production               |

```js
// Benchmark: Watch file for changes
const fs = require("fs");
const { performance } = require("perf_hooks");

let watchCount = 0;
let pollCount = 0;

// fs.watch (fast)
fs.watch("test.txt", () => {
    watchCount++;
});

// fs.watchFile (slow, polls every 5s default)
fs.watchFile("test.txt", { interval: 1000 }, () => {
    pollCount++;
});

// Modify file 10 times
for (let i = 0; i < 10; i++) {
    fs.appendFileSync("test.txt", "data<br/>");
}

// Result:
// fs.watch: 10-20 callbacks (multiple per change)
// fs.watchFile: 1-2 callbacks (misses changes if too fast)
```

**Q8: How would you implement a safe config file reload pattern?**

A:

```js
const fs = require("fs");
const path = require("path");

class ConfigManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = null;
        this.loading = false;
        this.watchers = [];
    }

    async load() {
        if (this.loading) return; // Prevent concurrent reloads
        this.loading = true;

        try {
            const raw = await fs.promises.readFile(this.configPath, "utf8");
            const newConfig = JSON.parse(raw);

            // Validate before replacing
            this.validate(newConfig);

            this.config = newConfig;
            this.emit("loaded", newConfig);
        } catch (err) {
            console.error("Config load failed:", err);
            this.emit("error", err);
        } finally {
            this.loading = false;
        }
    }

    watch() {
        let timeout;
        fs.watch(this.configPath, (eventType) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.load(), 500); // Debounce
        });
    }

    validate(config) {
        // Check required fields, types, etc
        if (!config || typeof config !== "object") {
            throw new Error("Invalid config format");
        }
    }

    get() {
        if (!this.config) {
            throw new Error("Config not loaded");
        }
        return this.config;
    }

    subscribe(callback) {
        this.watchers.push(callback);
    }

    emit(event, data) {
        this.watchers.forEach((cb) => cb(event, data));
    }
}

// Usage
const config = new ConfigManager("config.json");
await config.load();
config.watch();

config.subscribe((event, data) => {
    if (event === "loaded") {
        console.log("Config reloaded:", data);
    }
});
```

### Best Practices

- **Use streaming for files > 10MB:** Avoid loading entire file into memory.
- **Always use `fs.promises` or callbacks** in async code; never sync in servers.
- **Handle watch errors:** fs.watch can be unreliable; use chokidar for production.
- **Test file operations cross-platform:** fs.watch behavior differs (Linux vs macOS vs Windows).
- **Use append-only for logs:** Safest for concurrent writes (atomic at OS level).
- **Atomic writes for structured data:** Write to temp, then rename to guarantee atomicity.
- **Debounce watchers:** Prevent duplicate processing from multiple file change events.
- **Check permissions before operations:** Use `fs.access()` for fail-fast design.

### Common Pitfalls

- **Using `readFileSync` in servers:** Blocks all requests.
- **Forgetting to handle stream errors:** Silent failures, left-over file handles.
- **Assuming fs.watch is reliable:** May miss events or fire duplicates; use chokidar in production.
- **Not handling concurrent writes:** Multiple processes can corrupt shared files (use locking/appending strategies).
- **Loading entire files into memory:** Causes OOM for large files (use streams instead).
- **Race conditions with file operations:** TOCTOU (time-of-check, time-of-use) between stat() and subsequent operations.
- **Ignoring stale locks:** Fill disk with abandoned lock files; implement timeout-based cleanup.

### References: [fs/basics.js](fs/basics.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Why avoid readFileSync in servers?"_ → It blocks the event loop; zero requests are served until the read completes.
> - _"How do you read a 5GB file in Node?"_ → Use `fs.createReadStream()` to stream it chunk-by-chunk instead of loading it all into memory.
> - _"What is TOCTOU?"_ → Time-of-check-to-time-of-use race condition — a file can change between `stat()` and the subsequent operation.
> - _"fs.watch vs chokidar?"_ → `fs.watch` is unreliable across platforms (duplicates, missing events); chokidar normalizes behaviour and is production-safe.

> **📝 Quick Revision — File System:**
> | Concept | Key Point |
> |---|---|
> | Sync vs Async | Sync blocks the event loop; always use async in servers |
> | Streams | `createReadStream` / `createWriteStream` for large files |
> | `fs/promises` | Modern API — `await fs.readFile()` instead of callbacks |
> | File Watching | Use `chokidar` in production, not raw `fs.watch` |
> | File Locking | Use lock files or `proper-lockfile` to prevent concurrent writes |
> | Thread Pool | `fs` operations use libuv thread pool (default 4 threads) |

[↑ Back to Index](#table-of-contents)

---

### 3.2 HTTP Server & NodeServer

### Concepts

Node.js was **designed for building network servers**. The built-in `http` module gives you the raw primitives to handle HTTP requests and responses without any framework.

**How a Node HTTP server works:** When you call `http.createServer(handler)`, Node creates a TCP server that:

1. Listens for incoming TCP connections on a port
2. Parses the raw bytes into an HTTP request (method, path, headers, body)
3. Calls your handler function with two objects: `req` (the incoming request as a Readable stream) and `res` (the outgoing response as a Writable stream)
4. Your handler reads the request, does work, and writes the response

**Why `req` and `res` are streams:** The request body might be huge (a file upload), and the response might be huge (a file download). By making them streams, Node never needs to buffer the entire payload in memory. You can stream a 10GB file to the client using only ~64KB of RAM.

**The connection lifecycle:** Each HTTP request goes through: TCP handshake → HTTP parsing → your handler → response sent → keep-alive or close. With `keep-alive` (default in HTTP/1.1), the TCP connection stays open for multiple requests, saving the overhead of repeated handshakes.

**Frameworks vs raw `http`:** Express, Fastify, Koa, and Hapi all build on top of `http.createServer()`. They add routing, middleware, request parsing, and error handling. For interviews, you should know the raw `http` module to understand what frameworks abstract away.

### Examples

#### Basic Streaming Response

```js
const http = require("http");
const fs = require("fs");

http.createServer((req, res) => {
    if (req.url === "/large-file") {
        // Stream file without loading into memory
        const stream = fs.createReadStream("large.txt");
        stream.pipe(res);

        stream.on("error", (err) => {
            res.writeHead(500);
            res.end("Stream error");
        });
    } else {
        res.writeHead(200);
        res.end("OK");
    }
}).listen(3000);
```

#### Request Body Streaming (File Upload)

```js
const http = require("http");
const fs = require("fs");

http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/upload") {
        const writeStream = fs.createWriteStream("uploaded.dat");

        req.pipe(writeStream)
            .on("close", () => {
                res.writeHead(200);
                res.end("Upload complete");
            })
            .on("error", (err) => {
                res.writeHead(500);
                res.end("Upload failed");
            });
    }
}).listen(3000);
```

### Senior-Level Q&A

**Q1: You're building a file download endpoint for large files (500MB+). Compare three approaches.**

A:

**Approach 1: Buffer entire file (❌ BAD)**

```js
// Loads 500MB into memory — will crash on 10 concurrent downloads!
http.createServer((req, res) => {
    const data = fs.readFileSync("large-file.bin");
    res.end(data);
}).listen(3000);
```

**Approach 2: Async read (❌ STILL BAD)**

```js
// Slightly better, but still loads entire file
fs.readFile("large-file.bin", (err, data) => {
    res.end(data);
});
```

**Approach 3: Stream (✅ GOOD)**

```js
// Uses ~64KB memory regardless of file size
http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
        "Content-Disposition",
        'attachment; filename="large-file.bin"',
    );

    fs.createReadStream("large-file.bin").pipe(res);
}).listen(3000);
```

**Memory comparison:**

- Buffer: 500MB (constant)
- Stream: ~64KB (constant, regardless of file size)

**Q2: How do you implement range requests (HTTP 206) for video streaming?**

A: Range requests allow clients to resume downloads and seek in videos:

```js
const http = require("http");
const fs = require("fs");

http.createServer((req, res) => {
    if (req.url === "/video.mp4") {
        const stat = fs.statSync("video.mp4");
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Parse Range header: "bytes=0-1023"
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize) {
                res.writeHead(416);
                res.end("Requested range out of bounds");
                return;
            }

            // Send 206 Partial Content
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Content-Length": end - start + 1,
                "Content-Type": "video/mp4",
            });

            fs.createReadStream("video.mp4", { start, end }).pipe(res);
        } else {
            // Send full file
            res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
            });
            fs.createReadStream("video.mp4").pipe(res);
        }
    }
}).listen(3000);
```

**Q3: How does backpressure work with HTTP responses? Why does it matter?**

A: If client is slow, response stream buffers in memory. Without backpressure handling, memory grows:

```js
// ❌ Ignores backpressure (memory leak!)
http.createServer((req, res) => {
    const data = Buffer.alloc(1024 * 1024); // 1MB chunk
    for (let i = 0; i < 10000; i++) {
        res.write(data); // Never checks return value
    }
    res.end();
}).listen(3000);

// ✅ Respects backpressure
http.createServer((req, res) => {
    const data = Buffer.alloc(1024 * 1024);
    let i = 0;

    function write() {
        let canContinue = true;
        while (i < 10000 && canContinue) {
            canContinue = res.write(data);
            if (!canContinue) break;
            i++;
        }

        if (i < 10000 && !canContinue) {
            res.once("drain", write); // Resume when client ready
        }
    }

    write();
}).listen(3000);

// ✅ SIMPLE: Use pipe() (handles backpressure automatically)
// See streaming examples above
```

**Q4: How would you implement a health check endpoint that's fast and non-blocking?**

A:

```js
const http = require("http");

// Simple in-memory health state
let isHealthy = true;
let startTime = Date.now();

http.createServer((req, res) => {
    // Health check (fast, non-blocking)
    if (req.url === "/health") {
        const uptime = Date.now() - startTime;

        if (isHealthy) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", uptime }));
        } else {
            res.writeHead(503);
            res.end(JSON.stringify({ status: "unhealthy" }));
        }
        return;
    }

    // Regular request handling
    res.writeHead(200);
    res.end("OK");
}).listen(3000);

// Set health status based on app state
app.on("error", () => {
    isHealthy = false;
    setTimeout(() => {
        isHealthy = true; // Recover after timeout
    }, 5000);
});
```

### Best Practices

- **Always stream large responses:** Avoid buffering entire payloads.
- **Handle stream errors:** Both `req` and `res` can error.
- **Set appropriate headers:** `Content-Type`, `Content-Length`, `Content-Range`.
- **Implement timeouts:** Slow clients shouldn't block forever.
- **Use compression:** `gzip` reduces bandwidth for text responses.

### Common Pitfalls

- **Buffering large responses:** Causes memory to grow with file size.
- **Not handling slow clients:** Memory leak if slow client doesn't consume.
- **Ignoring error events:** Unhandled stream errors leave sockets open.
- **Mixing callback and stream APIs:** Hard to manage error propagation.

### References: [NodeServer/server.js](NodeServer/server.js), [NodeServer/http_server.js](NodeServer/http_server.js), [NodeServer/\_\_streams.js](NodeServer/__streams.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"How does Node handle HTTP requests internally?"_ → `http.createServer` wraps a TCP socket; each request is an event emitted on the server object — no thread-per-request.
> - _"Why stream responses?"_ → Buffering a 500MB file means 500MB of RAM per request; streaming serves it in small chunks with constant memory.
> - _"req and res — what are they?"_ → `req` is a Readable stream (incoming data), `res` is a Writable stream (outgoing data) — both follow the stream API.
> - _"How to handle slow clients?"_ → Set `server.timeout` and `server.keepAliveTimeout`; if a client doesn't consume, backpressure kicks in via the stream pipeline.

> **📝 Quick Revision — HTTP Server:**
> | Concept | Key Point |
> |---|---|
> | `http.createServer` | Creates TCP server + HTTP parser, emits `request` events |
> | req (IncomingMessage) | Readable stream — body arrives in chunks |
> | res (ServerResponse) | Writable stream — call `.write()` / `.end()` |
> | Streaming files | `fs.createReadStream(path).pipe(res)` — constant memory |
> | Timeouts | `server.timeout` prevents slow-client resource exhaustion |
> | Keep-Alive | HTTP/1.1 reuses connections; set `keepAliveTimeout` |

[↑ Back to Index](#table-of-contents)

---

### 3.3 Child Processes (exec / spawn / fork)

### Concepts

Node.js runs your code on a single thread, which is great for I/O but terrible for CPU-heavy work. If you compute a Fibonacci number for 30 seconds, **every user on your server waits** 30 seconds. Child processes are the escape hatch.

**What is a child process?** It's a completely separate OS process — with its own memory, its own V8 engine (if it's Node), and its own event loop. The parent and child communicate by sending messages through a pipe (IPC channel). Think of it as hiring an assistant: you give them a task, they work on it in their own workspace, and bring back the result.

**The three APIs:**

1. **`exec(command)`** — Runs a **shell command** (like typing in a terminal). Buffers the entire output in memory, then gives it to you. Great for quick commands like `git status` or `ls`. **Security warning:** because it runs through a shell (`/bin/sh` or `cmd.exe`), user input can be injected as shell commands.

2. **`spawn(command, args)`** — Like `exec` but **streams** output instead of buffering. Use for long-running processes or large output. NO shell involved, so it's safer. Arguments are passed as an array, not a string.

3. **`fork(scriptPath)`** — Spawns a **new Node.js process** with a built-in IPC (Inter-Process Communication) channel. Parent and child can send messages with `process.send()` and `.on('message')`. This is how you run CPU-heavy JavaScript in the background without blocking your server.

**Important:** Each child process is a full OS process with its own memory (~30MB minimum for Node). Don't fork hundreds of processes — use a pool of 4-8 workers and queue tasks.

### Key APIs

- **`exec(command, cb)`** — Run shell command, buffer entire stdout/stderr.
- **`spawn(cmd, args, opts)`** — Stream-based child process (no buffering).
- **`fork(modulePath, args, opts)`** — Spawn Node process with IPC channel.
- **Message passing:** `process.send()` (child), `child.send()` (parent), `.on('message', ...)`

### Comparison Table

| API        | Buffer              | Streams | Shell | IPC | Use Case                             |
| ---------- | ------------------- | ------- | ----- | --- | ------------------------------------ |
| `exec`     | Yes (entire output) | No      | Yes   | No  | Short commands, need full output     |
| `execFile` | Yes                 | No      | No    | No  | Safer than exec (no shell injection) |
| `spawn`    | No                  | Yes     | No    | No  | Long-running, high output            |
| `fork`     | No                  | No      | N/A   | Yes | Node worker processes                |

### exec vs spawn Examples

```js
const { exec, spawn } = require("child_process");

// ❌ exec: Buffers entire output (bad for large outputs)
exec("ls -la /large-directory", (err, stdout, stderr) => {
    // Entire output in memory!
    console.log(stdout);
});

// ✅ spawn: Streams output (good for large outputs)
const ls = spawn("ls", ["-la", "/large-directory"]);
ls.stdout.on("data", (chunk) => {
    console.log("Output chunk:", chunk.toString());
});
ls.stderr.on("data", (chunk) => {
    console.error("Error chunk:", chunk.toString());
});
ls.on("close", (code) => {
    console.log("Exited with code", code);
});

// Handle output limits
let outputSize = 0;
ls.stdout.on("data", (chunk) => {
    outputSize += chunk.length;
    if (outputSize > 100 * 1024 * 1024) {
        // 100MB limit
        ls.kill(); // Terminate if too much output
    }
});
```

### IPC Patterns (fork)

```js
// parent.js
const { fork } = require("child_process");
const worker = fork("worker.js");

// Send message to child
worker.send({ type: "compute", n: 1e8 });

// Receive message from child
worker.on("message", (result) => {
    console.log("Result from worker:", result);
});

// Handle worker exit
worker.on("close", (code) => {
    console.log("Worker exited with code", code);
});

// -----

// worker.js
process.on("message", (msg) => {
    if (msg.type === "compute") {
        let sum = 0;
        for (let i = 0; i < msg.n; i++) sum += i;
        process.send({ result: sum });
    }
});
```

### Senior-Level Q&A

**Q1: When would you use `exec` vs `spawn` vs `fork`? Give specific examples.**

A:

**`exec`:** Short commands, small output

```js
const { exec } = require("child_process");

// Example: Check if service is running
exec("systemctl is-active nginx", (err, stdout) => {
    if (stdout.includes("active")) {
        console.log("Nginx is running");
    }
});
```

**`spawn`:** Long-running, high output, streaming

```js
const { spawn } = require("child_process");

// Example: Process log file (large)
const tail = spawn("tail", ["-f", "/var/log/app.log"]);
tail.stdout.on("data", (chunk) => {
    // Stream log lines
    console.log(chunk.toString());
});
```

**`fork`:** CPU-bound work, need communication

```js
const { fork } = require("child_process");

// Example: Batch processing
const worker = fork("image-processor.js");
worker.send({ images: [...], operation: "resize" });
worker.on("message", (processed) => {
    console.log("Processed batch:", processed.count);
});
```

**Q2: Your app uses `exec` to run a system command. What's the security risk?**

A: **Shell injection.** User input in `exec` command can execute arbitrary code:

```js
// ❌ VULNERABLE: User input in command
const { exec } = require("child_process");
const userId = req.query.id; // User-controlled

exec(`cat /tmp/user_${userId}.txt`, (err, stdout) => {
    console.log(stdout);
});

// Attack: Malicious input
// /tmp/user_; rm -rf / .txt
// Full command: cat /tmp/user_; rm -rf / .txt (DISASTER!)

// ✅ SAFE: Use execFile (no shell)
const { execFile } = require("child_process");
execFile("cat", [`/tmp/user_${userId}.txt`], (err, stdout) => {
    // Arguments passed as array, no shell interpretation
    console.log(stdout);
});

// ✅ ALSO SAFE: Input validation + escaping
const shell = require("shellwords");
const escaped = shell.escape(userId);
exec(`cat /tmp/user_${escaped}.txt`, ...);
```

**Q3: You spawn a child process for a long task. How do you handle cleanup if the parent crashes?**

A: Orphaned child processes continue running. Proper cleanup:

```js
const { spawn } = require("child_process");

class ChildProcessManager {
    constructor() {
        this.children = new Set();
    }

    spawn(cmd, args) {
        const child = spawn(cmd, args);
        this.children.add(child);

        child.on("close", () => {
            this.children.delete(child);
        });

        // If parent exits, kill all children
        process.on("exit", () => this.killAll());
        process.on("SIGTERM", () => this.killAll());
        process.on("SIGINT", () => this.killAll());

        return child;
    }

    killAll() {
        this.children.forEach((child) => {
            if (!child.killed) {
                child.kill("SIGTERM");
                // Force kill after timeout
                setTimeout(() => {
                    if (!child.killed) child.kill("SIGKILL");
                }, 5000);
            }
        });
    }
}
```

**Q4: How do you handle errors and timeouts in child processes?**

A:

```js
const { spawn } = require("child_process");

function spawnWithTimeout(cmd, args, timeoutMs = 30000) {
    const child = spawn(cmd, args);
    let timedOut = false;

    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
    }, timeoutMs);

    return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });

        child.on("close", (code) => {
            clearTimeout(timeout);

            if (timedOut) {
                reject(new Error(`Process timed out after ${timeoutMs}ms`));
            } else if (code !== 0) {
                reject(
                    new Error(`Process exited with code ${code}: ${stderr}`),
                );
            } else {
                resolve(stdout);
            }
        });

        child.on("error", (err) => {
            clearTimeout(timeout);
            reject(new Error(`Failed to spawn process: ${err.message}`));
        });
    });
}

// Usage
spawnWithTimeout("node", ["compute.js"], 10000)
    .then((result) => console.log(result))
    .catch((err) => console.error("Failed:", err));
```

**Q5: Design an IPC-based task queue (parent distributes work to workers).**

A:

```js
// task-queue.js
const { fork } = require("child_process");
const os = require("os");

class TaskQueue {
    constructor(workerScript, numWorkers = os.cpus().length) {
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Map();

        for (let i = 0; i < numWorkers; i++) {
            const worker = fork(workerScript);
            worker.on("message", (result) => {
                this.handleWorkerResult(result);
            });
            this.workers.push(worker);
        }
    }

    enqueue(task, id) {
        this.taskQueue.push({ task, id });
        this.distributeWork();
    }

    distributeWork() {
        while (this.taskQueue.length > 0) {
            const availableWorker = this.workers.find(
                (w) => !this.activeWorkers.has(w.pid),
            );

            if (!availableWorker) break; // All workers busy

            const { task, id } = this.taskQueue.shift();
            this.activeWorkers.set(availableWorker.pid, id);
            availableWorker.send({ id, task });
        }
    }

    handleWorkerResult(result) {
        const { id, output, error } = result;
        this.activeWorkers.delete(result.workerPid);
        // Handle result...
        this.distributeWork(); // Process next queued task
    }

    shutdown() {
        this.workers.forEach((w) => w.kill());
    }
}

module.exports = TaskQueue;
```

### Best Practices

- **Use `spawn` for long-running processes;** `exec` for short commands.
- **Use `execFile` instead of `exec`** to avoid shell injection.
- **Always handle child process errors** and exits.
- **Implement timeouts** for long-running tasks.
- **Clean up children on parent exit:** `process.on('exit', killChildren)`.
- **Monitor child process resource usage:** CPU, memory; restart if exceeded.

### Common Pitfalls

- **Shell injection with `exec`:** Always use `execFile` or escape input.
- **Memory leaks from buffered output:** Use `spawn` with streams for large output.
- **Orphaned child processes:** Always kill on parent exit.
- **Not handling timeouts:** Endless waiting for slow children.
- **Ignoring stdio:** Uncaught child errors (not logged) make debugging hard.

### References: [EventEmitters/\_exec.js](EventEmitters/_exec.js), [EventEmitters/\_spawn.js](EventEmitters/_spawn.js), [ClusterAndFork/index.js](ClusterAndFork/index.js), [ClusterAndFork/child.js](ClusterAndFork/child.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"exec vs spawn?"_ → `exec` buffers all output into a string (good for small commands); `spawn` streams output (good for long-running processes).
> - _"When to use fork?"_ → `fork` is a special `spawn` for Node scripts — it creates an IPC channel for message passing between parent and child.
> - _"How to prevent shell injection?"_ → Use `execFile` or `spawn` (no shell) instead of `exec`; never pass user input directly to a shell command.
> - _"What happens if the parent dies?"_ → Orphaned children keep running; use `process.on('exit', killChildren)` or set `detached: false`.

> **📝 Quick Revision — Child Processes:**
> | Method | Shell? | Output | IPC? | Best For |
> |---|---|---|---|---|
> | `exec` | ✅ Yes | Buffered string | ❌ | Short commands, small output |
> | `execFile` | ❌ No | Buffered string | ❌ | Safe alternative to exec |
> | `spawn` | ❌ No | Streamed | ❌ | Long-running, large output |
> | `fork` | ❌ No | Streamed | ✅ Yes | Node-to-Node communication |

[↑ Back to Index](#table-of-contents)

---

## Phase 4 — Concurrency & Scaling

### 4.1 Worker Threads & Atomics

### Concepts

Worker threads give Node.js **true multithreading** — multiple JavaScript execution contexts running in parallel on separate CPU cores. This is fundamentally different from child processes.

**The problem worker threads solve:** Node's main thread is great for I/O, but terrible for CPU-heavy work. If you need to hash passwords, resize images, parse large JSON, or compute analytics, blocking the main thread means **zero requests are served** until the computation finishes. Worker threads let you run this heavy work on a separate thread.

**How are they different from child processes?** A child process (`fork`) creates an entirely new Node.js process with its own memory space (~100-200MB). Worker threads run inside the **same process** but with their own V8 isolate (JavaScript engine instance), their own event loop, and their own stack. Memory overhead is much lower (~30-50MB per thread) and you can **share memory** between threads using `SharedArrayBuffer`.

**V8 Isolate:** Each worker thread gets its own V8 isolate — a completely independent JavaScript execution environment. Variables, functions, and closures in one thread are invisible to another thread. Communication happens through **message passing** (`postMessage`) or **shared memory** (`SharedArrayBuffer`).

**Shared memory and Atomics:** `SharedArrayBuffer` lets multiple threads access the same block of raw memory. But this introduces **race conditions** — two threads reading and writing the same memory location simultaneously can corrupt data. `Atomics` provides thread-safe operations: `Atomics.add()` for atomic increment, `Atomics.compareExchange()` for compare-and-swap, and `Atomics.wait()`/`Atomics.notify()` for thread signaling.

**When NOT to use worker threads:** If your work is I/O-bound (database queries, HTTP calls, file reads), worker threads won't help because Node already handles I/O asynchronously. Worker threads shine only for **CPU-bound** work.

```mermaid
graph TB
    subgraph Process ["Single Node.js Process"]
        Main["Main Thread<br/>Event Loop + Your Server Code<br/>Handles HTTP, I/O, etc."]

        subgraph Workers ["Worker Thread Pool"]
            W1["Worker 1<br/>Own V8 Isolate<br/>Own Event Loop"]
            W2["Worker 2<br/>Own V8 Isolate<br/>Own Event Loop"]
            W3["Worker 3<br/>Own V8 Isolate<br/>Own Event Loop"]
        end

        SAB["SharedArrayBuffer<br/>Shared Memory Region<br/>Access via Atomics"]
    end

    Main -->|"postMessage()<br/>(structured clone)"| W1
    Main -->|"postMessage()"| W2
    W1 -->|"parentPort.postMessage()"| Main

    W1 -.->|"Direct memory access"| SAB
    W2 -.->|"Direct memory access"| SAB
    W3 -.->|"Direct memory access"| SAB
    Main -.->|"Direct memory access"| SAB

    style Main fill:#2196f3,color:#fff
    style SAB fill:#ff9800,color:#fff
    style Workers fill:#66bb6a,color:#fff
```

### Key APIs

- `new Worker(path, { workerData })` — create worker thread.
- `parentPort.postMessage(data)` — send message from worker.
- `parentPort.on('message', cb)` — receive message in worker.
- `worker.on('message', cb)` — receive message in parent.
- `Atomics.wait(typedArray, index)` — block thread until notify.
- `Atomics.notify(typedArray, index)` — wake waiting threads.

### Worker Basics

```js
// main.js
const { Worker } = require("worker_threads");

const worker = new Worker("./worker.js", {
    workerData: { n: 1e8 }, // Pass initial data
});

worker.on("message", (result) => {
    console.log("Worker result:", result);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

worker.on("exit", (code) => {
    console.log("Worker exited with code", code);
});

// -----

// worker.js
const { parentPort, workerData } = require("worker_threads");

let sum = 0;
for (let i = 0; i < workerData.n; i++) {
    sum += i;
}

parentPort.postMessage({ sum });
```

### Shared Memory & Atomics

```js
// main.js: Shared buffer communication
const { Worker } = require("worker_threads");

const sharedBuffer = new SharedArrayBuffer(4); // 4 bytes
const sharedArray = new Int32Array(sharedBuffer);
sharedArray[0] = 0; // Initial value

const worker = new Worker("./worker.js", {
    workerData: { sharedBuffer },
});

// Wait for worker to signal (blocking)
console.log("Waiting for worker...");
Atomics.wait(sharedArray, 0, 0); // Block until value changes from 0
console.log("Worker signaled! Value:", sharedArray[0]);

// -----

// worker.js: Modify shared buffer and signal
const { workerData } = require("worker_threads");
const sharedArray = new Int32Array(workerData.sharedBuffer);

// Do computation
const result = 42;

// Store result and signal parent
sharedArray[0] = result;
Atomics.notify(sharedArray, 0); // Wake parent thread
```

### Senior-Level Q&A

**Q1: When should you use worker_threads vs cluster? Performance comparison?**

A:

| Aspect          | Worker Threads       | Cluster                   |
| --------------- | -------------------- | ------------------------- |
| Processes       | 1 (shared libuv)     | Multiple (each has libuv) |
| Memory overhead | ~30-50MB per thread  | ~100-200MB per process    |
| IPC cost        | Shared memory (fast) | OS pipes (slower)         |
| Shared state    | SharedArrayBuffer    | External store (Redis)    |
| Best for        | CPU-bound            | HTTP servers, I/O-bound   |
| GC pause impact | Affects all threads  | Isolated per process      |

```js
// CPU-bound: Worker threads win
const { Worker } = require("worker_threads");
const os = require("os");

function computeHeavy(data) {
    return new Promise((resolve) => {
        const worker = new Worker("./compute.js", {
            workerData: { data },
        });
        worker.on("message", resolve);
    });
}

// Parallel heavy compute (faster with threads)
const results = await Promise.all([
    computeHeavy(data1),
    computeHeavy(data2),
    computeHeavy(data3),
]);

// I/O-bound: Cluster wins (built-in load balancing for HTTP)
const cluster = require("cluster");
const http = require("http");

if (cluster.isMaster) {
    for (let i = 0; i < os.cpus().length; i++) {
        cluster.fork();
    }
} else {
    http.createServer((req, res) => {
        res.end("OK");
    }).listen(3000);
}
```

**Q2: Explain race conditions with shared memory. Give an example and solution.**

A: **Race condition:** Multiple threads modify shared state simultaneously, causing data corruption.

```js
// ❌ RACE CONDITION: Many threads increment shared counter
// Expected: 10,000,000 (10 threads × 1,000,000 each)
// Actual: ~5,000,000 (random, due to race condition)

// main.js
const { Worker } = require("worker_threads");

const shared = new SharedArrayBuffer(4);
const sharedInt = new Int32Array(shared);
sharedInt[0] = 0;

// Create 10 workers, each increments 1,000,000 times
const workers = [];
for (let i = 0; i < 10; i++) {
    const w = new Worker("./worker.js", { workerData: { shared } });
    workers.push(w);
}

Promise.all(workers.map((w) => new Promise((r) => w.on("exit", r)))).then(
    () => {
        console.log("Final count:", sharedInt[0]);
        console.log("Expected: 10,000,000");
    },
);

// -----

// worker.js (❌ UNSAFE)
const { workerData } = require("worker_threads");
const sharedInt = new Int32Array(workerData.shared);

for (let i = 0; i < 1000000; i++) {
    sharedInt[0]++; // RACE CONDITION: Read-modify-write is not atomic!
}
```

**Fix: Use Atomics for atomic operations**

```js
// worker.js (✅ SAFE with Atomics)
const { workerData } = require("worker_threads");
const sharedInt = new Int32Array(workerData.shared);

for (let i = 0; i < 1000000; i++) {
    Atomics.add(sharedInt, 0, 1); // Atomic increment
}
```

**Result:**

- Without Atomics: ~5,000,000 (WRONG)
- With Atomics: 10,000,000 (CORRECT)

**Q3: Design a task pool that distributes CPU-bound work across worker threads.**

A:

```js
class WorkerPool {
    constructor(workerScript, poolSize = 4) {
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Map();

        for (let i = 0; i < poolSize; i++) {
            const worker = new Worker(workerScript);
            worker.on("message", (result) => {
                this.handleWorkerResult(worker, result);
            });
            this.workers.push(worker);
        }
    }

    execute(task) {
        return new Promise((resolve, reject) => {
            const taskId = Math.random();

            const availableWorker = this.workers.find(
                (w) => !this.activeWorkers.has(w),
            );

            if (availableWorker) {
                this.assignTask(availableWorker, task, taskId, resolve, reject);
            } else {
                // Queue task if all workers busy
                this.taskQueue.push({ task, taskId, resolve, reject });
            }
        });
    }

    assignTask(worker, task, taskId, resolve, reject) {
        this.activeWorkers.set(worker, { taskId, resolve, reject });
        worker.send({ task, taskId });
    }

    handleWorkerResult(worker, { taskId, error, result }) {
        const pending = this.activeWorkers.get(worker);
        this.activeWorkers.delete(worker);

        if (error) {
            pending.reject(new Error(error));
        } else {
            pending.resolve(result);
        }

        // Process next queued task
        if (this.taskQueue.length > 0) {
            const { task, taskId, resolve, reject } = this.taskQueue.shift();
            this.assignTask(worker, task, taskId, resolve, reject);
        }
    }

    terminate() {
        this.workers.forEach((w) => w.terminate());
    }
}

// Usage
const pool = new WorkerPool("./cpu-worker.js", 4);

const results = await Promise.all([
    pool.execute({ n: 1e8 }),
    pool.execute({ n: 1e8 }),
    pool.execute({ n: 1e8 }),
]);

pool.terminate();
```

**Q4: When would you use `Atomics.wait()` and `Atomics.notify()`? What are the pitfalls?**

A: **Use case:** Thread synchronization and signaling (low-latency inter-thread coordination).

```js
// Example: Producer-consumer with shared buffer
// main.js (producer)
const sharedBuffer = new SharedArrayBuffer(4);
const sharedArray = new Int32Array(sharedBuffer);

const worker = new Worker("./consumer.js", { workerData: { sharedBuffer } });

// Produce data
for (let i = 0; i < 10; i++) {
    setTimeout(() => {
        sharedArray[0] = i;
        Atomics.notify(sharedArray, 0); // Wake consumer
    }, 100 * i);
}

// -----

// consumer.js (consumer)
const { workerData } = require("worker_threads");
const sharedArray = new Int32Array(workerData.sharedBuffer);

for (let i = 0; i < 10; i++) {
    Atomics.wait(sharedArray, 0, i - 1); // Block until value changes
    console.log("Received:", sharedArray[0]);
}
```

**Pitfalls:**

- **Only works with Int32Array/BigInt64Array:** Other types throw.
- **Blocks the entire worker thread:** No event loop processing while waiting.
- **Complex to reason about:** Easy to deadlock or miss signals.
- **Performance overhead:** Spinning/polling in `Atomics.wait` is expensive.

**Best practice:** Use `Atomics.wait` only for ultra-low-latency coordination (< 1ms); prefer message passing for most cases.

### Best Practices

- **Use workers for pure CPU-bound tasks:** Heavy computation, bulk data processing.
- **Avoid workers for I/O-bound work:** Cluster or async better for HTTP/network.
- **Prefer message passing over shared memory:** Safer, simpler reasoning about correctness.
- **Use `Atomics` only for fine-grained synchronization:** The complexity cost is high.
- **Pool workers to avoid creation overhead:** Creating workers is expensive (~30MB each).

### Common Pitfalls

- **Serializing large data between threads:** Expensive; consider shared buffers for huge arrays.
- **Race conditions with Atomics:** Must use atomic operations (add, compareExchange, etc.).
- **Blocking on `Atomics.wait`:** Prevents event loop; entire worker freezes.
- **Resource leaks:** Forgetting to `terminate()` workers leaves threads running.

### References: [workerthreads/server.js](workerthreads/server.js), [workerthreads/worker.js](workerthreads/worker.js), [\_atomics/atomics.js](_atomics/atomics.js), [\_atomics/parent.js](_atomics/parent.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Worker threads vs child processes?"_ → Workers share the same process (~40MB overhead, can share memory via SharedArrayBuffer); child processes are fully isolated (~150MB, communicate via IPC).
> - _"When to use worker threads?"_ → For CPU-bound tasks like hashing, image processing, or parsing large JSON — anything that would block the event loop.
> - _"What is SharedArrayBuffer?"_ → A fixed-size binary buffer that can be shared between threads without copying — both threads see the same memory.
> - _"What do Atomics do?"_ → Atomic operations (load, store, add, wait, notify) prevent race conditions when multiple threads read/write shared memory simultaneously.

> **📝 Quick Revision — Worker Threads:**
> | Concept | Key Point |
> |---|---|
> | `new Worker(file)` | Creates a new thread with its own V8 isolate and event loop |
> | `postMessage` / `on('message')` | Message passing (data is cloned by default) |
> | `SharedArrayBuffer` | Zero-copy shared memory between threads |
> | `Atomics.wait/notify` | Thread synchronization primitives |
> | `workerData` | Pass initial data to worker at creation time |
> | `worker.terminate()` | Kill a worker; always clean up to prevent leaks |

[↑ Back to Index](#table-of-contents)

---

### 4.2 Cluster & Fork

### Concepts

The cluster module lets you run **multiple copies of your Node.js server** on the same machine, each on its own CPU core. It's the easiest way to utilize a multi-core machine for handling more HTTP requests.

**Why clustering matters:** A single Node.js process uses only **one CPU core**. On an 8-core server, you're using only 12.5% of the CPU. Clustering runs 8 instances of your server, each handling requests independently, multiplying your throughput by up to 8x.

**How it works at the OS level:** The master process creates a TCP server socket and listens on a port. When it forks worker processes, the workers **inherit** the same socket. The OS kernel distributes incoming connections across workers using **round-robin** scheduling (on Linux/macOS). No reverse proxy needed — the OS handles load balancing.

**Master vs Worker roles:**

- **Master:** Never handles requests. Only manages workers: forking, monitoring health, restarting crashed workers, coordinating graceful shutdown. Think of it as a factory supervisor.
- **Workers:** Handle requests. Each worker is a full Node.js process with its own V8 engine, event loop, and memory. Workers don't share state — they're like separate servers that happen to listen on the same port.

**The stateless requirement:** Because workers don't share memory, you can't store sessions or caches in JavaScript variables (each worker has its own). Use **external stores** (Redis, database) for shared state. This is actually a benefit — it forces a stateless architecture that scales horizontally.

**Cluster vs PM2:** PM2 essentially wraps the cluster module with extras: zero-downtime deployment, log management, process monitoring, and auto-restart. For production, PM2 is the practical choice. For interviews, know how cluster works internally.

### Key APIs

- `cluster.fork()` — create worker process.
- `cluster.on('online', 'exit', 'message')` — master-side events.
- `cluster.isMaster` / `cluster.isWorker` — process type check.
- `process.send()` / `process.on('message')` — IPC between master and worker.

### Basic Cluster Example

```js
const cluster = require("cluster");
const http = require("http");
const os = require("os");

if (cluster.isMaster) {
    // Master process
    const numWorkers = os.cpus().length;

    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart on crash
    });
} else {
    // Worker process
    http.createServer((req, res) => {
        res.writeHead(200);
        res.end(`Hello from worker ${process.pid}`);
    }).listen(3000);
}
```

### Senior-Level Q&A

**Q1: Compare cluster vs worker_threads vs child_process.fork. When to use each?**

A:

| Aspect           | Cluster                     | Worker Threads    | Fork (child_process) |
| ---------------- | --------------------------- | ----------------- | -------------------- |
| Process/Thread   | Process                     | Thread            | Process              |
| Memory per       | ~100-200MB                  | ~30-50MB          | ~100-200MB           |
| Use case         | HTTP servers                | CPU-bound work    | External commands    |
| Shared state     | External store              | SharedArrayBuffer | IPC messages         |
| Load balancing   | Built-in (round-robin)      | Manual (pool)     | Manual               |
| Restart on crash | Easy (`cluster.on('exit')`) | Manual            | Manual               |

```js
// Cluster: Best for HTTP servers (built-in load balancing)
const cluster = require("cluster");
const http = require("http");

if (cluster.isMaster) {
    const cpuCount = require("os").cpus().length;
    for (let i = 0; i < cpuCount; i++) cluster.fork();
} else {
    http.createServer((req, res) => {
        // Automatically load-balanced by OS
        res.end("OK");
    }).listen(3000);
}

// Worker threads: Best for CPU-bound (shared memory, lower overhead)
const { Worker } = require("worker_threads");
const pool = new WorkerPool("compute.js", 4);
const results = await Promise.all([pool.execute(task1), pool.execute(task2)]);

// Fork: Best for external tools or one-off heavy tasks
const { fork } = require("child_process");
const worker = fork("heavy-script.js");
worker.send({ data: largeFile });
worker.on("message", (result) => console.log(result));
```

**Q2: How does cluster load balancing work? Is it truly fair?**

A: **Cluster uses OS-level round-robin** (on most systems). The master accepts connections and distributes to idle workers.

```js
// Simplified cluster behavior:
// Master: accept() → distribute to worker[i]
// Workers: listen on inherited socket, accept connections

// Fair distribution? Generally yes, BUT:
// - Slow workers might lag (no automatic rebalancing)
// - Sticky sessions need special handling
// - Hash-based routing more fair for long connections

// Example: Sticky load balancing (session affinity)
const net = require("net");
const { v4: uuid } = require("uuid");
const cluster = require("cluster");

if (cluster.isMaster) {
    // Hash-based routing for sticky sessions
    const workers = [];
    for (let i = 0; i < 4; i++) {
        workers.push(cluster.fork());
    }

    const server = net.createServer((socket) => {
        // Hash client IP to consistent worker
        const clientIp = socket.remoteAddress;
        const hash = clientIp.split(".").reduce((a, b) => a + parseInt(b), 0);
        const workerIndex = hash % workers.length;

        // Send socket handle to selected worker
        workers[workerIndex].send("sticky-session:connection", socket);
    });

    server.listen(3000);
} else {
    // Worker handles sticky connections
    process.on("message", (msg) => {
        // Handle connection...
    });
}
```

**Q3: Explain graceful shutdown in cluster mode. How do you avoid dropping requests?**

A: Graceful shutdown: finish in-flight requests, reject new connections, then exit.

```js
const cluster = require("cluster");
const http = require("http");

if (cluster.isMaster) {
    const workers = [];

    for (let i = 0; i < 4; i++) {
        workers.push(cluster.fork());
    }

    // Gracefully shutdown on SIGTERM
    process.on("SIGTERM", () => {
        console.log("Master received SIGTERM, shutting down gracefully");

        // Tell workers to stop accepting new connections
        workers.forEach((w) => w.send({ cmd: "shutdown" }));

        // Give workers 30 seconds to finish in-flight requests
        const timeout = setTimeout(() => {
            workers.forEach((w) => w.kill());
            process.exit(1);
        }, 30000);

        cluster.on("exit", () => {
            if (workers.length === 0) {
                clearTimeout(timeout);
                process.exit(0);
            }
        });
    });
} else {
    // Worker process
    const server = http.createServer((req, res) => {
        res.end("Hello");
    });

    let isShuttingDown = false;

    process.on("message", (msg) => {
        if (msg.cmd === "shutdown") {
            isShuttingDown = true;
            server.close(() => {
                process.exit(0);
            });

            // Force exit after timeout
            setTimeout(() => {
                process.exit(1);
            }, 30000);
        }
    });

    // Reject new connections during shutdown
    server.on("connection", (socket) => {
        if (isShuttingDown) {
            socket.destroy();
        }
    });

    server.listen(3000);
}
```

**Q4: Your app uses sticky sessions but workers crash. How do you handle session affinity on worker restart?**

A: Store sessions externally (Redis); restarted worker can resume client sessions:

```js
const redis = require("redis");
const client = redis.createClient();

class SessionStore {
    async getSession(sessionId) {
        return JSON.parse(await client.get(`session:${sessionId}`));
    }

    async setSession(sessionId, data) {
        await client.setEx(`session:${sessionId}`, 3600, JSON.stringify(data));
    }
}

// Use in worker
http.createServer(async (req, res) => {
    const sessionId = req.headers.cookie?.match(/sid=([^;]+)/)?.[1];
    let session = await sessionStore.getSession(sessionId);

    if (!session) {
        session = { id: uuid(), data: {} };
        await sessionStore.setSession(session.id, session.data);
    }

    // Use session...
    res.end(JSON.stringify(session.data));
}).listen(3000);
```

**Q5: Your cluster app grows to 100+ workers. What scaling issues emerge?**

A:

1. **Master is bottleneck** (single process managing all workers).
    - Solution: Reverse proxy (nginx) in front, each cluster instance handles subset.

2. **Memory explosion** (100 workers × 150MB = 15GB).
    - Solution: Vertical scaling (distributed cluster across machines) or worker pool.

3. **Thundering herd** (all workers wake on single connection).
    - Solution: Custom load balancer (uvuson, node-cluster-service) with intelligent routing.

4. **Long-lived connections** (WebSockets) cause load imbalance.
    - Solution: Sticky routing + monitoring connection count per worker, rebalance if needed.

### Best Practices

- **Use cluster for HTTP servers** with stateless workers.
- **Implement graceful shutdown:** Finish in-flight requests, then exit.
- **Monitor worker crashes:** Log and alert; auto-restart via supervisor (PM2, systemd).
- **Externalize session state:** Redis for session affinity across worker restarts.
- **Use reverse proxy for horizontal scaling:** nginx in front of cluster instances.

### Common Pitfalls

- **Forgetting graceful shutdown:** Clients lose connections on deployment.
- **No monitor for worker crashes:** Silent worker deaths reduce capacity.
- **Sticky sessions without external store:** Session lost on worker crash.
- **Master process doing work:** Master should only manage; let workers do real work.
- **Too many workers:** Memory bloat; diminishing returns after CPU count.

### References: [ClusterAndFork/index.js](ClusterAndFork/index.js), [ClusterAndFork/child.js](ClusterAndFork/child.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Why use cluster?"_ → A single Node process uses one CPU core; cluster forks N workers sharing the same port to utilize all cores.
> - _"How does cluster load balancing work?"_ → On Linux/macOS the OS kernel distributes connections round-robin; on Windows, the master accepts and distributes.
> - _"Master should never handle requests — why?"_ → If the master crashes, ALL workers die; it should only manage lifecycle (fork, monitor, restart).
> - _"PM2 vs manual cluster?"_ → PM2 wraps cluster with auto-restart, log management, zero-downtime reload, and metrics — production-ready out of the box.

> **📝 Quick Revision — Cluster:**
> | Concept | Key Point |
> |---|---|
> | `cluster.fork()` | Creates a worker process (separate V8 + event loop) |
> | Shared port | All workers listen on the same port; OS distributes connections |
> | Master role | Only manages: fork, monitor health, restart crashed workers |
> | Graceful restart | Stop accepting new connections → finish in-flight → exit |
> | Stateless workers | Externalize state to Redis/DB; workers are disposable |
> | Worker count | `os.cpus().length` is the sweet spot; more = memory waste |

[↑ Back to Index](#table-of-contents)

--- Inter-thread / IPC Patterns

### Concepts

IPC (Inter-Process Communication) is how separate processes or threads talk to each other. Since each process/thread has its own memory, they can't just share variables — they need a communication channel.

**Two fundamental approaches:**

1. **Message Passing** (safe, higher latency): Processes send serialized messages through a pipe. The sender's data is **copied** to the receiver. No shared state means no race conditions. This is what `process.send()` and `worker.postMessage()` use. Think of it like sending letters — the sender writes a copy, and the receiver reads their own copy.

2. **Shared Memory** (fast, dangerous): Multiple threads access the **same** block of memory simultaneously. No copying means near-zero latency. But you must use `Atomics` to prevent data corruption. Think of it like a shared whiteboard — if two people write at the same time, the result is garbled.

**When to choose which:**

- **Message passing** for most cases: API calls, task distribution, status updates. Simpler to reason about, no race conditions.
- **Shared memory** for high-frequency data exchange (>10,000 ops/sec): Real-time analytics, gaming, audio processing. Worth the complexity only when message passing is too slow.

### Patterns

**Message passing (safe, decoupled):**

- `parentPort.postMessage()` / `worker.on('message')` (worker threads).
- `process.send()` / `process.on('message')` (forked processes).
- No shared state; each process/thread owns its data.

**Shared memory (low-latency, complex):**

- `SharedArrayBuffer` + `Atomics` for fine-grained synchronization.
- Direct memory access; must design for data races.

### Message Passing Patterns

```js
// Pattern 1: Request-Reply (simple RPC)
// parent.js
const { fork } = require("child_process");
const worker = fork("worker.js");

worker.send({ method: "compute", args: [10, 20] });
worker.on("message", (result) => {
    console.log("Result:", result);
});

// -----

// worker.js
process.on("message", (msg) => {
    if (msg.method === "compute") {
        const [a, b] = msg.args;
        process.send({ result: a + b });
    }
});

// Pattern 2: Publish-Subscribe (async notifications)
// parent.js
const workers = [fork("worker.js"), fork("worker.js")];

// Broadcast message to all workers
workers.forEach(w => w.send({ type: "config-update", data: {...} }));

// Receive updates from any worker
workers.forEach(w => {
    w.on("message", (msg) => {
        if (msg.type === "status-update") {
            console.log("Worker status:", msg.data);
        }
    });
});

// -----

// worker.js
process.on("message", (msg) => {
    if (msg.type === "config-update") {
        // Update local config
    }

    // Notify parent asynchronously
    setInterval(() => {
        process.send({ type: "status-update", data: { cpu: 25, mem: 512 } });
    }, 5000);
});
```

### Shared Memory Patterns

```js
// Pattern: Lock-free counter with Atomics
const shared = new SharedArrayBuffer(8);
const counter = new BigInt64Array(shared);

// Worker: Atomic increment
const { workerData } = require("worker_threads");
const sharedCounter = new BigInt64Array(workerData.shared);

for (let i = 0; i < 1000000; i++) {
    Atomics.add(sharedCounter, 0, 1n); // Atomic increment
}

// Pattern: Signaling (worker waits for parent signal)
const signal = new Int32Array(new SharedArrayBuffer(4));

// Worker: Block until signal
Atomics.wait(signal, 0, 0); // Wait for value to change

// Parent: Send signal
signal[0] = 1;
Atomics.notify(signal, 0); // Wake worker
```

### Senior-Level Q&A

**Q1: You have high-frequency communication between parent and worker (1000 msgs/sec). Message passing or shared memory?**

A:

**Message passing overhead:** ~100-500µs per message (serialization, OS IPC).
**Shared memory overhead:** ~1-10µs per operation (in-memory, atomic ops).

For 1000 msgs/sec: Message passing loses ~100-500ms/sec latency. Use shared memory for high-frequency.

```js
// Message-passing solution (slower)
worker.on("message", (data) => {
    total += data.value;
});

setInterval(() => {
    worker.send({ type: "fetch-data" });
}, 1); // Send 1000 msgs/sec

// Shared memory solution (faster)
const shared = new SharedArrayBuffer(8);
const sharedInt = new BigInt64Array(shared);

// Worker continuously updates sharedInt[0]
// Parent reads without triggering messages

// Every second, read atomically
const total = Atomics.load(sharedInt, 0);
```

**Q2: Design a message queue between multiple workers that respects order and handles backpressure.**

A:

```js
// Ring buffer with atomic indices
class MessageQueue {
    constructor(bufferSize = 1000) {
        this.sharedBuffer = new SharedArrayBuffer(3 * 4 + bufferSize * 8);
        this.indices = new Int32Array(this.sharedBuffer, 0, 3);
        this.data = new BigInt64Array(this.sharedBuffer, 12, bufferSize);
        this.bufferSize = bufferSize;
        // indices[0] = writeIndex, indices[1] = readIndex, indices[2] = count
    }

    enqueue(value) {
        const count = Atomics.load(this.indices, 2);
        if (count >= this.bufferSize) {
            return false; // Queue full
        }

        const writeIdx = Atomics.load(this.indices, 0);
        this.data[writeIdx] = BigInt(value);

        Atomics.store(this.indices, 0, (writeIdx + 1) % this.bufferSize);
        Atomics.add(this.indices, 2, 1);
        Atomics.notify(this.indices, 2); // Signal reader

        return true;
    }

    dequeue() {
        const count = Atomics.load(this.indices, 2);
        if (count === 0) {
            Atomics.wait(this.indices, 2, 0); // Block until data available
            return this.dequeue(); // Retry
        }

        const readIdx = Atomics.load(this.indices, 1);
        const value = this.data[readIdx];

        Atomics.store(this.indices, 1, (readIdx + 1) % this.bufferSize);
        Atomics.sub(this.indices, 2, 1);

        return Number(value);
    }

    isFull() {
        return Atomics.load(this.indices, 2) >= this.bufferSize;
    }
}
```

**Q3: How do you handle errors across process boundaries without losing the error context?**

A:

```js
// Serialize error with stack trace
function serializeError(err) {
    return {
        message: err.message,
        stack: err.stack,
        code: err.code,
        name: err.name,
    };
}

function deserializeError(obj) {
    const err = new Error(obj.message);
    err.stack = obj.stack;
    err.code = obj.code;
    return err;
}

// Parent
worker.on("message", (msg) => {
    if (msg.error) {
        const err = deserializeError(msg.error);
        // Handle error with original stack
    }
});

// Worker
try {
    const result = await heavyCompute();
    process.send({ result });
} catch (err) {
    process.send({ error: serializeError(err) });
}
```

### Best Practices

- **Prefer message passing for safety:** Easier to reason about correctness.
- **Use shared memory only for high-frequency coordination:** The complexity cost is high.
- **Always handle both success and error messages:** Timeouts + error handling.
- **Design for idempotency:** Network/process failures can duplicate messages.
- **Order matters:** Maintain message order if ordering is critical (use sequence numbers).

### Common Pitfalls

- **Fire-and-forget without confirmation:** Message loss on crash.
- **Unbounded message backlog:** Memory leak if producer faster than consumer.
- **Not handling message order:** Concurrent processing might reorder messages.
- **Synchronous wait on Atomics.wait:** Can deadlock if both threads wait.

### References: [threads.js](threads.js), [\_atomics/parent.js](_atomics/parent.js)

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Message passing vs shared memory?"_ → Message passing copies data (safe, no races); shared memory is zero-copy (fast, but needs Atomics for synchronization).
> - _"What serialization format does IPC use?"_ → `process.send()` uses JSON serialization; `postMessage()` uses the structured clone algorithm (supports more types like ArrayBuffer, Map, Set).
> - _"How to avoid IPC bottlenecks?"_ → Batch messages, use back-pressure (don't send faster than the consumer can process), and consider shared memory for high-frequency data.
> - _"Can two child processes talk directly?"_ → No — they must go through the parent process; or use an external broker (Redis pub/sub, message queue).

> **📝 Quick Revision — IPC Patterns:**
> | Pattern | Mechanism | Latency | Use Case |
> |---|---|---|---|
> | Message Passing | `send()` / `postMessage()` | ~100–500µs | General communication |
> | Shared Memory | `SharedArrayBuffer` + `Atomics` | ~1–10µs | High-frequency data exchange |
> | External Broker | Redis pub/sub, RabbitMQ | ~1–10ms | Cross-machine communication |
> | Pipe/Stream | `stdio` pipes | ~50–200µs | Streaming data between processes |

[↑ Back to Index](#table-of-contents)

---

### 4.4 Concurrency Models Comparison

Node.js gives you three main ways to run code in parallel. Understanding **when to use which** is the most common architecture interview question. Here's a simple mental model:

- **Cluster** = Multiple waiters in a restaurant, each serving their own tables. Great for handling many customers (HTTP requests). Each waiter works independently.
- **Worker Threads** = One waiter who asks the kitchen staff to help with heavy tasks (math, image processing). They share the same kitchen (process memory).
- **Child Process (Fork)** = Calling a separate catering company for a special order. Completely independent, more overhead, but totally isolated.

### Decision Matrix: Cluster vs Worker Threads vs Child Process

| Requirement                 | Cluster         | Worker Threads       | Fork (Child Process) |
| --------------------------- | --------------- | -------------------- | -------------------- |
| **HTTP server**             | ✅ Best         | ⚠️ Possible          | ❌ Overkill          |
| **CPU-bound tasks**         | ⚠️ Good         | ✅ Best              | ✅ Good              |
| **Shared state**            | ❌ Redis needed | ✅ SharedArrayBuffer | ❌ IPC messages      |
| **Memory overhead**         | ~150MB/process  | ~40MB/thread         | ~150MB/process       |
| **Startup time**            | ~100-300ms      | ~50ms                | ~100-300ms           |
| **Built-in load balancing** | ✅ Yes          | ❌ Manual            | ❌ No                |
| **Graceful restart**        | ✅ Easy         | ⚠️ Manual            | ⚠️ Manual            |
| **Code locality**           | ✅ Same code    | ✅ Same code         | ✅ Same code         |
| **Horizontal scaling**      | ✅ Easy         | ⚠️ Hard              | ✅ Easy              |

### Concurrency Models Architecture Diagram

This diagram shows the **fundamental difference** in how memory and resources are organized. Notice how Cluster creates separate processes (isolated) while Worker Threads share a single process.

```mermaid
graph TB
    subgraph Cluster["CLUSTER MODEL<br/>Multiple Processes"]
        direction TB
        Master["Master Process<br/>Manages workers<br/>No request handling"]
        W1["Worker 1<br/>Own V8 + Event Loop<br/>Own Memory: 150MB"]
        W2["Worker 2<br/>Own V8 + Event Loop<br/>Own Memory: 150MB"]
        W3["Worker 3<br/>Own V8 + Event Loop<br/>Own Memory: 150MB"]
        SharedPort["Shared Port 3000<br/>OS distributes connections"]

        Master -->|"fork()"| W1
        Master -->|"fork()"| W2
        Master -->|"fork()"| W3
        W1 --- SharedPort
        W2 --- SharedPort
        W3 --- SharedPort
    end

    subgraph ThreadModel["WORKER THREADS MODEL<br/>Single Process, Multiple Threads"]
        direction TB
        MainT["Main Thread<br/>HTTP Server<br/>Distributes tasks"]
        T1["Worker Thread 1<br/>CPU Task: hash password"]
        T2["Worker Thread 2<br/>CPU Task: resize image"]
        SharedMem["SharedArrayBuffer<br/>Zero-copy data sharing"]

        MainT -->|"postMessage()"| T1
        MainT -->|"postMessage()"| T2
        T1 -.->|"read/write"| SharedMem
        T2 -.->|"read/write"| SharedMem
    end

    Total1["Total Memory: 3 x 150MB = 450MB"]
    Total2["Total Memory: 1 process + 2 threads = 180MB"]

    Cluster --> Total1
    ThreadModel --> Total2

    style Cluster fill:#42a5f5,color:#fff
    style ThreadModel fill:#ffa726,color:#fff
    style Total1 fill:#ef5350,color:#fff
    style Total2 fill:#66bb6a,color:#fff
```

### Detailed Scenarios

**Scenario 1: HTTP API Server (1000 req/sec)**

```
→ Use: Cluster (4-8 workers)
  - Built-in load balancing
  - Each worker handles ~125-250 req/sec
  - Supervisor (PM2) restarts crashed workers
  - Redis for session/cache

→ Why not worker threads?
  - HTTP I/O-bound; workers better at CPU
  - Load balancing overhead not worth it
  - Cluster is battle-tested for HTTP
```

**Scenario 2: Real-time Analytics (high-frequency data processing)**

```
→ Use: Worker Threads + Shared Memory
  - Low-latency inter-thread communication
  - ~1-10µs vs ~100-500µs (message passing)
  - Shared buffers for 1000+ updates/sec
  - single process, coordinated V8 GC

→ Why not cluster?
  - Message passing too slow for 1000+/sec
  - IPC overhead (OS pipes, serialization)
  - Need tight synchronization
```

**Scenario 3: Batch Image Processing (10GB of images)**

```
→ Use: Child Process (fork) + Work Queue
  - Each worker processes subset of images
  - Master distributes via IPC message queue
  - Can be horizontal (multiple machines)
  - External database tracks progress (fault tolerance)

→ Why not workers or cluster?
  - Each worker might need different memory profiles
  - Independent failure/restart simplicity
  - Easier to distribute across machines
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Cluster vs Worker Threads — one sentence?"_ → Cluster = multiple processes sharing a port (best for HTTP); Worker Threads = multiple threads in one process sharing memory (best for CPU tasks).
> - _"How many cluster workers should I run?"_ → `os.cpus().length` — one per core; more than that wastes memory without improving throughput.
> - _"Can worker threads replace clustering?"_ → No — clustering provides built-in load balancing and automatic port sharing; worker threads are for offloading CPU work from the main thread.

> **📝 Quick Revision — Concurrency Models:**
> | Factor | Cluster | Worker Threads | Child Process |
> |---|---|---|---|
> | Isolation | Full (separate process) | Partial (same process) | Full (separate process) |
> | Memory | ~150MB each | ~40MB each | ~150MB each |
> | Communication | IPC (JSON copy) | postMessage + SharedArrayBuffer | IPC (JSON copy) |
> | Best for | HTTP servers | CPU-bound tasks | External commands, isolation |
> | Load Balancing | Built-in (OS round-robin) | Manual | Manual |

[↑ Back to Index](#table-of-contents)

---

## Phase 5 — Architecture & Production

### 5.1 System Design & Architecture

### Concepts

System design in Node.js is about building applications that handle **real-world scale** — thousands of concurrent users, gigabytes of data, and 99.9% uptime. The key principles:

**Stateless servers:** Store NO state in your Node process (no in-memory sessions, no local caches that aren't replicated). This lets you scale horizontally — add more servers behind a load balancer. Use Redis for sessions, a database for data.

**Connection pooling:** Don't create a new database connection per request. Maintain a **pool** of reusable connections (typically 10-20 per server). Each request borrows a connection, uses it, and returns it. This avoids the overhead of TCP handshake + auth per query.

**Caching layers:** Cache-aside pattern (check cache first, then DB) can reduce database load by 90%+. But cache invalidation is one of the hardest problems in computer science — stale data means users see outdated information.

**Queue-based architecture:** For long-running tasks (image processing, email sending, report generation), don't make the user wait. Accept the request, put a job in a queue (Redis, RabbitMQ), return immediately with a job ID, and process asynchronously. The user polls for the result.

### Scalability Patterns

#### Pattern 1: Horizontal Scaling with Reverse Proxy

```
Client → nginx (load balancer) → Cluster 1 (4 workers)
                              → Cluster 2 (4 workers)
                              → Cluster 3 (4 workers)

Shared:  Redis (sessions, cache)
         PostgreSQL (database)
```

#### Horizontal Scaling Architecture Diagram

This shows a production-ready architecture where multiple servers share the load. The load balancer distributes requests, and all servers share the same Redis (sessions/cache) and PostgreSQL (data).

```mermaid
graph TB
    Client["Users<br/>(thousands)"]
    LB["Load Balancer<br/>nginx or HAProxy<br/>Round-robin or IP hash"]

    subgraph Server1 ["Server A (4 cores)"]
        M1["Master"] --> W1a["Worker"]
        M1 --> W1b["Worker"]
        M1 --> W1c["Worker"]
        M1 --> W1d["Worker"]
    end

    subgraph Server2 ["Server B (4 cores)"]
        M2["Master"] --> W2a["Worker"]
        M2 --> W2b["Worker"]
        M2 --> W2c["Worker"]
        M2 --> W2d["Worker"]
    end

    subgraph SharedInfra ["Shared Infrastructure"]
        Redis["Redis<br/>Sessions + Cache<br/>Pub/Sub for events"]
        DB["PostgreSQL<br/>Primary data store<br/>Connection pooling"]
    end

    Client --> LB
    LB --> Server1
    LB --> Server2

    W1a -.-> Redis
    W2a -.-> Redis
    W1b -.-> DB
    W2b -.-> DB

    style LB fill:#ff9800,color:#fff
    style SharedInfra fill:#66bb6a,color:#fff
    style Server1 fill:#42a5f5,color:#fff
    style Server2 fill:#42a5f5,color:#fff
```

```js
// Cluster with graceful shutdown
const cluster = require("cluster");
const http = require("http");
const os = require("os");

const numWorkers = os.cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < numWorkers; i++) cluster.fork();

    process.on("SIGTERM", gracefulShutdown);

    function gracefulShutdown() {
        console.log("Shutting down...");
        Object.values(cluster.workers).forEach((w) => w.send({ cmd: "close" }));
        setTimeout(() => process.exit(0), 30000);
    }
} else {
    http.createServer(async (req, res) => {
        // Handle request...
    }).listen(3000);

    process.on("message", (msg) => {
        if (msg.cmd === "close") {
            process.exit(0);
        }
    });
}
```

#### Pattern 2: Task Queue for Long-Running Jobs

```
Client → API Server (returns job_id)
         ↓
         Redis Queue (Bull, RabbitMQ)
         ↓
    Worker Pool (processes jobs)
         ↓
    Database (stores results)
         ↓
Client polls for results
```

#### Task Queue Architecture

This pattern separates the API (fast response) from heavy processing (background). The user doesn't wait for the job to complete — they get a job ID immediately and can check back later.

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant Queue as Redis Queue (Bull)
    participant Worker as Background Worker
    participant DB as Database

    Note over Client,DB: Step 1: Submit Job
    Client->>API: POST /resize-image
    API->>Queue: Add job to queue
    API-->>Client: 202 Accepted, jobId: abc123
    Note over Client: User continues browsing

    Note over Queue,DB: Step 2: Process in Background
    Queue->>Worker: Dequeue next job
    Worker->>Worker: Resize image (60 seconds)
    Worker->>DB: Save result
    Worker->>Queue: Mark job complete

    Note over Client,DB: Step 3: Check Result
    Client->>API: GET /jobs/abc123
    API->>DB: Lookup result
    DB-->>API: { status: done, url: 'resized.jpg' }
    API-->>Client: { status: done, url: 'resized.jpg' }
```

```js
// Using Bull queue
const Queue = require("bull");
const imageQueue = new Queue("image-processing");

// Producer (API server)
app.post("/resize-image", async (req, res) => {
    const job = await imageQueue.add(
        { imageUrl: req.body.url, width: 300 },
        { attempts: 3, backoff: "exponential" },
    );
    res.json({ jobId: job.id });
});

// Consumer (worker)
imageQueue.process(async (job) => {
    const { imageUrl, width } = job.data;
    const resized = await resizeImage(imageUrl, width);
    return { url: resized };
});

// Client polls for result
app.get("/job/:id", async (req, res) => {
    const job = await imageQueue.getJob(req.params.id);
    if (job.isCompleted()) {
        res.json({ result: job.returnvalue });
    } else {
        res.status(202).json({ progress: job.progress() });
    }
});
```

#### Pattern 3: Request Flow in High-Concurrency System

```
1. Client sends request
2. Load balancer routes to worker A (nginx/HAProxy)
3. Worker A checks session cache (Redis)
4. Worker A queries database (connection pool)
5. Worker responds TO client

Concurrency:
- Multiple workers process different clients simultaneously
- Connection pooling reuses DB connections
- Cache hits avoid DB queries
- Backpressure: slow DB doesn't block other workers
```

### Senior-Level Scenarios

**Scenario: Design a Real-Time Chat Application (1000 concurrent WebSocket connections)**

#### Chat Application Architecture

This shows how a real-time chat system handles users distributed across multiple servers. Redis Pub/Sub ensures messages reach users on ANY server, not just the one the sender is connected to.

```mermaid
graph TB
    Users["1000 WebSocket Clients"]
    LB["Load Balancer<br/>Sticky sessions by user ID"]

    subgraph Servers["Chat Servers"]
        S1["Server 1<br/>~333 connections"]
        S2["Server 2<br/>~333 connections"]
        S3["Server 3<br/>~334 connections"]
    end

    subgraph Backend ["Backend Services"]
        PubSub["Redis Pub/Sub<br/>Broadcast messages<br/>across servers"]
        Cache["Redis Cache<br/>Online status<br/>Room members"]
        DB["PostgreSQL<br/>Message history<br/>User accounts"]
    end

    Users --> LB
    LB --> S1
    LB --> S2
    LB --> S3

    S1 <-->|"subscribe + publish"| PubSub
    S2 <-->|"subscribe + publish"| PubSub
    S3 <-->|"subscribe + publish"| PubSub

    S1 -.-> Cache
    S1 -.-> DB

    style LB fill:#ff9800,color:#fff
    style PubSub fill:#f44336,color:#fff
    style Cache fill:#4caf50,color:#fff
    style DB fill:#2196f3,color:#fff
```

#### Chat Message Flow Sequence Diagram

This shows the step-by-step flow when User 1 (on Server 1) sends a message to User 2 (on Server 2). Redis Pub/Sub is the bridge between servers.

```mermaid
sequenceDiagram
    participant U1 as User 1 (Server 1)
    participant S1 as Server 1
    participant Redis as Redis Pub/Sub
    participant S2 as Server 2
    participant U2 as User 2 (Server 2)
    participant DB as PostgreSQL

    U1->>S1: WebSocket: send message
    Note over S1: Validate message

    par Save and broadcast
        S1->>DB: INSERT INTO messages
        S1->>Redis: PUBLISH chat:room123
    end

    Redis->>S1: Message event (own server)
    Note over S1: User 1 already has it, skip

    Redis->>S2: Message event
    S2->>S2: Find local users in room123
    S2->>U2: WebSocket: new message

    U2-->>S2: ACK received
    Note over U1,U2: Message delivered cross-server
```

**Architecture:**

```
Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (nginx)                    │
├─────────────────────────────────────────────────────────────┤
│ Chat Server 1   Chat Server 2   Chat Server 3 (cluster)    │
│ (4 workers)     (4 workers)     (4 workers)                │
└─────────────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌───────────────────────────────────────┐
    │    Redis (pub/sub for cross-server)  │
    │    Redis (store rooms/messages)      │
    │    PostgreSQL (data persistence)     │
    └───────────────────────────────────────┘

Challenges & Solutions:
1. Sticky sessions (user stays on same server)
   → nginx hash routing based on user_id

2. Message broadcast across servers
   → Redis pub/sub (server 1 sends → all servers receive)

3. Presence tracking (who's online)
   → Redis sorted set: user_id, last_heartbeat
   → Cleanup stale users via TTL

4. Room scalability
   → Each server subscribes to rooms it has users in
   → Leave room → unsubscribe if no local users
```

**Code:**

```js
const http = require("http");
const WebSocket = require("ws");
const redis = require("redis");

const sub = redis.createClient();
const pub = redis.createClient();
const db = redis.createClient({ db: 1 }); // Separate DB for data

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map(); // userId → WebSocket

// Subscribe to broadcasts
sub.subscribe("chat:broadcast", (err, count) => {
    if (err) console.error("Redis subscription error", err);
});

sub.on("message", (channel, message) => {
    const { roomId, msg, senderId } = JSON.parse(message);

    // Broadcast to local clients in this room
    for (const [userId, ws] of clients) {
        const userRooms = db.smembers(`user:${userId}:rooms`);
        if (userRooms.includes(roomId) && userId !== senderId) {
            ws.send(JSON.stringify({ type: "message", msg }));
        }
    }
});

// WebSocket connection
wss.on("connection", (ws) => {
    const userId = extractUserIdFromWS(ws);
    clients.set(userId, ws);

    // Update presence
    db.setEx(`presence:${userId}`, 300, Date.now()); // 5 min TTL
    pub.publish(
        "chat:broadcast",
        JSON.stringify({
            type: "user_joined",
            userId,
            timestamp: Date.now(),
        }),
    );

    // Handle messages
    ws.on("message", async (data) => {
        const { roomId, text } = JSON.parse(data);

        // Store in database
        const msgId = uuid();
        await db.zadd(
            `room:${roomId}:messages`,
            Date.now(),
            `${msgId}:${text}`,
        );

        // Broadcast to all servers
        pub.publish(
            "chat:broadcast",
            JSON.stringify({
                roomId,
                msg: text,
                senderId: userId,
                timestamp: Date.now(),
            }),
        );
    });

    // Handle disconnect
    ws.on("close", () => {
        clients.delete(userId);
        db.del(`presence:${userId}`);
        pub.publish(
            "chat:broadcast",
            JSON.stringify({
                type: "user_left",
                userId,
            }),
        );
    });
});
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"How do you design a scalable Node.js system?"_ → Stateless servers + external state (Redis/DB) + load balancer + horizontal scaling. Each server is disposable.
> - _"Monolith vs microservices?"_ → Start monolith for speed; split into microservices when teams/domains grow and you need independent deployment.
> - _"How do you handle 10K concurrent WebSocket connections?"_ → One Node process handles ~10K WS easily (event-driven I/O). Scale horizontally with Redis pub/sub to relay messages across servers.
> - _"What is CQRS?"_ → Command Query Responsibility Segregation — separate write model (optimized for consistency) from read model (optimized for speed). Often paired with event sourcing.

> **📝 Quick Revision — System Design:**
> | Principle | Key Point |
> |---|---|
> | Stateless servers | No in-memory sessions/cache; use Redis/DB |
> | Horizontal scaling | Add more instances behind a load balancer |
> | Request flow | Client → LB → Server → Cache → DB |
> | Rate limiting | Token bucket / sliding window per IP/API key |
> | Circuit breaker | Fail fast when downstream is unhealthy; auto-recover |
> | Idempotency | Safe retries — same request produces same result |

[↑ Back to Index](#table-of-contents)

---

### 5.2 Database & Caching Patterns

### Concepts

Every Node.js application eventually talks to a database. How you manage database connections and caching determines whether your app handles 100 users or 100,000.

**Connection pooling:** Opening a database connection is expensive — TCP handshake, TLS negotiation, authentication. This takes ~50-100ms per connection. If you create a new connection per request, that's 50ms of wasted time **every request**. A connection pool creates a fixed number of connections at startup (say 20) and reuses them. Each request borrows a connection, runs a query, and returns it. Think of it like a car rental service — you don't buy a car for each trip.

**Caching with Redis:** Databases are slow (10-100ms per query). Redis is fast (~1ms). The **cache-aside** pattern is simple: before querying the DB, check Redis. If the data is there (cache hit), return immediately. If not (cache miss), query the DB, store the result in Redis with a TTL, and return it. Cache hit rates of 90%+ dramatically reduce DB load.

**Cache invalidation — the hard problem:** When data changes in the DB, the cache becomes **stale**. Three strategies:

- **TTL expiry:** Let cached data expire naturally. Simple but users see stale data until TTL.
- **Explicit deletion:** When you update the DB, also delete the cache key. Consistent but requires code discipline.
- **Write-through:** Update DB and cache simultaneously. Consistent but slower writes.

**Distributed locking:** When multiple Node servers process the same data (e.g., two servers try to charge the same order), you need a **distributed lock** — a shared "flag" in Redis that ensures only one process operates at a time. Redis `SETNX` (set if not exists) with TTL is the standard pattern.

### Connection Pooling

#### Connection Pool Architecture

This shows how a pool of reusable connections serves many concurrent requests without creating new connections each time. When all connections are busy, new requests wait in a queue.

```mermaid
graph TB
    App["Your Application<br/>20 concurrent requests"]

    subgraph Pool ["Connection Pool (max: 20)"]
        Active["Active Connections<br/>Currently running queries"]
        Idle["Idle Connections<br/>Ready for new queries"]
    end

    Queue["Waiting Queue<br/>Requests wait here when<br/>all connections busy<br/>Timeout: 2 seconds"]

    DB["PostgreSQL<br/>Max 200 total connections<br/>across all servers"]

    App -->|"Borrow connection"| Pool
    Pool -->|"All busy?"| Queue
    Queue -->|"Connection freed"| Pool
    Active -->|"Run query"| DB
    Active -->|"Query done, return"| Idle
    Idle -->|"30s idle? Close"| DB

    style Pool fill:#42a5f5,color:#fff
    style Queue fill:#ffa726,color:#fff
    style DB fill:#66bb6a,color:#fff
```

```js
const pg = require("pg");

// Create pool
const pool = new pg.Pool({
    max: 20, // Max connections
    idleTimeoutMillis: 30000, // Close idle after 30s
    connectionTimeoutMillis: 2000, // Timeout waiting for connection
    host: "localhost",
    port: 5432,
    database: "myapp",
    user: "user",
    password: "password",
});

// Use connection from pool
pool.query("SELECT * FROM users WHERE id = $1", [userId])
    .then((result) => console.log(result))
    .catch((err) => console.error(err));

// Handle pool errors
pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    // Alert monitoring
});

// Graceful shutdown
server.on("close", async () => {
    await pool.end();
});
```

### Redis Patterns

#### Cache-Aside Pattern (Lazy Loading)

The most common caching pattern. Check the cache first — if the data is there, return it instantly. If not, get it from the database and store it in the cache for next time.

```mermaid
sequenceDiagram
    participant Client
    participant App as Node.js App
    participant Cache as Redis (~1ms)
    participant DB as PostgreSQL (~50ms)

    Client->>App: GET /user/123
    App->>Cache: GET user:123

    alt Cache HIT (90% of requests)
        Cache-->>App: User data found!
        Note over App: Response time: ~2ms
        App-->>Client: 200 OK (from cache)
    else Cache MISS (10% of requests)
        Cache-->>App: null (not cached)
        App->>DB: SELECT * FROM users WHERE id=123
        DB-->>App: User data (took 50ms)
        App->>Cache: SETEX user:123 3600 data
        Note over Cache: Cached for 1 hour
        Note over App: Response time: ~55ms
        App-->>Client: 200 OK (from DB)
    end

    Note over Client,DB: Next request for same user: ~2ms (cached)
```

#### Write-Through Pattern (Synchronous)

When data is updated, write to BOTH the database AND cache at the same time. This keeps the cache always consistent, but writes are slightly slower.

```mermaid
sequenceDiagram
    participant Client
    participant App as Node.js App
    participant DB as PostgreSQL
    participant Cache as Redis

    Client->>App: PUT /user/123 (update name)

    Note over App: Update both stores
    App->>DB: UPDATE users SET name='Bob'
    DB-->>App: OK (50ms)

    App->>Cache: SETEX user:123 3600 newData
    Cache-->>App: OK (1ms)

    App-->>Client: 200 Updated

    Note over Cache,DB: Cache is ALWAYS consistent
    Note over Cache,DB: Trade-off: Every write is ~51ms
    Note over Cache,DB: (vs ~1ms for cache-aside on reads)
```

#### Cache Invalidation Strategies

Choosing the right invalidation strategy depends on your consistency requirements. Most apps use a combination.

```mermaid
flowchart TD
    Change["Data Changed in DB"]

    Change --> Strategy{"Which strategy?"}

    Strategy -->|"Explicit Delete<br/>(Recommended)"| Del["DEL user:123<br/>Remove specific key"]
    Strategy -->|"TTL Expiry<br/>(Simplest)"| TTL["Key auto-expires<br/>after 3600 seconds"]
    Strategy -->|"Pattern Delete<br/>(Bulk)"| Pattern["DEL user:*<br/>Remove all user keys"]

    Del --> Consistent["Immediately consistent<br/>Next read fetches fresh data"]
    TTL --> Stale["Stale for up to TTL<br/>Eventually consistent"]
    Pattern --> Consistent

    style Del fill:#4caf50,color:#fff
    style TTL fill:#ff9800,color:#fff
    style Pattern fill:#2196f3,color:#fff
    style Consistent fill:#66bb6a,color:#fff
    style Stale fill:#ffee58,color:#000
```

```js
const redis = require("redis");
const client = redis.createClient();

// Pattern 1: Cache-Aside (Lazy Loading)
async function getUserWithCache(id) {
    const cached = await client.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    const user = await db.getUserById(id);
    await client.setEx(`user:${id}`, 3600, JSON.stringify(user)); // 1 hour TTL
    return user;
}

// Pattern 2: Write-Through (Update DB, then cache)
async function updateUser(id, data) {
    await db.updateUser(id, data);
    await client.setEx(`user:${id}`, 3600, JSON.stringify(data));
}

// Pattern 3: Cache Invalidation
async function deleteUser(id) {
    await db.deleteUser(id);
    await client.del(`user:${id}`); // Explicit invalidation
}

// Pattern 4: Publish-Subscribe (Cross-server messaging)
app.post("/notify", (req, res) => {
    client.publish(
        "notifications",
        JSON.stringify({
            userId: req.body.userId,
            message: req.body.message,
        }),
    );
    res.json({ sent: true });
});

client.subscribe("notifications");
client.on("message", (channel, message) => {
    const { userId, message: msg } = JSON.parse(message);
    // Notify user via WebSocket, email, etc.
});
```

### Distributed Locking (Redis)

#### Lock Acquisition & Release Timeline

Distributed locks prevent two servers from processing the same resource simultaneously. This shows Process 1 acquiring the lock while Process 2 must wait and retry.

```mermaid
sequenceDiagram
    participant P1 as Process 1 (Server A)
    participant Redis as Redis Lock
    participant P2 as Process 2 (Server B)

    Note over P1,P2: Both try to update Order #123

    par Race for lock
        P1->>Redis: SETNX lock:order:123 (TTL 30s)
        P2->>Redis: SETNX lock:order:123 (TTL 30s)
    end

    Redis-->>P1: OK — lock acquired!
    Redis-->>P2: FAIL — lock exists

    rect rgba(56, 142, 60, 0.25)
        Note over P1: Has the lock — safe to proceed
        P1->>P1: Read order from DB
        P1->>P1: Update order total
        P1->>P1: Save to DB
        P1->>Redis: DEL lock:order:123
        Note over P1: Lock released
    end

    rect rgba(230, 81, 0, 0.25)
        Note over P2: Waiting with exponential backoff
        P2->>P2: Wait 100ms
        P2->>Redis: SETNX lock:order:123
        Redis-->>P2: FAIL — still locked
        P2->>P2: Wait 200ms
        P2->>Redis: SETNX lock:order:123
        Redis-->>P2: OK — lock acquired!
        P2->>P2: Process order safely
        P2->>Redis: DEL lock:order:123
    end
```

#### Lock Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Available: Redis key doesn't exist

    Available --> Locked: SETNX returns OK
    Note right of Locked: Owner holds UUID<br/>TTL = 30 seconds

    Locked --> Available: Owner calls DEL (normal release)
    Locked --> Available: TTL expires (owner crashed)

    Locked --> Rejected: Another process tries SETNX
    Rejected --> Retry: Wait with exponential backoff
    Retry --> Available: Try again
```

```js
const uuid = require("uuid");

// Pattern: Distributed lock with TTL and release
async function acquireLock(key, ttlSeconds) {
    const lockId = uuid.v4();
    const script = `
        if redis.call("get", KEYS[1]) == false then
            return redis.call("setex", KEYS[1], ARGV[1], ARGV[2])
        else
            return false
        end
    `;

    const result = await client.eval(script, 1, key, ttlSeconds, lockId);
    return result ? lockId : null;
}

async function releaseLock(key, lockId) {
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `;

    return await client.eval(script, 1, key, lockId);
}

// Usage: Prevent concurrent updates with exponential backoff retry
async function updateOrderWithLock(orderId, newData) {
    let lockId = null;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
        lockId = await acquireLock(`order:${orderId}`, 30);
        if (lockId) break;

        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
        const backoffMs = Math.pow(2, retries) * 100;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        retries++;
    }

    if (!lockId) {
        throw new Error("Could not acquire lock after retries");
    }

    try {
        await updateOrder(orderId, newData);
    } finally {
        await releaseLock(`order:${orderId}`, lockId);
    }
}
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Why use connection pooling?"_ → Opening a DB connection costs ~50-100ms (TCP+TLS+auth). A pool creates connections once and reuses them — requests borrow and return.
> - _"Cache-aside vs write-through?"_ → Cache-aside: app checks cache first, fills on miss. Write-through: writes go to cache AND DB simultaneously — always consistent but slower writes.
> - _"How do you prevent cache stampede?"_ → When a popular cache key expires, 1000 requests hit the DB at once. Fix with mutex lock (only one request refills cache) or staggered TTLs.
> - _"What is distributed locking?"_ → Preventing concurrent operations across multiple servers. Use Redis `SET key NX EX` (Redlock algorithm) — ensure only one process runs a critical section.

> **📝 Quick Revision — Database & Caching:**
> | Pattern | Mechanism | Use When |
> |---|---|---|
> | Connection Pool | Reuse pre-opened DB connections | Always in production |
> | Cache-aside | Check cache → miss → query DB → fill cache | Read-heavy data |
> | Write-through | Write to cache + DB simultaneously | Consistency matters |
> | TTL expiry | Auto-expire cache after N seconds | Tolerable staleness |
> | Distributed Lock | Redis SET NX EX (Redlock) | Preventing concurrent writes |
> | Read Replica | Route reads to replicas, writes to primary | High read volume |

[↑ Back to Index](#table-of-contents)

---

### 5.3 Debugging, Memory Profiling & Observability

### Concepts

Debugging a Node.js application in production is fundamentally different from debugging locally. You can't attach a debugger to a live server serving 10,000 users. Instead, you need **observability** — the ability to understand what's happening inside your application from the outside.

**The three pillars of observability:**

1. **Logs** — Timestamped records of what happened. Use structured logging (JSON) with libraries like Pino or Winston. Include request IDs so you can trace a single request across multiple services. Don't use `console.log` in production — it's synchronous and blocks the event loop.

2. **Metrics** — Numbers that tell you how the system is performing: request rate, error rate, response time (p50, p95, p99), memory usage, event loop lag. Export to Prometheus/Grafana for dashboards and alerts.

3. **Traces** — Follow a single request as it flows through multiple services. Tools like OpenTelemetry, Jaeger, or Datadog show you exactly where time is spent.

**Memory leaks — the silent killer:** In Node.js, memory leaks don't crash immediately. Heap usage slowly grows over hours or days until the process runs out of memory and crashes or the GC spends so much time that the app becomes unresponsive. The most common causes:

- Forgotten event listeners (`.on()` without `.removeListener()`)
- Unbounded caches (objects stored in Maps/Objects without eviction)
- Closures retaining references to large objects
- Global variables accumulating data

**How to detect leaks:** Take heap snapshots at intervals using `v8.writeHeapSnapshot()`, compare them in Chrome DevTools, and look for objects that grow between snapshots. The `clinic.js` tool automates this.

### Memory Leak Detection

#### Memory Patterns Over Time

This chart shows three patterns you'll see when monitoring heap memory. A healthy app stays flat. A slow leak grows gradually. An unbounded leak grows exponentially.

```mermaid
graph LR
    subgraph Healthy ["Healthy App — Stable Memory"]
        H1["50MB"] --> H2["52MB"] --> H3["48MB"] --> H4["51MB"]
    end

    subgraph Slow ["Slow Leak — Cache Growth"]
        S1["50MB"] --> S2["70MB"] --> S3["100MB"] --> S4["140MB"]
    end

    subgraph Fast ["Unbounded Leak — Listeners"]
        F1["50MB"] --> F2["150MB"] --> F3["400MB"] --> F4["CRASH!"]
    end

    style Healthy fill:#1b5e20,color:#fff
    style H1 fill:#43a047,color:#fff
    style H2 fill:#388e3c,color:#fff
    style H3 fill:#43a047,color:#fff
    style H4 fill:#388e3c,color:#fff
    style Slow fill:#e65100,color:#fff
    style S1 fill:#ef6c00,color:#fff
    style S2 fill:#e65100,color:#fff
    style S3 fill:#d84315,color:#fff
    style S4 fill:#bf360c,color:#fff
    style Fast fill:#b71c1c,color:#fff
    style F1 fill:#e53935,color:#fff
    style F2 fill:#d32f2f,color:#fff
    style F3 fill:#c62828,color:#fff
    style F4 fill:#b71c1c,color:#fff
```

#### Memory Leak Detection Workflow

This shows the three phases of detecting and fixing a memory leak: normal operation, leak detection, and debugging.

```mermaid
sequenceDiagram
    participant App as Node.js App
    participant Monitor as Heap Monitor
    participant Alert as Alert System
    participant Dev as Developer

    rect rgba(56, 142, 60, 0.25)
        Note over App,Monitor: PHASE 1 — Normal (heap stable)
        App->>Monitor: Heap: 50MB
        App->>Monitor: Heap: 52MB (after GC: 50MB)
        App->>Monitor: Heap: 51MB
        Note over Monitor: GC keeps heap stable
    end

    rect rgba(211, 47, 47, 0.25)
        Note over App,Alert: PHASE 2 — Leak Detected!
        App->>Monitor: Heap: 100MB (growing!)
        App->>Monitor: Heap: 150MB
        App->>Monitor: Heap: 200MB
        Monitor->>Alert: Heap growing 50MB/hour!
        Alert->>Dev: ALERT — Memory leak detected
        Dev->>App: Take heap snapshot #1
    end

    rect rgba(30, 136, 229, 0.25)
        Note over App,Dev: PHASE 3 — Root Cause Analysis
        App->>Monitor: Heap: 300MB
        Dev->>App: Take heap snapshot #2
        Dev->>Dev: Compare snapshots in Chrome DevTools
        Dev->>Dev: Found 10,000 EventListener objects
        Dev->>Dev: Source: .on('data') never removed
        Dev->>App: Deploy fix with .removeListener()
        App->>Monitor: Heap: 55MB (fixed!)
    end
```

**Detect leaks: Watch heap size over time**

```js
const v8 = require("v8");

setInterval(() => {
    const heapStats = v8.getHeapStatistics();
    console.log({
        heapUsed: Math.round(heapStats.total_heap_size / 1024 / 1024) + "MB",
        heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024) + "MB",
    });
}, 10000);

// If heapUsed grows unbounded → leak!
```

**Common memory leaks:**

```js
// ❌ Leak 1: Forgotten listener
setInterval(() => {
    const listener = () => {
        /* ... */
    };
    emitter.on("data", listener); // Never removed!
}, 100);

// Fix: Store and remove
let listener;
setInterval(() => {
    if (listener) emitter.removeListener("data", listener);
    listener = () => {
        /* ... */
    };
    emitter.on("data", listener);
}, 100);

// ❌ Leak 2: Global variable growth
global.cache = {}; // Unbounded growth
app.get("/api/data", (req, res) => {
    global.cache[req.query.key] = heavyData(); // Keep growing
});

// Fix: Use LRU cache with size limit
const LRU = require("lru-cache");
const cache = new LRU({ max: 1000 });
```

### Profiling CPU Bottlenecks

```js
// Flag: --prof
// node --prof app.js
// Creates isolate-*.log file

// Analyze:
// node --prof-process isolate-*.log > profile.txt
// Identify hot functions

// Or use clinic.js (automatic)
// npm install -g clinic
// clinic doctor -- node app.js
// clinic flame -- node app.js
// clinic flame-report-*.html (show flamegraph)
```

### Monitoring in Production

```js
// Structured logging
const pino = require("pino");
const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: { colorize: true },
    },
});

// Application metrics
const promClient = require("prom-client");
const httpDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP request in seconds",
    labelNames: ["method", "route", "status"],
});

app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = (Date.now() - start) / 1000;
        httpDuration.observe(
            {
                method: req.method,
                route: req.route?.path || "unknown",
                status: res.statusCode,
            },
            duration,
        );

        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
        });
    });

    next();
});

// Error tracking
process.on("unhandledRejection", (reason, promise) => {
    logger.error({ reason, promise }, "Unhandled rejection");
});

process.on("uncaughtException", (err) => {
    logger.error(err, "Uncaught exception");
    process.exit(1); // Restart (via supervisor like PM2)
});
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"How do you find memory leaks in Node.js?"_ → Take heap snapshots with `--inspect` + Chrome DevTools → compare two snapshots → look for growing object counts (retained size).
> - _"What causes event loop lag?"_ → Synchronous CPU work (tight loops, JSON.parse of huge payloads, RegEx backtracking, sync fs calls). Measure with `perf_hooks.monitorEventLoopDelay()`.
> - _"Structured logging vs console.log?"_ → Structured logging (pino/winston) outputs JSON with timestamp, level, request ID — searchable and parseable. `console.log` is unstructured text — useless at scale.
> - _"What is a flamegraph?"_ → Visual representation of CPU time per function call. Wide bars = hot functions. Generate with `clinic flame` or `0x`.

> **📝 Quick Revision — Debugging & Profiling:**
> | Tool | Purpose |
> |---|---|
> | `--inspect` + Chrome DevTools | Heap snapshots, CPU profiling, breakpoints |
> | `clinic doctor` | Auto-diagnose event loop issues |
> | `clinic flame` / `0x` | CPU flamegraph — find hot functions |
> | `perf_hooks` | Event loop lag, function timing |
> | `pino` / `winston` | Structured JSON logging with levels |
> | `process.memoryUsage()` | RSS, heap used/total at runtime |

[↑ Back to Index](#table-of-contents)

---

### 5.4 Production Practices & Security

### Concepts

Going from a working Node.js app to a **production-ready** app requires handling scenarios that never happen in development: server crashes, deployments without downtime, security attacks, and resource exhaustion.

**Graceful shutdown — why it matters:** When you deploy new code, the old process must stop. If you just `kill -9` the process, all in-flight requests are dropped — users see errors. A graceful shutdown: (1) stops accepting new connections, (2) waits for in-flight requests to finish (up to 30s), (3) closes database/cache connections, (4) exits cleanly. Process managers like PM2 send `SIGTERM` first and `SIGKILL` only after a timeout.

**Zero-downtime deployment:** Start the new version, wait until it's healthy (health check passes), then shut down the old version. With clustering, you can restart workers one at a time — at least 3 workers are always serving requests.

**Security in Node.js:** The most common vulnerabilities are:

- **Prototype pollution:** Malicious JSON input modifying `Object.prototype`, affecting all objects globally
- **ReDoS:** Regex patterns with nested quantifiers causing catastrophic backtracking (CPU 100%)
- **Command injection:** User input in `exec()` allowing arbitrary shell commands
- **SQL injection:** String concatenation in queries allowing data exfiltration

All of these are **preventable** with proper coding practices.

### Graceful Shutdown

#### Graceful Shutdown Timeline

This timeline shows the exact sequence of events during a graceful deployment. Notice how existing requests complete while new connections are rejected.

```mermaid
sequenceDiagram
    participant PM2 as Process Manager
    participant Server as Node.js Server
    participant Req as In-Flight Requests
    participant DB as Database Pool

    Note over PM2,DB: Normal Operation
    Req->>Server: Request A (processing)
    Req->>Server: Request B (processing)

    PM2->>Server: SIGTERM (deploy new version)
    Note over Server: isShuttingDown = true

    Server-->>Server: Stop accepting new connections
    Server--xReq: New Request C: 503 Service Unavailable

    Note over Req: Finish in-flight requests
    Req->>Server: Request A completes (200 OK)
    Req->>Server: Request B completes (200 OK)

    Note over Server: All requests done
    Server->>DB: Close all pool connections
    DB-->>Server: Connections closed
    Server->>PM2: process.exit(0)

    PM2->>PM2: Start new version
    Note over PM2: Zero downtime achieved
```

#### Shutdown State Machine

```mermaid
stateDiagram-v2
    [*] --> Running: Server listening on port 3000

    Running --> ShuttingDown: SIGTERM received

    state ShuttingDown {
        [*] --> RejectNew: Stop accepting connections
        RejectNew --> WaitInFlight: Wait for active requests
    }

    ShuttingDown --> Cleanup: All requests completed
    ShuttingDown --> ForceKill: 30s timeout reached

    state Cleanup {
        [*] --> CloseDB: Close database pool
        CloseDB --> CloseRedis: Close Redis connections
        CloseRedis --> CloseServer: Close server socket
    }

    Cleanup --> [*]: process.exit(0)
    ForceKill --> [*]: process.exit(1)
```

```js
const http = require("http");

let isShuttingDown = false;
const activeConnections = new Set();

const server = http.createServer(async (req, res) => {
    if (isShuttingDown) {
        res.writeHead(503);
        res.end("Server shutting down");
        return;
    }

    activeConnections.add(req.socket);

    try {
        // Handle request
        res.end("OK");
    } finally {
        activeConnections.delete(req.socket);
    }
});

// Graceful shutdown on SIGTERM
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, starting graceful shutdown");
    isShuttingDown = true;

    server.close(async () => {
        console.log("Server closed");
        // Cleanup: close DB connections, etc.
        process.exit(0);
    });

    // Force kill after 30 seconds
    setTimeout(() => {
        console.error("Graceful shutdown timeout, force killing");
        activeConnections.forEach((socket) => socket.destroy());
        process.exit(1);
    }, 30000);
});

server.listen(3000);
```

### Security: Common Vulnerabilities

#### Security Vulnerabilities Quick Reference

This diagram maps each vulnerability type to its attack vector and the fix. Colors indicate severity: red = critical, orange = high.

```mermaid
graph TB
    Input["Untrusted Input<br/>(query params, body, headers)"]

    Input --> Proto
    Input --> Regex
    Input --> Cmd
    Input --> SQL
    Input --> CORS

    subgraph Proto ["Prototype Pollution"]
        direction LR
        P1["Attack: JSON with __proto__"] --> P2["Fix: Object.create(null)<br/>or JSON schema validation"]
    end

    subgraph Regex ["ReDoS"]
        direction LR
        R1["Attack: Long string +<br/>nested quantifiers"] --> R2["Fix: Avoid (a+)+b patterns<br/>Use re2 library"]
    end

    subgraph Cmd ["Command Injection"]
        direction LR
        C1["Attack: exec with<br/>user input"] --> C2["Fix: Use execFile<br/>with args array"]
    end

    subgraph SQL ["SQL Injection"]
        direction LR
        S1["Attack: String concat<br/>in queries"] --> S2["Fix: Parameterized<br/>queries ($1, $2)"]
    end

    subgraph CORS ["CORS Misconfiguration"]
        direction LR
        CO1["Attack: origin: *<br/>with credentials"] --> CO2["Fix: Whitelist<br/>specific origins"]
    end

    style Proto fill:#ef5350,color:#fff
    style Regex fill:#ef5350,color:#fff
    style Cmd fill:#f44336,color:#fff
    style SQL fill:#f44336,color:#fff
    style CORS fill:#ffa726,color:#fff
```

#### Vulnerability Comparison Table

| Vulnerability           | Vector                          | Impact                              | Detection                    | Fix Effort |
| ----------------------- | ------------------------------- | ----------------------------------- | ---------------------------- | ---------- |
| **Prototype Pollution** | JSON.parse + Object.assign      | Global scope pollution, bypass auth | Code review, static analysis | Low        |
| **ReDoS**               | Nested regex quantifiers        | CPU spike, DoS                      | Performance testing, timeout | Low-Medium |
| **Command Injection**   | exec with user input            | Remote Code Execution               | Static analysis, shellcheck  | Medium     |
| **SQL Injection**       | String concatenation in queries | Data breach, deletion               | Code review, SQLi testing    | Low-Medium |
| **CORS Bypass**         | Wildcard origin + credentials   | Session hijacking, CSRF             | Browser security audit       | Low        |

```js
// 1. ❌ Prototype Pollution
const obj = {};
const maliciousInput = JSON.parse(`{"__proto__": {"isAdmin": true}}`);
Object.assign(obj, maliciousInput);
console.log({}.isAdmin); // true — VULNERABILITY!

// Fix: Use null prototype or validator
const safeObj = Object.create(null);
Object.assign(safeObj, maliciousInput); // No prototype chain

// 2. ❌ Regular Expression DoS (ReDoS)
const regex = /(a+)+b/;
regex.test("aaaaaaaaaaaaaaaaaaaaaaaac"); // Catastrophic backtracking!

// Fix: Avoid nested quantifiers, use stricter patterns
const safeRegex = /a+b/;

// 3. ❌ Command Injection
const { exec } = require("child_process");
const userId = req.query.id; // User input
exec(`echo "User: ${userId}"`, (err, stdout) => {
    // Injection: userId = "; rm -rf /"
});

// Fix: Use execFile or escape
const { execFile } = require("child_process");
execFile("echo", [`User: ${userId}`], (err, stdout) => {
    // Safe: userId passed as argument, not shell command
});

// 4. ❌ SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.query(query); // SQL injection!

// Fix: Parameterized queries
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);

// 5. ❌ CORS Misconfiguration
app.use(cors({ origin: "*" })); // Accept all origins!

// Fix: Whitelist approved origins
app.use(
    cors({
        origin: ["https://trusted.com", "https://app.com"],
        credentials: true,
    }),
);
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"How do you implement graceful shutdown?"_ → On SIGTERM: stop accepting new connections → finish in-flight requests (timeout 30s) → close DB/Redis connections → exit 0. PM2/K8s sends SIGKILL after timeout.
> - _"What is prototype pollution?"_ → Malicious JSON input modifying `Object.prototype` — affects ALL objects globally. Prevent with input validation (Joi/Zod), `Object.create(null)`, or `--frozen-intrinsics`.
> - _"How do you prevent ReDoS?"_ → Avoid nested quantifiers like `(a+)+`. Use `re2` library (RE2 engine — linear time guarantee) or `safe-regex` to audit patterns.
> - _"Zero-downtime deployment?"_ → Start new version → health check passes → graceful shutdown old version. With cluster: restart workers one at a time.

> **📝 Quick Revision — Production & Security:**
> | Practice | Key Point |
> |---|---|
> | Graceful shutdown | SIGTERM → stop accepting → drain requests → close connections → exit |
> | Zero-downtime deploy | Rolling restart; new process healthy before old stops |
> | Prototype pollution | Validate all JSON input; use `Object.create(null)` for maps |
> | ReDoS | Avoid nested quantifiers; use `re2` for untrusted patterns |
> | Helmet.js | Sets security headers (CSP, HSTS, X-Frame-Options) |
> | Rate limiting | Token bucket / sliding window; per IP and per API key |

[↑ Back to Index](#table-of-contents)

---

### 5.5 Interview Scenarios & System Design Problems

### Concepts

**System design interviews** test your ability to architect solutions that handle real-world scale. For Node.js positions, interviewers expect you to know:

1. **When Node.js is a good fit:** High-concurrency I/O-bound services (APIs, real-time apps, microservices, streaming). NOT for CPU-heavy computation (use Go, Rust, or offload to worker threads).

2. **The standard architecture:** Load Balancer → Cluster of Node servers → Redis (cache/sessions) → Database (PostgreSQL/MongoDB) → Message Queue (for async jobs).

3. **How to reason about scale:** Start with one server, identify bottlenecks, then scale horizontally. Calculate: if each request takes 10ms, one Node process handles ~100 req/sec. With 4 cluster workers, ~400 req/sec. Need 4000 req/sec? Add 10 servers behind a load balancer.

4. **Trade-offs:** Every design decision has trade-offs. Cache improves speed but introduces staleness. Replication improves availability but complicates consistency. Know the trade-offs and be ready to discuss them.

### Scenario 1: Design a URL Shortener (urls → short codes)

**Requirements:**

- Generate unique short codes (7-char)
- Redirect short code → long URL (fast)
- Track analytics (clicks, referrers)
- Handle 10k URLs/sec, 1M requests/sec

#### URL Shortener System Architecture

This shows the complete architecture for handling 1M requests/sec. The key insight is separating the **fast path** (redirects via cache) from the **slow path** (creating new URLs via DB).

```mermaid
graph TB
    Users["Users<br/>1M requests/sec"]
    LB["Load Balancer<br/>nginx"]

    subgraph API ["API Cluster (8 workers)"]
        W1["Worker 1"] & W2["Worker 2"] & W3["Worker 3"] & W4["Worker 4"]
    end

    Cache["Redis Cache<br/>code to URL mapping<br/>Hit rate: ~95%<br/>Response: ~1ms"]
    DB["PostgreSQL Primary<br/>Stores all URLs<br/>Response: ~50ms"]
    Replica["PostgreSQL Replica<br/>Read-only<br/>Analytics queries"]
    Queue["Message Queue<br/>Click tracking<br/>Async processing"]
    Analytics["Elasticsearch<br/>Click analytics<br/>Trends & reports"]

    Users --> LB --> API

    W1 -->|"GET /abc123 (95%)"| Cache
    W2 -->|"Cache miss (5%)"| DB
    W3 -->|"POST /shorten"| DB
    W4 -->|"Fire-and-forget"| Queue

    Queue --> Analytics
    DB --> Replica

    style Cache fill:#4caf50,color:#fff
    style DB fill:#2196f3,color:#fff
    style Analytics fill:#ff9800,color:#fff
```

#### Request Flow: Three Paths

This shows the three possible paths for a request: cache hit (fastest), cache miss (slower), and creating a new URL.

```mermaid
sequenceDiagram
    participant User
    participant API as API Server
    participant Cache as Redis Cache
    participant DB as PostgreSQL

    rect rgba(56, 142, 60, 0.25)
        Note over User,DB: PATH 1 — Cache Hit (fast ~2ms)
        User->>API: GET /abc123
        API->>Cache: GET url:abc123
        Cache-->>API: https://example.com/page
        API-->>User: 301 Redirect
    end

    rect rgba(230, 81, 0, 0.25)
        Note over User,DB: PATH 2 — Cache Miss (slower ~55ms)
        User->>API: GET /def456
        API->>Cache: GET url:def456
        Cache-->>API: null (miss)
        API->>DB: SELECT long_url WHERE code=def456
        DB-->>API: https://example.com/other
        API->>Cache: SET url:def456 (cache for next time)
        API-->>User: 301 Redirect
    end

    rect rgba(30, 136, 229, 0.25)
        Note over User,DB: PATH 3 — Create Short URL (~55ms)
        User->>API: POST /shorten with long URL
        API->>API: Generate 7-char code
        API->>DB: INSERT (code, long_url)
        API->>Cache: SET url:code
        API-->>User: shortUrl: https://s.io/xyz789
    end
```

**Architecture:**

```
Client → Load Balancer → API Servers (cluster: 8 workers)
                              ↓
                    Redis (cache shorts)
                              ↓
                    PostgreSQL + replica (URL store)
                              ↓
                    Elasticsearch (analytics)

Key-value store for codes: short_code → long_url
```

**Code:**

```js
const express = require("express");
const redis = require("redis");
const pg = require("pg");

const app = express();
const redisClient = redis.createClient();
const dbPool = new pg.Pool();

// Shorten URL
app.post("/api/shorten", async (req, res) => {
    const { longUrl } = req.body;
    const shortCode = generateShortCode(); // Random 7-char code

    try {
        // Store in DB
        await dbPool.query(
            "INSERT INTO urls (short_code, long_url, created_at) VALUES ($1, $2, NOW())",
            [shortCode, longUrl],
        );

        // Cache in Redis
        await redisClient.setEx(`url:${shortCode}`, 24 * 3600, longUrl);

        res.json({ shortUrl: `https://short.io/${shortCode}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Redirect (hot path)
app.get("/:code", async (req, res) => {
    const { code } = req.params;

    // Try cache first (fast path: ~1ms)
    let longUrl = await redisClient.get(`url:${code}`);

    if (!longUrl) {
        // Cache miss, hit DB (slow path: ~50ms)
        const result = await dbPool.query(
            "SELECT long_url FROM urls WHERE short_code = $1",
            [code],
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "URL not found" });
        }

        longUrl = result.rows[0].long_url;
        // Re-cache
        await redisClient.setEx(`url:${code}`, 24 * 3600, longUrl);
    }

    // Track click (async, non-blocking)
    trackClick(code, req); // Fire-and-forget

    res.redirect(longUrl);
});

function trackClick(code, req) {
    // Async tracking to external queue/analytics
    redisClient.lpush(
        `analytics:${code}`,
        JSON.stringify({
            timestamp: Date.now(),
            referrer: req.headers.referer,
            userAgent: req.headers["user-agent"],
        }),
    );
}
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Design a URL shortener"_ → Generate short code (base62 hash/counter) → store mapping in Redis (fast reads) + DB (persistence) → 301 redirect on lookup. Track analytics async (queue).
> - _"Design a rate limiter"_ → Sliding window counter in Redis: `INCR key` + `EXPIRE key 60`. If count > limit, return 429. Use per-IP and per-user keys.
> - _"Design a real-time chat"_ → WebSocket per client → Redis pub/sub to relay across servers → messages stored in DB → presence tracked in Redis sets.
> - _"How to handle a 5GB file upload?"_ → Stream directly to cloud storage (S3) using multipart upload. Never buffer in memory. Use streams + `pipeline()` for error handling.

> **📝 Quick Revision — Interview Scenarios:**
> | Scenario | Key Architecture |
> |---|---|
> | URL Shortener | Redis + DB, base62 encoding, 301 redirect, async analytics |
> | Rate Limiter | Redis sliding window, INCR + EXPIRE, per-IP/per-user |
> | Real-time Chat | WebSocket + Redis pub/sub + DB persistence |
> | File Upload (5GB) | Stream to S3 multipart, never buffer in memory |
> | Task Queue | BullMQ/Kafka, retry + DLQ, idempotent processing |

[↑ Back to Index](#table-of-contents)

---

## Phase 6 — Networking & Real-time

### 6.1 HTTP/2, TLS & Transport Security

### Concepts

HTTP/1.1 has a fundamental problem: **head-of-line blocking**. The browser opens one TCP connection and must wait for each request/response pair to complete before sending the next. Browsers work around this by opening 6 connections per domain, but that's wasteful. **HTTP/2** fixes this with **multiplexing** — many requests and responses flow over a single TCP connection, interleaved as frames.

**TLS (Transport Layer Security)** encrypts the connection. In Node.js, the `https` module wraps `http` with TLS. You need a **certificate** (from Let's Encrypt or generated for dev) and a **private key**. In production, TLS termination is often handled by a reverse proxy (nginx, CloudFlare, AWS ALB) in front of Node.

**CORS (Cross-Origin Resource Sharing)** controls which domains can call your API from a browser. Without proper CORS headers, browsers block cross-origin XHR/fetch requests. The `cors` npm package or manual headers solve this.

**Helmet** is an npm middleware that sets security-related HTTP headers (CSP, X-Frame-Options, HSTS, etc.) to protect against common web vulnerabilities.

```mermaid
graph LR
    subgraph HTTP1 ["HTTP/1.1"]
        A1["Request 1"] --> B1["Response 1"]
        B1 --> A2["Request 2"]
        A2 --> B2["Response 2"]
    end
    subgraph HTTP2 ["HTTP/2 Multiplexing"]
        C1["Req 1 ↓"] --- C2["Req 2 ↓"]
        C2 --- C3["Res 1 ↑"]
        C3 --- C4["Res 2 ↑"]
    end
    style HTTP1 fill:#ffcdd2
    style HTTP2 fill:#c8e6c9
```

### Key APIs & Patterns

```js
// --- HTTP/2 Server ---
const http2 = require("http2");
const fs = require("fs");

const server = http2.createSecureServer({
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.crt"),
});

server.on("stream", (stream, headers) => {
    const path = headers[":path"];
    stream.respond({ ":status": 200, "content-type": "text/html" });
    stream.end("<h1>Hello HTTP/2</h1>");
});

server.listen(8443);
```

```js
// --- HTTPS (TLS) Server ---
const https = require("https");
const fs = require("fs");

const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.crt"),
    // Enforce TLS 1.2+ (reject old protocols)
    minVersion: "TLSv1.2",
};

https
    .createServer(options, (req, res) => {
        res.writeHead(200);
        res.end("Secure!");
    })
    .listen(443);
```

```js
// --- Helmet + CORS (Express) ---
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const app = express();

app.use(helmet()); // Sets 15+ security headers
app.use(cors({ origin: "https://myapp.com" })); // Whitelist origin

// HSTS: force HTTPS for 1 year
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
```

### Senior-Level Q&A

**Q1: HTTP/2 vs HTTP/1.1 — when does HTTP/2 actually help Node.js?**

A: HTTP/2 helps when the client makes many small requests (API calls, asset loading). **Multiplexing** avoids head-of-line blocking at the HTTP level. However, if you're behind a reverse proxy that handles HTTP/2 → HTTP/1.1 translation, your Node server may still use HTTP/1.1 internally.

**Q2: How do you implement HSTS and why is it important?**

A: **HSTS** tells browsers to only use HTTPS for your domain. Without it, an attacker can intercept the first HTTP request and downgrade the connection.

```js
// Set Strict-Transport-Security header
res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
);
```

**Q3: CORS preflight — what triggers it and how do you handle it?**

A: Browsers send an `OPTIONS` preflight request when using non-simple headers, PUT/DELETE methods, or custom content types. Your server must respond with allowed origins, methods, and headers.

```js
app.options("*", cors()); // Handle all preflight requests
// Or manually:
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://myapp.com");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"HTTP/1.1 vs HTTP/2?"_ → HTTP/1.1 = one request per TCP connection (or pipelining, rarely used). HTTP/2 = multiplexed streams over one connection — multiple requests in parallel, header compression (HPACK), server push.
> - _"What is HSTS?"_ → HTTP Strict Transport Security — tells browsers to ONLY use HTTPS. Set via `Strict-Transport-Security` header. Prevents downgrade attacks.
> - _"What is CORS?"_ → Cross-Origin Resource Sharing. Browser blocks cross-domain requests unless the server sends `Access-Control-Allow-Origin` header. Preflight (OPTIONS) checks for non-simple requests.
> - _"What does helmet.js do?"_ → Sets ~15 security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) in one middleware call.

> **📝 Quick Revision — HTTP/2 & Transport Security:**
> | Concept | Key Point |
> |---|---|
> | HTTP/2 Multiplexing | Multiple requests over one TCP connection |
> | HSTS | Forces HTTPS; prevents downgrade attacks |
> | CORS | Server-side headers allowing cross-origin requests |
> | Preflight (OPTIONS) | Browser check before non-simple cross-origin requests |
> | helmet.js | One middleware for ~15 security headers |
> | TLS/SSL | Encrypt in transit; use Let's Encrypt for free certs |

[↑ Back to Index](#table-of-contents)

---

### 6.2 WebSockets & Real-time Communication

### Concepts

HTTP is **request-response** — the client asks, the server answers, and the connection is idle until the next request. **WebSockets** upgrade the HTTP connection to a persistent, **full-duplex** channel where both sides can send messages at any time. This is essential for real-time applications: chat, live dashboards, multiplayer games, collaborative editing.

**How WebSocket works:** The client sends an HTTP request with `Upgrade: websocket`. If the server agrees, the connection switches from HTTP to the WebSocket protocol (ws:// or wss://). From that point, either side can send frames (messages) without the overhead of HTTP headers on each message.

**ws vs socket.io:** `ws` is the minimal, standards-compliant WebSocket library. `socket.io` adds auto-reconnection, rooms, namespaces, fallbacks (long-polling), and broadcasting — but at the cost of a custom protocol that only works with socket.io clients.

**Scaling WebSockets:** A single Node process can handle ~10K–50K concurrent WebSocket connections (depending on message rate). Beyond that, use multiple processes with a **pub/sub backend** (Redis) to broadcast messages across instances.

```mermaid
sequenceDiagram
    participant Client
    participant Server as Node.js Server
    Client->>Server: HTTP GET /ws (Upgrade: websocket)
    Server-->>Client: 101 Switching Protocols
    Note over Client,Server: Full-duplex WebSocket channel open
    Client->>Server: Send message (frame)
    Server->>Client: Push notification (frame)
    Server->>Client: Push update (frame)
    Client->>Server: Send message (frame)
    Note over Client,Server: Connection stays open until close
    Client->>Server: Close frame
    Server-->>Client: Close ACK
```

### Key APIs & Patterns

```js
// --- ws (minimal WebSocket) ---
const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws, req) => {
    console.log("Client connected from", req.socket.remoteAddress);

    ws.on("message", (data) => {
        const msg = data.toString();
        console.log("Received:", msg);
        // Echo back
        ws.send(`Echo: ${msg}`);
    });

    ws.on("close", () => console.log("Client disconnected"));

    // Heartbeat to detect dead connections
    ws.isAlive = true;
    ws.on("pong", () => {
        ws.isAlive = true;
    });
});

// Heartbeat interval — terminate dead connections
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on("close", () => clearInterval(interval));
```

```js
// --- Broadcasting to all clients ---
function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            // OPEN
            client.send(msg);
        }
    });
}
```

```js
// --- Scaling with Redis pub/sub ---
const Redis = require("ioredis");
const pub = new Redis();
const sub = new Redis();

sub.subscribe("chat");
sub.on("message", (channel, message) => {
    broadcast(JSON.parse(message)); // Forward to all local WS clients
});

wss.on("connection", (ws) => {
    ws.on("message", (data) => {
        pub.publish("chat", data.toString()); // Publish to all instances
    });
});
```

### Senior-Level Q&A

**Q1: How do you handle backpressure on WebSocket connections?**

A: If the client is slow to consume messages, the send buffer fills up. Check `ws.bufferedAmount` before sending or use `ws.send(msg, err => {...})` callback.

```js
function safeSend(ws, data) {
    if (ws.bufferedAmount < 1024 * 1024) {
        // < 1MB buffered
        ws.send(data);
    } else {
        console.warn("Client too slow, dropping message");
    }
}
```

**Q2: ws vs socket.io — when to choose each?**

| Feature            | ws                                     | socket.io                       |
| ------------------ | -------------------------------------- | ------------------------------- |
| Protocol           | Standard WebSocket                     | Custom (WS + fallbacks)         |
| Auto-reconnect     | Manual                                 | Built-in                        |
| Rooms/namespaces   | Manual                                 | Built-in                        |
| Fallback (polling) | No                                     | Yes                             |
| Binary support     | Yes                                    | Yes                             |
| Bundle size        | ~3KB                                   | ~40KB                           |
| **Use when**       | Performance critical, standard clients | Rapid dev, need rooms, fallback |

**Q3: Design a chat system for 100K concurrent users across 10 servers.**

A: Each server handles ~10K WS connections. Use Redis pub/sub to relay messages across servers; each server subscribes to chat channels and broadcasts to its local clients. Presence is tracked in Redis sets (SADD/SREM on connect/disconnect).

```mermaid
flowchart LR
    C1[Clients 1-10K] --> S1[Server 1]
    C2[Clients 10K-20K] --> S2[Server 2]
    S1 <-->|pub/sub| R[(Redis)]
    S2 <-->|pub/sub| R
    S3[Server N] <-->|pub/sub| R
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"WebSocket vs HTTP?"_ → HTTP = request/response (client initiates). WebSocket = persistent full-duplex connection — server can push data anytime. Uses single TCP connection after HTTP upgrade handshake.
> - _"How do you detect dead WebSocket connections?"_ → Ping/pong heartbeat. Send ping every 30s; if no pong, terminate. Prevents ghost connections holding memory.
> - _"ws vs socket.io?"_ → `ws` = raw WebSocket (~3KB), fast, standard protocol. `socket.io` = framework (~40KB) with auto-reconnect, rooms, namespaces, and HTTP fallback.
> - _"How to scale WebSockets across servers?"_ → Redis pub/sub — each server subscribes to channels and relays messages to its local clients.

> **📝 Quick Revision — WebSockets:**
> | Concept | Key Point |
> |---|---|
> | Protocol | Full-duplex over single TCP; starts as HTTP upgrade |
> | Heartbeat | Ping/pong every 30s; terminate dead connections |
> | Backpressure | Check `ws.bufferedAmount` before sending |
> | Scaling | Redis pub/sub to relay across multiple servers |
> | `ws` library | Lightweight, standard WebSocket, manual reconnect |
> | `socket.io` | Auto-reconnect, rooms, fallback to polling |

[↑ Back to Index](#table-of-contents)

---

### 6.3 Message Queues & Background Jobs

### Concepts

Not all work should be done inside the HTTP request cycle. Sending emails, generating PDFs, resizing images, processing payments — these are **background jobs** that should be queued and processed asynchronously. The user gets an immediate response ("Your export is being prepared") while the heavy work happens in the background.

**Message queue pattern:** A **producer** pushes a message onto a queue/topic. A **consumer** (worker) picks it up and processes it. If the worker crashes, the message is **re-queued** (at-least-once delivery). This decouples your web server from slow operations and lets you scale workers independently.

```mermaid
flowchart LR
    API[API Server] -->|"produce"| Q[(Queue / Topic<br/>Redis · RabbitMQ · Kafka)]
    Q -->|"consume"| W1[Worker 1]
    Q -->|"consume"| W2[Worker 2]
    W1 -->|"on failure"| DLQ[Dead Letter Queue]
    W2 -->|"on success"| DB[(Database)]
    style Q fill:#ff9800,color:#fff
    style DLQ fill:#f44336,color:#fff
```

---

### Quick Notes: RabbitMQ & BullMQ

> **These are two popular alternatives to Kafka. Below is a quick overview so you can compare them in interviews.**

#### RabbitMQ (AMQP Protocol) — In a Nutshell

RabbitMQ is a **traditional message broker** written in Erlang. Think of it as a smart post office:

- **Exchange** receives messages and routes them to **queues** based on rules (direct, fanout, topic).
- **Queues** hold messages until a consumer picks them up.
- **Consumers** pull (or push via prefetch) messages from queues.
- Supports **acknowledgement** — the message stays in the queue until the consumer confirms processing.
- Best for **complex routing** — e.g., "send order events to billing AND shipping queues."

```
Producer → Exchange → [Routing Rules] → Queue → Consumer
                                       → Queue → Consumer
```

**Key difference from Kafka:** Messages are **deleted** after consumption. No replay. Good for task distribution, not for event sourcing.

| Term        | What it is                                              |
| ----------- | ------------------------------------------------------- |
| Exchange    | Router that receives messages and distributes to queues |
| Queue       | Buffer that holds messages for consumers                |
| Binding     | Rule connecting an exchange to a queue (routing key)    |
| Ack/Nack    | Consumer confirms (ack) or rejects (nack) a message     |
| Prefetch    | Limits how many unacked messages a consumer can hold    |
| Dead Letter | Queue for messages that failed all retries              |

**Node.js library:** `amqplib` (`npm install amqplib`).

#### BullMQ (Redis-backed) — In a Nutshell

BullMQ is a **job/task queue** for Node.js, backed by Redis. Think of it as a to-do list for your server:

- **Queue** stores jobs (JSON payloads) in Redis.
- **Worker** picks up jobs and processes them.
- Built-in: **retry with backoff**, delayed jobs, repeatable/cron jobs, rate limiting, priorities, progress tracking.
- Has a dashboard UI (Bull Board) to monitor job status.

```js
// BullMQ — Quick example
const { Queue, Worker } = require("bullmq");
const connection = { host: "127.0.0.1", port: 6379 };

// Producer: add a job
const emailQueue = new Queue("emails", { connection });
await emailQueue.add(
    "welcome",
    { userId: 42 },
    {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
    },
);

// Consumer: process jobs
const worker = new Worker(
    "emails",
    async (job) => {
        await sendEmail(job.data.userId);
    },
    { connection, concurrency: 5 },
);

worker.on("failed", (job, err) => console.error(`Failed: ${err.message}`));
worker.on("completed", (job) => console.log(`Done: ${job.id}`));
```

**When to use BullMQ:** Simple job queues (emails, image resize, PDF generation) where you already have Redis. Not suited for high-throughput event streaming.

| Feature        | BullMQ             | RabbitMQ           | Kafka                       |
| -------------- | ------------------ | ------------------ | --------------------------- |
| Backend        | Redis              | Erlang VM          | JVM cluster                 |
| Throughput     | ~10K/s             | ~50K/s             | **~1M/s**                   |
| Best for       | Task queues        | Complex routing    | Event streaming             |
| Node.js lib    | bullmq             | amqplib            | **kafkajs**                 |
| Delayed jobs   | Built-in           | Plugin             | Manual                      |
| Message replay | ❌ No              | ❌ No              | ✅ Yes (log-based)          |
| Ordering       | Per-queue          | Per-queue          | **Per-partition**           |
| Exactly-once   | No (at-least-once) | No (at-least-once) | **Yes (with transactions)** |

---

### Deep Dive: Apache Kafka with KafkaJS

This is the section to study deeply. Kafka is the industry standard for **high-throughput event streaming** — used at LinkedIn, Uber, Netflix, and almost every large-scale system.

### Kafka Core Architecture

**Three key components:**

1. **Broker** — A Kafka server that stores messages. A Kafka cluster has multiple brokers for fault tolerance. Each broker stores a subset of the data.
2. **Producer** — Your application code that **sends** messages to a Kafka topic. The producer decides which partition to send to (round-robin, key-based, or custom).
3. **Consumer** — Your application code that **reads** messages from a Kafka topic. Consumers belong to a **consumer group** — Kafka distributes partitions across consumers in the same group.

**Topics & Partitions:**

- A **topic** is a named channel (like `"orders"`, `"user-events"`).
- Each topic is split into **partitions** (like shards). Partitions enable parallelism.
- Each partition is an **ordered, immutable log** — messages are appended and never deleted (until retention expires).
- Messages within a partition are ordered. Messages across partitions are NOT guaranteed to be ordered.

**Consumer Groups:**

- Consumers with the same `groupId` share the work — each partition is assigned to exactly one consumer in the group.
- If you have 6 partitions and 3 consumers → each consumer reads 2 partitions.
- If a consumer dies, Kafka **rebalances** partitions across surviving consumers.
- Two different consumer groups can read the same topic independently (each gets all messages).

**Offsets:**

- Each message in a partition has a sequential **offset** (0, 1, 2, 3...).
- Consumers track their offset — "I've processed up to offset 42."
- On restart, the consumer resumes from its last committed offset.
- **Auto-commit** (default): Offsets are committed periodically. Risk: crash between process and commit = **reprocessing**.
- **Manual commit**: You commit after successful processing. Safer but more code.

```mermaid
graph TB
    subgraph Cluster["Kafka Cluster (3 Brokers)"]
        direction TB
        B1["Broker 1<br/>Leader: P0, P1"]
        B2["Broker 2<br/>Leader: P2, P3"]
        B3["Broker 3<br/>Replicas"]
    end

    subgraph Topic["Topic: 'orders' (4 Partitions)"]
        P0["Partition 0<br/>offset: 0,1,2,3..."]
        P1["Partition 1<br/>offset: 0,1,2,3..."]
        P2["Partition 2<br/>offset: 0,1,2,3..."]
        P3["Partition 3<br/>offset: 0,1,2,3..."]
    end

    subgraph CG["Consumer Group: 'order-service'"]
        C1["Consumer 1<br/>reads P0, P1"]
        C2["Consumer 2<br/>reads P2, P3"]
    end

    Producer1["Producer<br/>(API Server)"] -->|"send()"| Topic
    P0 --> C1
    P1 --> C1
    P2 --> C2
    P3 --> C2

    style Cluster fill:#42a5f5,color:#fff
    style CG fill:#66bb6a,color:#fff
    style Producer1 fill:#ff9800,color:#fff
```

### KafkaJS Setup — Producer & Consumer

```js
const { Kafka, Partitioners, logLevel } = require("kafkajs");

// 1. CREATE KAFKA CLIENT
const kafka = new Kafka({
    clientId: "my-app",
    brokers: ["broker1:9092", "broker2:9092", "broker3:9092"],
    // Retry settings for broker connection
    retry: {
        initialRetryTime: 300, // ms
        retries: 10,
    },
    logLevel: logLevel.WARN,
});

// 2. PRODUCER — Sending Messages
const producer = kafka.producer({
    // Use DefaultPartitioner (key-based) or RoundRobin
    createPartitioner: Partitioners.DefaultPartitioner,
    // Idempotent producer prevents duplicate messages on retry
    idempotent: true,
    // Transaction support for exactly-once semantics
    transactionalId: "my-transactional-id", // optional
});

async function startProducer() {
    await producer.connect();

    // Send a single message
    await producer.send({
        topic: "orders",
        messages: [
            {
                key: "user-123", // Partition key — same key → same partition → ordering
                value: JSON.stringify({ orderId: "ORD-001", amount: 99.99 }),
                headers: { source: "api-server" },
            },
        ],
    });

    // Send a batch of messages (higher throughput)
    await producer.sendBatch({
        topicMessages: [
            {
                topic: "orders",
                messages: [
                    {
                        key: "user-123",
                        value: JSON.stringify({
                            orderId: "ORD-002",
                            amount: 50,
                        }),
                    },
                    {
                        key: "user-456",
                        value: JSON.stringify({
                            orderId: "ORD-003",
                            amount: 75,
                        }),
                    },
                ],
            },
            {
                topic: "notifications",
                messages: [
                    {
                        value: JSON.stringify({
                            type: "order_created",
                            orderId: "ORD-002",
                        }),
                    },
                ],
            },
        ],
    });
}

// 3. CONSUMER — Reading Messages
const consumer = kafka.consumer({
    groupId: "order-service", // Consumer group
    // Session timeout: if consumer doesn't heartbeat within this, rebalance triggers
    sessionTimeout: 30000, // 30s (default)
    // Heartbeat interval: how often consumer sends heartbeat to broker
    heartbeatInterval: 3000, // 3s (default)
    // Max time between poll() calls before consumer is considered dead
    maxWaitTimeInMs: 5000,
});
```

### Consumer: `eachMessage` vs `eachBatch`

This is a critical performance choice. `eachMessage` is simpler; `eachBatch` gives you much higher throughput.

```js
// ─── OPTION A: eachMessage (Simple, Lower Throughput) ───
// Kafka calls your handler once PER message
// Good for: low-volume topics, simple processing

async function runConsumerSimple() {
    await consumer.connect();
    await consumer.subscribe({ topic: "orders", fromBeginning: false });

    await consumer.run({
        // Called once per message
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
            const order = JSON.parse(message.value.toString());
            console.log(
                `Processing order ${order.orderId} from partition ${partition}`,
            );

            await processOrder(order);

            // Call heartbeat() for long-running processing to prevent rebalance
            await heartbeat();
        },
    });
}

// ─── OPTION B: eachBatch (High Throughput, More Control) ───
// Kafka gives you a BATCH of messages at once
// Good for: high-volume topics, bulk DB inserts, analytics

async function runConsumerBatch() {
    await consumer.connect();
    await consumer.subscribe({ topic: "orders", fromBeginning: false });

    await consumer.run({
        eachBatchAutoResolve: false, // WE control offset commits

        eachBatch: async ({
            batch,
            resolveOffset,
            heartbeat,
            commitOffsetsIfNecessary,
            isRunning,
            isStale,
        }) => {
            const { topic, partition, messages } = batch;

            console.log(
                `Batch: ${messages.length} messages from ${topic}[${partition}]`,
            );

            for (const message of messages) {
                // Check if consumer is still running (graceful shutdown)
                if (!isRunning() || isStale()) break;

                const order = JSON.parse(message.value.toString());
                await processOrder(order);

                // Mark this offset as processed
                resolveOffset(message.offset);

                // Send heartbeat every few messages to prevent session timeout
                await heartbeat();
            }

            // Commit offsets for the batch
            await commitOffsetsIfNecessary();
        },
    });
}
```

### eachBatch — Why It's Faster

```mermaid
sequenceDiagram
    participant Broker as Kafka Broker
    participant C as Consumer

    Note over Broker,C: eachMessage (N network calls)
    Broker->>C: message 1
    C->>C: process
    C->>Broker: commit offset 1
    Broker->>C: message 2
    C->>C: process
    C->>Broker: commit offset 2
    Note over Broker,C: (one by one — slow)

    Note over Broker,C: eachBatch (1 network call for N messages)
    Broker->>C: batch [msg 1, msg 2, ..., msg 100]
    C->>C: process all
    C->>Broker: commit offset 100
    Note over Broker,C: (bulk — fast, fewer round trips)
```

### KafkaJS Configuration Tuning — Increasing Throughput

```js
// ─── PRODUCER TUNING ───
const producer = kafka.producer({
    idempotent: true,
    // Allow more in-flight requests (parallelism)
    maxInFlightRequests: 5, // default: null (unlimited in non-idempotent mode)
    // Batch messages before sending (latency vs throughput tradeoff)
    allowAutoTopicCreation: false, // Don't auto-create topics in production
});

// send() options for throughput
await producer.send({
    topic: "events",
    // Compression reduces network I/O (CPU trade-off)
    compression: 2, // 0=None, 1=Gzip, 2=Snappy, 3=LZ4, 4=ZSTD
    // acks: 0=fire-and-forget, 1=leader-only, -1=all replicas (safest)
    acks: -1, // Wait for ALL replicas (safest, slowest)
    // acks: 1 → leader only (faster, small risk of data loss)
    // acks: 0 → fire and forget (fastest, messages can be lost)
    timeout: 30000,
    messages: [{ key: "k1", value: "v1" }],
});

// ─── CONSUMER TUNING ───
const consumer = kafka.consumer({
    groupId: "my-group",
    // How many bytes to fetch per request (larger = fewer requests = higher throughput)
    maxBytes: 10485760, // 10MB per fetch (default: 1MB)
    minBytes: 1, // Fetch immediately when any data available
    maxWaitTimeInMs: 5000, // Max wait for minBytes (long poll)
    // Read N messages from partition before moving to next
    maxBytesPerPartition: 1048576, // 1MB per partition per fetch

    // Session & rebalance
    sessionTimeout: 30000, // 30s — increase for slow consumers
    heartbeatInterval: 3000, // Must be < sessionTimeout / 3
    rebalanceTimeout: 60000, // Time allowed for rebalance

    // Retry
    retry: {
        retries: 5,
        initialRetryTime: 300,
    },
});

// ─── Subscribe to multiple topics ───
await consumer.subscribe({
    topics: ["orders", "payments"],
    fromBeginning: false,
});
```

### Throughput Optimization Checklist

| Lever           | Setting                             | Effect                                      |
| --------------- | ----------------------------------- | ------------------------------------------- |
| **Compression** | `compression: 2` (Snappy)           | 50-80% less network I/O, slight CPU cost    |
| **Batch size**  | `maxBytes: 10MB`                    | Fewer fetch requests, higher throughput     |
| **acks**        | `acks: 1` (leader only)             | 2-3x faster writes, tiny durability risk    |
| **Partitions**  | Increase partition count            | More parallelism (1 consumer per partition) |
| **eachBatch**   | Use instead of eachMessage          | Bulk processing, fewer offset commits       |
| **Concurrency** | `partitionsConsumedConcurrently: 3` | Process multiple partitions in parallel     |
| **Idempotent**  | `idempotent: true`                  | Prevents duplicates on producer retry       |

```js
// Consume multiple partitions concurrently
await consumer.run({
    partitionsConsumedConcurrently: 3, // Process 3 partitions at the same time
    eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);
    },
});
```

### Consumer Offset Management

```js
// ─── AUTO COMMIT (Default) ───
// Offsets committed every 5 seconds automatically
// Risk: crash between process + commit = reprocessing
const consumer = kafka.consumer({
    groupId: "my-group",
    // Auto-commit settings (default: enabled)
    autoCommit: true,
    autoCommitInterval: 5000, // Commit every 5s
    autoCommitThreshold: 100, // Or every 100 messages
});

// ─── MANUAL COMMIT (Safer) ───
// You decide when to commit — after successful processing
const consumer2 = kafka.consumer({
    groupId: "my-group",
    autoCommit: false, // Disable auto-commit
});

await consumer2.run({
    eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);

        // Commit AFTER successful processing
        await consumer2.commitOffsets([
            {
                topic,
                partition,
                offset: (Number(message.offset) + 1).toString(), // +1 = next offset to read
            },
        ]);
    },
});

// ─── SEEK: Reset consumer to specific offset ───
// Useful for replaying events or skipping bad messages
consumer.seek({ topic: "orders", partition: 0, offset: "0" }); // Replay from beginning
consumer.seek({ topic: "orders", partition: 0, offset: "1000" }); // Skip to offset 1000
```

### Dead Letter Queue Pattern with KafkaJS

```js
const dlqProducer = kafka.producer();
await dlqProducer.connect();

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        try {
            await processMessage(message);
        } catch (err) {
            // Send failed message to DLQ topic for manual inspection
            await dlqProducer.send({
                topic: `${topic}.dlq`,
                messages: [
                    {
                        key: message.key,
                        value: message.value,
                        headers: {
                            ...message.headers,
                            "x-original-topic": topic,
                            "x-original-partition": String(partition),
                            "x-original-offset": message.offset,
                            "x-error": err.message,
                            "x-failed-at": new Date().toISOString(),
                        },
                    },
                ],
            });
            console.error(`Message sent to DLQ: ${err.message}`);
        }
    },
});
```

### Kafka Partition Key Strategy

Choosing the right partition key determines **ordering and load distribution**:

```js
// SCENARIO 1: Order events — key by userId
// All events for the same user go to the same partition → guaranteed order per user
await producer.send({
    topic: "orders",
    messages: [
        { key: "user-123", value: JSON.stringify({ event: "order_created" }) },
        {
            key: "user-123",
            value: JSON.stringify({ event: "payment_received" }),
        },
        // Both go to same partition → processed in order
    ],
});

// SCENARIO 2: Analytics events — no key (round-robin)
// Events spread evenly across partitions → max throughput, no ordering
await producer.send({
    topic: "page-views",
    messages: [
        { value: JSON.stringify({ page: "/home", ts: Date.now() }) },
        // No key → round-robin across partitions
    ],
});

// SCENARIO 3: Hot partition problem — bad key choice
// ❌ BAD: key = "country" → 90% of traffic goes to partition for "US"
// ✅ FIX: Use more granular key (userId, sessionId) for even distribution
```

```mermaid
graph LR
    subgraph Keys["Partition Key Strategy"]
        direction TB
        K1["key: 'user-123'<br/>→ hash('user-123') % 4<br/>→ Partition 2"]
        K2["key: 'user-456'<br/>→ hash('user-456') % 4<br/>→ Partition 0"]
        K3["key: null<br/>→ Round Robin<br/>→ P0, P1, P2, P3..."]
    end

    subgraph Partitions["Topic: 'orders' (4 partitions)"]
        P0["P0: user-456 events"]
        P1["P1: ..."]
        P2["P2: user-123 events"]
        P3["P3: ..."]
    end

    K2 --> P0
    K1 --> P2
    K3 --> P0
    K3 --> P1
    K3 --> P2
    K3 --> P3

    style Keys fill:#42a5f5,color:#fff
    style Partitions fill:#66bb6a,color:#fff
```

### Graceful Shutdown

```js
// Always disconnect producers & consumers on shutdown
const shutdown = async () => {
    console.log("Shutting down Kafka...");
    await consumer.disconnect(); // Commits final offsets, leaves consumer group
    await producer.disconnect();
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

### Senior-Level Q&A

**Q1: How do you identify a slow consumer?**

A: Monitor **consumer lag** — the difference between the latest offset in the partition and the consumer's committed offset.

```
Consumer Lag = Latest Offset (log-end-offset) − Consumer Committed Offset
```

- **Lag = 0** → Consumer is caught up (healthy).
- **Lag growing over time** → Consumer is slower than the producer (problem!).
- **Lag spikes then recovers** → Temporary slowdown (GC pauses, slow DB query).

**How to measure:**

```bash
# Kafka CLI (built-in)
kafka-consumer-groups.sh --bootstrap-server broker:9092 \
    --describe --group order-service

# Output:
# TOPIC     PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders    0          1000            1050            50    ← 50 messages behind
# orders    1          2000            2000            0     ← caught up
```

```js
// Programmatic lag monitoring with KafkaJS admin API
const admin = kafka.admin();
await admin.connect();

// Get consumer group offsets
const offsets = await admin.fetchOffsets({
    groupId: "order-service",
    topics: ["orders"],
});

// Get latest offsets (log-end)
const topicOffsets = await admin.fetchTopicOffsets("orders");

// Calculate lag per partition
topicOffsets.forEach((partitionInfo) => {
    const consumerOffset = offsets
        .find((o) => o.topic === "orders")
        ?.partitions.find((p) => p.partition === partitionInfo.partition);

    const lag =
        Number(partitionInfo.offset) - Number(consumerOffset?.offset || 0);
    console.log(`Partition ${partitionInfo.partition}: lag = ${lag}`);

    if (lag > 10000) {
        console.warn(`⚠️ HIGH LAG on partition ${partitionInfo.partition}!`);
    }
});

await admin.disconnect();
```

**Fixing a slow consumer:**

1. **Scale out** — add more consumers to the group (max = number of partitions)
2. **Use `eachBatch`** — bulk process instead of one-by-one
3. **Optimize processing** — batch DB inserts, cache lookups, reduce I/O
4. **Increase partitions** — more partitions = more parallelism
5. **Check for blocking code** — sync DB calls, missing `await`, tight loops

**Q2: What happens when a consumer crashes mid-batch?**

A: It depends on your commit strategy:

- **Auto-commit (default):** If the offset was auto-committed before the crash, the message is "lost" (skipped on restart). If not yet committed, the message is **reprocessed** on restart. Neither is exactly-once.
- **Manual commit:** If you commit AFTER processing, the unprocessed messages are reprocessed on restart (at-least-once). Make your processing **idempotent** to handle duplicates.

```js
// Idempotent processing: safe to reprocess
async function processOrder(order) {
    // Use INSERT ... ON CONFLICT DO NOTHING (PostgreSQL)
    await db.query(
        `INSERT INTO processed_orders (order_id, amount)
         VALUES ($1, $2)
         ON CONFLICT (order_id) DO NOTHING`,
        [order.orderId, order.amount],
    );
    // If reprocessed, the duplicate insert is silently ignored
}
```

**Q3: How do you guarantee message ordering?**

A: Kafka guarantees order **within a single partition only**. To ensure ordering for related events:

1. Use the same **partition key** for related messages (e.g., `userId` for all events of that user).
2. Set `maxInFlightRequests: 1` on the producer if you need strict ordering even during retries.
3. Use a single partition (but this kills parallelism — only for low-volume topics).

```js
// All events for user-123 go to the same partition → guaranteed order
await producer.send({
    topic: "user-events",
    messages: [
        { key: "user-123", value: JSON.stringify({ event: "signup" }) },
        { key: "user-123", value: JSON.stringify({ event: "email_verified" }) },
        { key: "user-123", value: JSON.stringify({ event: "first_purchase" }) },
    ],
});
// Consumer reading this partition sees: signup → email_verified → first_purchase (in order)
```

**Q4: Partition count — how to decide?**

A: Rule of thumb:

- **Partitions ≥ max consumers** in the group (each consumer gets at least 1 partition)
- **More partitions = more parallelism** but more overhead (memory, file handles, rebalance time)
- **Start with ~6-12 partitions** for most topics; scale when needed
- **Upper limit:** ~thousands per broker; each partition uses ~10MB memory on the broker
- **You can increase partitions but NEVER decrease** (would break key-based routing)

**Q5: What is a rebalance and how do you minimize it?**

A: A rebalance happens when Kafka reassigns partitions to consumers — triggered by a consumer joining, leaving, or crashing, or when partitions are added.

**During rebalance, ALL consumers in the group PAUSE** — no messages are processed. This can last seconds to minutes.

**Minimize rebalances:**

1. **Increase `sessionTimeout`** (e.g., 60s) — gives slow consumers more time before being considered dead
2. **Decrease `heartbeatInterval`** (e.g., 2s) — faster heartbeats = faster detection, fewer false positives
3. **Use `CooperativeStickyAssigner`** — only reassigns affected partitions instead of all
4. **Avoid short-lived consumers** — don't spin up/down consumers frequently
5. **Call `heartbeat()` in long processing loops** — prevents the broker from thinking the consumer is dead

```js
const consumer = kafka.consumer({
    groupId: "my-group",
    sessionTimeout: 60000, // 60s (generous)
    heartbeatInterval: 2000, // Every 2s
    maxWaitTimeInMs: 5000,
    // Use cooperative-sticky to minimize rebalance disruption
    rebalanceTimeout: 60000,
});
```

**Q6: How is Kafka different from a traditional message queue (RabbitMQ/BullMQ)?**

A:

| Aspect          | Kafka                                 | RabbitMQ / BullMQ                    |
| --------------- | ------------------------------------- | ------------------------------------ |
| Model           | **Distributed log** (append-only)     | Message queue (delete after consume) |
| Replay          | ✅ Yes — seek to any offset           | ❌ No — message gone after ack       |
| Ordering        | Per-partition guaranteed              | Per-queue (single consumer)          |
| Throughput      | **~1M messages/sec**                  | ~10-50K messages/sec                 |
| Consumer groups | ✅ Multiple groups read independently | Competing consumers share            |
| Retention       | Time/size-based (keep 7 days, 100GB)  | Until consumed                       |
| Use case        | Event streaming, analytics, CDC       | Task queues, job processing          |

**Q7: Your producer is slow. How do you increase write throughput?**

A:

1. **Compression** — `compression: 2` (Snappy) or `4` (ZSTD) reduces message size
2. **Batching** — Use `sendBatch()` to send many messages per API call
3. **acks: 1** — Wait for leader only (instead of all replicas)
4. **acks: 0** — Fire-and-forget (fastest, risk of loss — only for non-critical data like logs)
5. **Increase partitions** — More partitions = producer distributes across more brokers
6. **Idempotent producer** — `idempotent: true` allows safe retries without duplicates

**Q8: How do you ensure exactly-once processing end-to-end?**

A: Three pieces:

1. **Idempotent producer** (`idempotent: true`) — prevents duplicate messages on retry
2. **Transactional producer** (`transactionalId: 'xxx'`) — atomic writes across multiple topics
3. **Consumer: read-process-commit atomically** — manual offset commit AFTER processing + idempotent processing (upsert/dedup in DB)

```js
// Transactional producer: atomic write to multiple topics
const producer = kafka.producer({
    idempotent: true,
    transactionalId: "order-tx",
});
await producer.connect();

const transaction = await producer.transaction();
try {
    await transaction.send({
        topic: "orders",
        messages: [{ value: orderData }],
    });
    await transaction.send({
        topic: "notifications",
        messages: [{ value: notifData }],
    });
    // Commit both sends atomically — either both succeed or both fail
    await transaction.commit();
} catch (err) {
    await transaction.abort();
    throw err;
}
```

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What is consumer lag?"_ → The difference between the latest offset in the partition and the consumer's committed offset. Growing lag = slow consumer.
> - _"eachMessage vs eachBatch?"_ → `eachMessage` calls your handler per message (simple, slower). `eachBatch` gives you a batch (bulk processing, fewer commits, higher throughput).
> - _"How does Kafka guarantee ordering?"_ → Within a single partition only. Use the same partition key for related messages.
> - _"Kafka vs RabbitMQ?"_ → Kafka is a distributed log (replay, high throughput, event streaming). RabbitMQ is a message broker (routing, task queues, delete after consume).
> - _"What triggers a rebalance?"_ → Consumer join/leave/crash, partition count change. During rebalance, ALL consumers pause. Minimize with cooperative-sticky assigner and generous session timeout.

> **📝 Quick Revision — Kafka with KafkaJS:**
> | Concept | Key Point |
> |---|---|
> | Broker | Server that stores messages; cluster = multiple brokers |
> | Topic | Named channel; split into partitions |
> | Partition | Ordered log; unit of parallelism |
> | Consumer Group | Consumers sharing work; 1 partition → 1 consumer |
> | Offset | Sequential message ID in partition; consumer tracks progress |
> | `eachBatch` | Bulk consume; fewer commits; higher throughput |
> | Consumer Lag | `log-end-offset − committed-offset`; monitor to detect slow consumers |
> | Partition Key | Same key → same partition → ordered; null key → round-robin |
> | Rebalance | Partition reassignment; all consumers pause; minimize disruption |
> | Exactly-once | Idempotent producer + transactional writes + idempotent consumer |

[↑ Back to Index](#table-of-contents)

---

## Phase 7 — Testing, Performance & API Design

### 7.1 Testing & CI/CD

### Concepts

Testing in Node.js isn't optional — it's what separates production-ready code from prototypes. **Unit tests** verify individual functions in isolation. **Integration tests** verify that modules work together (e.g., API + database). **End-to-end (e2e) tests** simulate real user flows.

**Test runners:** Node.js 18+ includes a built-in test runner (`node:test`). Popular alternatives: **Jest** (batteries-included, mocking, coverage), **Vitest** (fast, ESM-native), **Mocha** (flexible, pairs with Chai/Sinon).

**Mocking:** Replace real dependencies (database, HTTP calls, file system) with controlled fakes so tests are fast, reliable, and isolated. Jest has built-in `jest.mock()`. For manual mocking, use **Sinon.js** stubs/spies.

**CI/CD:** Run tests automatically on every push/PR using GitHub Actions, GitLab CI, or Jenkins. A typical pipeline: install → lint → test → build → deploy.

```mermaid
flowchart LR
    subgraph Dev ["Developer"]
        Code[Write Code] --> Push[git push]
    end
    subgraph CI ["CI Pipeline"]
        Install[npm install] --> Lint[ESLint]
        Lint --> Test[Run Tests]
        Test --> Coverage[Coverage Report]
        Coverage --> Build[Build / Bundle]
    end
    subgraph CD ["CD Pipeline"]
        Build --> Stage[Deploy Staging]
        Stage --> E2E[E2E Tests]
        E2E --> Prod[Deploy Production]
    end
    Push --> Install
    style Test fill:#66bb6a,color:#fff
    style Prod fill:#1565c0,color:#fff
```

### Key Patterns

```js
// --- Node.js built-in test runner (node:test) ---
const { describe, it } = require("node:test");
const assert = require("node:assert");

describe("Math utils", () => {
    it("should add two numbers", () => {
        assert.strictEqual(1 + 2, 3);
    });

    it("should handle negative numbers", () => {
        assert.strictEqual(-1 + -2, -3);
    });
});
// Run: node --test math.test.js
```

```js
// --- Jest example with mocking ---
// userService.js
const db = require("./db");

async function getUser(id) {
    const user = await db.findById(id);
    if (!user) throw new Error("User not found");
    return user;
}
module.exports = { getUser };

// userService.test.js
jest.mock("./db");
const db = require("./db");
const { getUser } = require("./userService");

test("returns user when found", async () => {
    db.findById.mockResolvedValue({ id: 1, name: "Alice" });
    const user = await getUser(1);
    expect(user.name).toBe("Alice");
});

test("throws when user not found", async () => {
    db.findById.mockResolvedValue(null);
    await expect(getUser(999)).rejects.toThrow("User not found");
});
```

```js
// --- Integration test (supertest + Express) ---
const request = require("supertest");
const app = require("./app");

describe("GET /api/users", () => {
    it("returns 200 and array of users", async () => {
        const res = await request(app).get("/api/users");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns 404 for unknown user", async () => {
        const res = await request(app).get("/api/users/99999");
        expect(res.status).toBe(404);
    });
});
```

```yaml
# --- GitHub Actions CI ---
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with: { node-version: 20 }
            - run: npm ci
            - run: npm run lint
            - run: npm test -- --coverage
```

### Senior-Level Q&A

**Q1: Unit vs integration vs e2e — when to use each?**

A: Follow the **testing pyramid**: many unit tests (fast, cheap) → fewer integration tests → few e2e tests (slow, expensive). Unit tests catch logic bugs. Integration tests catch wiring bugs. E2e tests catch user-facing bugs.

**Q2: How do you mock `fs` or `http` in tests?**

A: Use `jest.mock('fs')` or inject dependencies. For HTTP, use **nock** or **msw** to intercept outgoing requests.

```js
const nock = require("nock");
nock("https://api.example.com")
    .get("/users/1")
    .reply(200, { id: 1, name: "Alice" });
// Now any HTTP call to that URL returns the mock
```

**Q3: What's a good code coverage target?**

A: Aim for **80%+ line coverage** as a baseline. 100% is impractical and gives false confidence. Focus on testing **critical paths** (auth, payments, data mutations) rather than chasing numbers.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Unit vs integration vs e2e tests?"_ → Unit = isolated function. Integration = modules together (API + DB). E2e = full user flow (browser/UI). Pyramid: many unit, some integration, few e2e.
> - _"How do you mock external APIs in tests?"_ → Use `nock` to intercept HTTP calls and return controlled responses. For functions, use `jest.mock()` or sinon stubs.
> - _"What's the testing pyramid?"_ → Many fast unit tests at the bottom, some integration tests in the middle, few slow e2e tests at the top. Invert it and your CI is slow and flaky.
> - _"How do you test async code?"_ → Return the promise from the test, or use `async/await`. Jest auto-waits if test function returns a promise.

> **📝 Quick Revision — Testing:**
> | Test Type | Scope | Speed | Tools |
> |---|---|---|---|
> | Unit | Single function | Fast (~ms) | Jest, Vitest, node:test |
> | Integration | Module + DB/API | Medium (~s) | Supertest, testcontainers |
> | E2E | Full user flow | Slow (~10s+) | Playwright, Cypress |
> | Mocking | Replace external deps | N/A | nock, jest.mock, sinon |

[↑ Back to Index](#table-of-contents)

---

### 7.2 Performance & Benchmarking

### Concepts

Performance in Node.js means keeping the event loop responsive and throughput high. The key metrics are: **requests/second**, **latency (p50/p95/p99)**, **event loop lag**, and **memory usage**.

**Tools:**

- **autocannon** — HTTP load testing tool for Node.js (like `ab` or `wrk`, but in JS)
- **clinic.js** — Suite of profiling tools: Clinic Doctor (event loop), Clinic Flame (flamegraph), Clinic Bubbleprof (async)
- **0x** — Flamegraph generator for CPU profiling
- **perf_hooks** — Built-in module for performance measurement

```mermaid
flowchart TB
    subgraph Metrics ["Key Performance Metrics"]
        RPS["Requests/sec<br/>(throughput)"]
        LAT["Latency p99<br/>(tail latency)"]
        EL["Event Loop Lag<br/>(responsiveness)"]
        MEM["Memory Usage<br/>(heap + RSS)"]
    end
    subgraph Tools ["Profiling Tools"]
        AC[autocannon]
        CL[clinic.js]
        FL[0x / flamegraph]
        PH[perf_hooks]
    end
    AC --> RPS
    AC --> LAT
    CL --> EL
    CL --> MEM
    FL --> EL
    PH --> LAT
    style RPS fill:#4caf50,color:#fff
    style LAT fill:#ff9800,color:#fff
```

### Key Patterns

```js
// --- Measure event loop lag ---
const { monitorEventLoopDelay } = require("perf_hooks");
const h = monitorEventLoopDelay({ resolution: 10 });
h.enable();

setInterval(() => {
    console.log(
        `Event loop lag — p50: ${(h.percentile(50) / 1e6).toFixed(2)}ms, p99: ${(h.percentile(99) / 1e6).toFixed(2)}ms`,
    );
    h.reset();
}, 5000);
```

```js
// --- Custom performance marks ---
const { performance, PerformanceObserver } = require("perf_hooks");

const obs = new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => {
        console.log(`${e.name}: ${e.duration.toFixed(2)}ms`);
    });
});
obs.observe({ entryTypes: ["measure"] });

performance.mark("db-start");
await db.query("SELECT * FROM users");
performance.mark("db-end");
performance.measure("DB Query", "db-start", "db-end");
```

```bash
# --- Load test with autocannon ---
npx autocannon -c 100 -d 10 http://localhost:3000/api/users
# -c 100 = 100 concurrent connections
# -d 10  = 10 seconds duration
# Output: req/sec, latency percentiles, throughput
```

```bash
# --- Flamegraph with clinic ---
npx clinic flame -- node server.js
# Opens flamegraph in browser after load test
```

### Senior-Level Q&A

**Q1: Your API's p99 latency jumped from 50ms to 500ms. How do you diagnose?**

A:

1. Check event loop lag (perf_hooks) — if high, something is blocking
2. Run clinic doctor to find the bottleneck
3. Check if thread pool is saturated (`UV_THREADPOOL_SIZE`)
4. Profile with flamegraph to find hot functions
5. Check external dependencies (DB, Redis latency)

**Q2: How do you benchmark properly? Common mistakes?**

A: Use `autocannon` or `wrk` with realistic payloads. Warm up the server first (JIT, connection pools). Run for at least 30 seconds. Measure p99, not just average. Don't benchmark on the same machine as the server. Common mistake: testing with `curl` in a loop (no concurrency).

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"How do you measure Node.js performance?"_ → Event loop lag (`perf_hooks`), throughput (`autocannon`), CPU profiling (`clinic flame`), memory (`process.memoryUsage()`), and p99 latency.
> - _"What is p99 latency?"_ → The response time at the 99th percentile — 99% of requests are faster than this. More useful than average because it reveals tail latency.
> - _"Your API is slow. How do you diagnose?"_ → Check event loop lag → clinic doctor → thread pool saturation → flamegraph for hot functions → external deps (DB, Redis latency).
> - _"autocannon vs wrk?"_ → Both are load testers. `autocannon` is Node-native (npm install). `wrk` is C-based (faster, but needs compilation). Both measure throughput, latency distribution.

> **📝 Quick Revision — Performance:**
> | Metric | How to Measure | Healthy Value |
> |---|---|---|
> | Event loop lag | `monitorEventLoopDelay()` | < 20ms |
> | Throughput (req/s) | `autocannon -c 100 -d 10` | Depends on app |
> | p99 latency | autocannon/wrk output | < 200ms for APIs |
> | Memory (RSS) | `process.memoryUsage().rss` | Stable, not growing |
> | CPU profiling | `clinic flame` | No single function > 30% |

[↑ Back to Index](#table-of-contents)

---

### 7.3 API Design & Versioning

### Concepts

Good API design makes your backend usable, maintainable, and scalable. **REST** and **GraphQL** are the two dominant paradigms for Node.js APIs.

**REST** organizes resources around URLs (`/users/123/posts`) with HTTP verbs (GET, POST, PUT, DELETE). It's simple, cacheable, and well-understood. Use it when your data model maps well to resources.

**GraphQL** lets clients request exactly the data they need in a single query. It avoids over-fetching and under-fetching. Use it when you have complex relationships or mobile clients that need bandwidth efficiency.

**Versioning** keeps old clients working when you change the API. Common strategies: URL path (`/v1/users`), header (`Accept: application/vnd.api.v2+json`), or query param (`?version=2`).

**Idempotency** ensures that retrying a request produces the same result. Critical for payment APIs — if the client retries a charge, use an **idempotency key** so the server doesn't charge twice.

```mermaid
flowchart TB
    subgraph REST ["REST API"]
        R1["GET /users"] --> R2["GET /users/123"]
        R2 --> R3["GET /users/123/posts"]
    end
    subgraph GQL ["GraphQL"]
        G1["POST /graphql"] --> G2["query { user(id:123) { name posts { title } } }"]
    end
    subgraph Choice ["Decision"]
        D{"Simple resources?"}
        D -->|Yes| REST
        D -->|Complex queries| GQL
    end
    style REST fill:#e3f2fd
    style GQL fill:#fce4ec
```

### Key Patterns

```js
// --- REST best practices ---
// Resource naming: plural nouns
// GET    /api/v1/users        → list
// GET    /api/v1/users/:id    → get one
// POST   /api/v1/users        → create
// PUT    /api/v1/users/:id    → full update
// PATCH  /api/v1/users/:id    → partial update
// DELETE /api/v1/users/:id    → delete

// Pagination (cursor-based, better than offset for large datasets)
app.get("/api/v1/users", async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const users = await db.query(
        "SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2",
        [cursor || 0, safeLimit],
    );
    res.json({
        data: users,
        nextCursor: users.length ? users[users.length - 1].id : null,
    });
});
```

```js
// --- Rate limiting ---
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    message: { error: "Too many requests, try again later" },
});

app.use("/api/", limiter);
```

```js
// --- Idempotency for payments ---
app.post("/api/v1/charges", async (req, res) => {
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey)
        return res
            .status(400)
            .json({ error: "Idempotency-Key header required" });

    // Check if already processed
    const existing = await db.query(
        "SELECT * FROM charges WHERE idempotency_key = $1",
        [idempotencyKey],
    );
    if (existing.rows.length) return res.json(existing.rows[0]);

    // Process new charge
    const charge = await processPayment(req.body);
    await db.query(
        "INSERT INTO charges (idempotency_key, data) VALUES ($1, $2)",
        [idempotencyKey, charge],
    );
    res.status(201).json(charge);
});
```

### Senior-Level Q&A

**Q1: REST vs GraphQL — tradeoffs?**

|                | REST                | GraphQL                |
| -------------- | ------------------- | ---------------------- |
| Caching        | Easy (HTTP caching) | Hard (single endpoint) |
| Over-fetching  | Common              | Eliminated             |
| Learning curve | Low                 | Medium                 |
| Tooling        | Mature              | Growing                |
| File uploads   | Simple              | Complex                |
| **Best for**   | CRUD apps           | Complex data graphs    |

**Q2: How do you version a REST API without breaking clients?**

A: Use URL versioning (`/v1/`, `/v2/`) for simplicity. Support the old version for a deprecation period. Use feature flags internally to avoid duplicating code.

**Q3: How do you prevent abuse of your API?**

A: Layer defenses: rate limiting (per IP, per API key), input validation (Joi/Zod), request size limits, authentication, and monitoring for anomalies.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"REST vs GraphQL?"_ → REST = resource-based URLs, fixed response shape, cacheable. GraphQL = single endpoint, client specifies fields, avoids over/under-fetching. REST for CRUD, GraphQL for complex data graphs.
> - _"How do you handle pagination?"_ → Cursor-based (better for real-time data, no skipping issues) or offset-based (simpler, but slow for deep pages). Return `nextCursor` or `totalPages`.
> - _"What is idempotency in APIs?"_ → Repeating the same request produces the same result. Use idempotency keys (client-generated UUID) to prevent duplicate side effects on retries.
> - _"How do you version an API?"_ → URL versioning (`/v1/`, `/v2/`) is simplest. Header versioning (`Accept: application/vnd.api+json;version=2`) is cleaner but harder to test.

> **📝 Quick Revision — API Design:**
> | Concept | REST | GraphQL |
> |---|---|---|
> | Endpoints | Multiple (`/users`, `/posts`) | Single (`/graphql`) |
> | Data fetching | Fixed response shape | Client specifies fields |
> | Over-fetching | Common problem | Solved by design |
> | Caching | Built-in (HTTP cache) | Needs Apollo/Relay |
> | Versioning | URL (`/v1/`) or header | Schema evolution |
> | Best for | CRUD APIs | Complex nested data |

[↑ Back to Index](#table-of-contents)

---

## Phase 8 — Deployment, Security & Operations

### 8.1 Deployment & Operations

### Concepts

Getting Node.js code from your laptop to production involves **containerization**, **process management**, **health checks**, and **deployment strategies**.

**Docker** packages your app with its exact Node version and dependencies into a portable container. It eliminates "works on my machine" problems.

**Process managers** (PM2, systemd) keep your app running, restart on crash, and manage logs. PM2 also supports cluster mode (multiple processes per server).

**Health checks** let load balancers and orchestrators know if your app is alive and ready to serve traffic. A liveness check confirms the process is running; a readiness check confirms it can handle requests (DB connected, caches warm).

**Deployment strategies:**

- **Rolling update** — replace instances one at a time (zero downtime)
- **Blue-green** — run two identical environments; swap traffic instantly
- **Canary** — route a small % of traffic to the new version first

```mermaid
flowchart TB
    subgraph Build ["Build"]
        Code[Source Code] --> Docker[Docker Image]
        Docker --> Registry[Container Registry]
    end
    subgraph Deploy ["Deploy"]
        Registry --> K8s[Kubernetes / ECS]
        K8s --> Pod1[Pod 1]
        K8s --> Pod2[Pod 2]
        K8s --> Pod3[Pod 3]
    end
    subgraph Monitor ["Monitor"]
        Pod1 --> Health[Health Checks]
        Pod2 --> Health
        Pod3 --> Health
        Health --> LB[Load Balancer]
    end
    style Docker fill:#2196f3,color:#fff
    style LB fill:#4caf50,color:#fff
```

### Key Patterns

```dockerfile
# --- Optimized Dockerfile for Node.js ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine
WORKDIR /app
# Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app .
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

```js
// --- Graceful shutdown ---
const server = app.listen(3000);

async function gracefulShutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
        console.log("HTTP server closed");
    });

    // Close DB connections, flush logs
    await db.end();
    await logger.flush();

    // Force exit after timeout
    setTimeout(() => {
        console.error("Forced shutdown");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

```js
// --- Health check endpoints ---
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.get("/ready", async (req, res) => {
    try {
        await db.query("SELECT 1"); // DB alive?
        await redis.ping(); // Cache alive?
        res.status(200).json({ status: "ready" });
    } catch (err) {
        res.status(503).json({ status: "not ready", error: err.message });
    }
});
```

```bash
# --- PM2 commands ---
pm2 start server.js -i max       # Cluster mode (all CPUs)
pm2 reload server                # Zero-downtime restart
pm2 logs                         # View logs
pm2 monit                        # Live monitoring dashboard
pm2 save                         # Save current process list
pm2 startup                      # Auto-start on server reboot
```

### Senior-Level Q&A

**Q1: Docker multi-stage build — why is it important?**

A: Reduces final image size. The builder stage installs dev dependencies and compiles; the production stage copies only what's needed. A typical Node.js image drops from ~900MB to ~150MB.

**Q2: How do you implement zero-downtime deploys?**

A: Use rolling updates (Kubernetes) or PM2 reload. The old process keeps handling in-flight requests while new processes start. Graceful shutdown ensures no requests are dropped.

**Q3: SIGTERM vs SIGKILL — what's the difference?**

A: `SIGTERM` is a polite "please shut down" — your process can catch it and clean up. `SIGKILL` is an immediate kill — no cleanup, no catch. Kubernetes sends `SIGTERM` first, waits 30s (configurable), then sends `SIGKILL`.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Docker multi-stage build?"_ → First stage installs all deps + compiles; second stage copies only production artifacts. Image drops from ~900MB to ~150MB.
> - _"What is a health check?"_ → An endpoint (`/health`) that returns 200 if the service is operational. K8s/LB uses it to route traffic only to healthy instances. Check DB, Redis, disk space.
> - _"PM2 vs Docker for process management?"_ → PM2 = Node-specific (cluster mode, log management, reload). Docker/K8s = container orchestration (language-agnostic, scaling, self-healing). Use both: PM2 inside container for cluster, K8s outside for orchestration.
> - _"What goes in .dockerignore?"_ → `node_modules`, `.git`, `*.md`, test files, `.env` — anything not needed at runtime. Smaller context = faster builds.

> **📝 Quick Revision — Deployment:**
> | Concept | Key Point |
> |---|---|
> | Multi-stage Docker | Separate build stage from production; smaller images |
> | Health checks | `/health` endpoint; LB/K8s routes only to healthy |
> | Graceful shutdown | SIGTERM → drain → close connections → exit 0 |
> | Rolling update | Replace instances one by one; zero downtime |
> | PM2 cluster | `pm2 start app.js -i max` — all CPU cores |
> | SIGTERM vs SIGKILL | SIGTERM = catchable. SIGKILL = instant death |

[↑ Back to Index](#table-of-contents)

---

### 8.2 Security Checklist & Hardening

### Concepts

Security isn't a feature — it's a requirement. Node.js apps face the same web vulnerabilities as any server, plus some unique risks around dependency management and prototype pollution.

**OWASP Top 10 for Node.js:**

1. **Injection** (SQL, NoSQL, command) — always parameterize queries
2. **Broken authentication** — use bcrypt, JWT with short expiry, rate limit login
3. **Sensitive data exposure** — encrypt at rest and in transit (TLS)
4. **Broken access control** — check permissions on every request
5. **Security misconfiguration** — use helmet, disable `X-Powered-By`
6. **XSS** — sanitize output, use CSP headers
7. **Insecure deserialization** — validate JSON schemas (Zod/Joi)
8. **Using components with known vulns** — `npm audit`, Snyk
9. **Insufficient logging** — log auth failures, suspicious patterns
10. **SSRF** — validate/restrict outgoing URLs

```mermaid
flowchart TB
    subgraph Input ["Input Layer"]
        V[Validate Input<br/>Zod / Joi]
        RL[Rate Limit<br/>express-rate-limit]
        CORS2[CORS Headers]
    end
    subgraph App ["Application Layer"]
        Auth[Authentication<br/>bcrypt + JWT]
        AuthZ[Authorization<br/>RBAC / ABAC]
        San[Sanitize Output<br/>DOMPurify]
    end
    subgraph Infra ["Infrastructure Layer"]
        TLS2[TLS 1.2+]
        Helm[Helmet Headers]
        Dep[Dependency Audit<br/>npm audit / Snyk]
    end
    Input --> App --> Infra
    style V fill:#4caf50,color:#fff
    style Auth fill:#2196f3,color:#fff
    style TLS2 fill:#ff9800,color:#fff
```

### Security Checklist

```js
// 1. Input validation (Zod example)
const { z } = require("zod");
const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    age: z.number().int().min(13).max(150).optional(),
});

app.post("/register", (req, res) => {
    const result = UserSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.issues });
    // Proceed with validated data
});

// 2. SQL injection prevention (parameterized queries)
// ❌ BAD: String concatenation
// db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
// ✅ GOOD: Parameterized
const user = await db.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
]);

// 3. Password hashing (bcrypt)
const bcrypt = require("bcrypt");
const hash = await bcrypt.hash(password, 12); // 12 salt rounds
const match = await bcrypt.compare(inputPassword, storedHash);

// 4. JWT with short expiry
const jwt = require("jsonwebtoken");
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
});

// 5. Helmet (security headers)
app.use(helmet());
app.disable("x-powered-by");

// 6. Dependency scanning
// npm audit              (built-in)
// npx snyk test          (deeper scan)
// npm audit fix --force  (auto-fix, careful with breaking changes)

// 7. Environment variables (never hardcode secrets)
// ❌ const secret = 'my-secret-key';
// ✅ const secret = process.env.JWT_SECRET;
```

### Senior-Level Q&A

**Q1: How do you prevent prototype pollution in Node.js?**

A: Prototype pollution occurs when an attacker sets `__proto__` or `constructor.prototype` via user input. Freeze prototypes, validate input keys, or use `Object.create(null)` for lookup maps.

```js
// ❌ Vulnerable to prototype pollution
function merge(target, source) {
    for (const key in source) {
        target[key] = source[key]; // __proto__ can be set!
    }
}

// ✅ Safe merge
function safeMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype")
            continue;
        target[key] = source[key];
    }
}
```

**Q2: Your `npm audit` shows 15 high vulnerabilities. How do you prioritize?**

A:

1. Check if the vulnerable package is a **direct** dependency (fix first) or transitive
2. Check if the vulnerability is **reachable** in your code path
3. Use `npm audit fix` for non-breaking fixes
4. For breaking changes, evaluate if upgrading is worth the effort
5. Use `npm overrides` or `resolutions` to force a safe version of transitive deps

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"Top 3 Node.js security risks?"_ → (1) Prototype pollution via JSON input. (2) Dependency vulnerabilities (supply chain). (3) Injection (SQL, command, ReDoS).
> - _"How do you manage secrets?"_ → Never hardcode. Use environment variables + secret manager (AWS Secrets Manager, Vault). `.env` files for development only (never commit).
> - _"What is CSP?"_ → Content Security Policy — HTTP header that restricts which resources (scripts, images, styles) can load. Prevents XSS by blocking inline scripts and untrusted sources.
> - _"How to handle npm audit vulnerabilities?"_ → Direct deps: upgrade. Transitive: use `npm overrides` or `resolutions`. Check if vulnerability is reachable in your code path.

> **📝 Quick Revision — Security:**
> | Threat | Prevention |
> |---|---|
> | Prototype pollution | Input validation (Joi/Zod), `Object.create(null)` |
> | SQL injection | Parameterized queries, ORMs |
> | XSS | CSP headers, output encoding |
> | Command injection | `execFile` not `exec`; never pass user input to shell |
> | Dependency vulns | `npm audit`, Snyk, Dependabot, lock files |
> | Secrets leakage | Env vars + secret manager; never commit `.env` |

[↑ Back to Index](#table-of-contents)

---

### 8.3 Observability: Tracing & APM

### Concepts

**Observability** is the ability to understand your system's internal state from its external outputs. The three pillars are **logs**, **metrics**, and **traces**.

- **Logs** — structured events (use pino or winston; JSON format for machine parsing)
- **Metrics** — numbers over time (request rate, error rate, latency histograms)
- **Traces** — the journey of a single request across services (distributed tracing)

**OpenTelemetry** is the industry standard for instrumenting Node.js apps. It collects traces, metrics, and logs and exports them to backends like Jaeger, Grafana Tempo, Datadog, or New Relic.

**Correlation IDs** tie all logs and traces from a single request together. Generate a unique ID at the edge (API gateway or first service) and pass it in headers (`X-Request-ID`).

```mermaid
flowchart LR
    subgraph App ["Node.js App"]
        OT[OpenTelemetry SDK]
        Log[Structured Logs<br/>pino]
        Met[Metrics<br/>prom-client]
    end
    subgraph Backends ["Observability Backends"]
        Jaeger[Jaeger / Tempo<br/>Traces]
        Grafana[Grafana<br/>Dashboards]
        Loki[Loki / ELK<br/>Logs]
    end
    OT --> Jaeger
    Met --> Grafana
    Log --> Loki
    Jaeger --> Grafana
    Loki --> Grafana
    style OT fill:#ff9800,color:#fff
    style Grafana fill:#4caf50,color:#fff
```

### Key Patterns

```js
// --- Structured logging with pino ---
const pino = require("pino");
const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    // JSON output for machine parsing
});

// Add request context (correlation ID)
app.use((req, res, next) => {
    req.log = logger.child({
        requestId: req.headers["x-request-id"] || crypto.randomUUID(),
        method: req.method,
        path: req.url,
    });
    next();
});

app.get("/api/users", async (req, res) => {
    req.log.info("Fetching users"); // Includes requestId automatically
    const users = await db.query("SELECT * FROM users");
    req.log.info({ count: users.length }, "Users fetched");
    res.json(users);
});
```

```js
// --- Prometheus metrics (prom-client) ---
const client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // CPU, memory, event loop lag

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on("finish", () =>
        end({
            method: req.method,
            route: req.route?.path || req.url,
            status: res.statusCode,
        }),
    );
    next();
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
});
```

```js
// --- OpenTelemetry auto-instrumentation ---
// tracing.js (load BEFORE app code)
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
    getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
    OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");

const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
        url: "http://localhost:4318/v1/traces",
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Start app: node -r ./tracing.js server.js
// Auto-instruments: HTTP, Express, pg, redis, fs, dns
```

### Senior-Level Q&A

**Q1: How do you trace a request across 5 microservices?**

A: Use OpenTelemetry with distributed tracing. The first service creates a **trace ID** and **span**. Each subsequent service receives the trace context via HTTP headers (`traceparent`) and creates child spans. The trace backend (Jaeger) assembles the full request waterfall.

**Q2: What's the difference between logs, metrics, and traces?**

|              | Logs                    | Metrics                       | Traces                          |
| ------------ | ----------------------- | ----------------------------- | ------------------------------- |
| Format       | Text/JSON events        | Numbers + labels              | Span trees                      |
| Cardinality  | High                    | Low                           | Medium                          |
| Use for      | Debugging, audit        | Alerting, dashboards          | Performance, dependencies       |
| Storage cost | High                    | Low                           | Medium                          |
| Example      | "User 123 login failed" | `http_errors_total{code=500}` | Request → DB → Cache → Response |

**Q3: Your dashboard shows high p99 latency but low average. What does this mean?**

A: A small percentage of requests are very slow (tail latency). Common causes: garbage collection pauses, slow DB queries, thread pool exhaustion. Investigate with p99 flamegraphs and correlate with GC metrics.

> **💡 Interview Tip — One-Liner Answers:**
>
> - _"What is OpenTelemetry?"_ → Vendor-neutral framework for collecting traces, metrics, and logs. Instrument once, export to any backend (Jaeger, Datadog, Grafana).
> - _"What is a distributed trace?"_ → A tree of spans showing the entire request journey across microservices. Each span has: service name, duration, status, parent span ID.
> - _"Logs vs metrics vs traces?"_ → Logs = what happened (debug). Metrics = how much (alert). Traces = how long, where (performance). Use all three together.
> - _"What is a correlation ID?"_ → A unique ID (UUID) attached to every log and trace for a single request — lets you follow one request across all microservices.

> **📝 Quick Revision — Observability:**
> | Signal | Format | Use For | Tool |
> |---|---|---|---|
> | Logs | JSON events | Debugging, audit trail | pino, winston, ELK |
> | Metrics | Numbers + labels | Alerting, dashboards | Prometheus, Grafana |
> | Traces | Span trees | Latency, service dependencies | Jaeger, Datadog, Tempo |
> | Correlation ID | UUID per request | Cross-service debugging | Custom middleware |

[↑ Back to Index](#table-of-contents)

---

## Appendix

### A.1 Quick Reference: Example Files

**Event Loop & Timing:**

- [eventloop.js](eventloop.js) — phases, microtasks, scheduling

**Async Patterns:**

- [async.js](async.js) — Promises, callbacks, async/await
- [async.txt](async.txt) — Async reference notes

**Streams & Data Handling:**

- [NodeServer/\_\_streams.js](NodeServer/__streams.js) — piping, transforms
- [\_Stream_Buffer.js](_Stream_Buffer.js) — backpressure examples
- [fs/basics.js](fs/basics.js) — file operations, streaming

**Process Management:**

- [EventEmitters/\_exec.js](EventEmitters/_exec.js) — exec examples
- [EventEmitters/\_spawn.js](EventEmitters/_spawn.js) — spawn with I/O
- [EventEmitters/basics.js](EventEmitters/basics.js), [listeners.js](EventEmitters/listeners.js) — Event emitter patterns
- [ClusterAndFork/index.js](ClusterAndFork/index.js) — cluster master setup
- [ClusterAndFork/child.js](ClusterAndFork/child.js) — worker process

**Concurrency:**

- [workerthreads/server.js](workerthreads/server.js) — worker creation
- [workerthreads/worker.js](workerthreads/worker.js) — worker implementation
- [\_atomics/atomics.js](_atomics/atomics.js) — Atomics synchronization
- [\_atomics/parent.js](_atomics/parent.js) — shared memory coordination

**HTTP & Networking:**

- [NodeServer/server.js](NodeServer/server.js) — basic HTTP server
- [NodeServer/http_server.js](NodeServer/http_server.js) — advanced patterns

**Interview & Reference:**

- [nodejs_interview_reference.md](nodejs_interview_reference.md) — Promise implementations, debounce/throttle, company-specific prep
- [Coding/questions.md](Coding/questions.md) — coding interview problems

[↑ Back to Index](#table-of-contents)

---

### A.2 Glossary & Cheat Sheet

### Quick Reference — Node.js Commands

| Command                                             | Purpose                              |
| --------------------------------------------------- | ------------------------------------ |
| `node --inspect server.js`                          | Start with Chrome DevTools debugger  |
| `node --prof server.js`                             | CPU profiling (generates tick log)   |
| `node --max-old-space-size=4096 app.js`             | Increase V8 heap to 4GB              |
| `node --trace-warnings app.js`                      | Show stack trace for warnings        |
| `node --unhandled-rejections=strict app.js`         | Crash on unhandled Promise rejection |
| `UV_THREADPOOL_SIZE=16 node app.js`                 | Increase libuv thread pool           |
| `NODE_ENV=production node app.js`                   | Enable production optimizations      |
| `npx clinic doctor -- node server.js`               | Diagnose event loop issues           |
| `npx clinic flame -- node server.js`                | Generate CPU flamegraph              |
| `npx autocannon -c 100 -d 10 http://localhost:3000` | Load test (100 connections, 10s)     |
| `npm audit`                                         | Check for dependency vulnerabilities |
| `npx madge --circular src/`                         | Find circular dependencies           |
| `pm2 start app.js -i max`                           | PM2 cluster mode (all CPUs)          |
| `pm2 reload app`                                    | Zero-downtime restart                |

### Glossary

| Term                  | Definition                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| **Event Loop**        | Single-threaded mechanism that processes async callbacks in phases                               |
| **libuv**             | C library providing the event loop, thread pool, and async I/O for Node.js                       |
| **Backpressure**      | Flow control mechanism preventing fast producers from overwhelming slow consumers                |
| **Microtask**         | High-priority async callback (process.nextTick, Promise.then) executed between event loop phases |
| **Macrotask**         | Standard async callback (setTimeout, setImmediate, I/O) executed during event loop phases        |
| **highWaterMark**     | Buffer threshold (in bytes) that triggers backpressure in streams                                |
| **SharedArrayBuffer** | Memory region shared between threads (main thread + workers)                                     |
| **Atomics**           | API for thread-safe operations on SharedArrayBuffer                                              |
| **IPC**               | Inter-Process Communication — messaging between parent and child processes                       |
| **Cluster**           | Module to fork multiple Node.js processes sharing the same port                                  |
| **Worker Threads**    | True threads for CPU-bound work; share memory via SharedArrayBuffer                              |
| **CORS**              | Cross-Origin Resource Sharing — HTTP headers controlling cross-domain access                     |
| **HSTS**              | HTTP Strict Transport Security — forces HTTPS                                                    |
| **CSP**               | Content Security Policy — restricts resource loading to prevent XSS                              |
| **Idempotency**       | Property where repeating an operation produces the same result                                   |
| **Dead Letter Queue** | Queue for messages that failed processing after all retries                                      |
| **APM**               | Application Performance Monitoring                                                               |
| **OpenTelemetry**     | Vendor-neutral observability framework for traces, metrics, and logs                             |

### Common Interview Prompts

1. Explain the Node.js event loop phases and microtask priority
2. What happens when you `await` inside a `for` loop vs `Promise.all`?
3. How does backpressure work in streams? What happens if you ignore it?
4. Compare `cluster.fork()` vs `worker_threads` — when to use each?
5. Design a rate limiter for a REST API
6. How would you handle a 5GB file upload without running out of memory?
7. Explain `dns.lookup()` vs `dns.resolve()` and thread pool implications
8. How do you implement graceful shutdown in a production Node.js server?
9. What's prototype pollution and how do you prevent it?
10. Design a real-time chat system for 100K concurrent users

---

## Next Steps for Interview Prep

1. **Master Event Loop & Async:** These are foundational; all systems design builds on them.
2. **Deep dive Concurrency Models:** Understand tradeoffs; be ready to design under constraints.
3. **Study scenarios:** Practice real interview scenarios (chat app, URL shortener, task queue).
4. **Code proficiency:** Implement examples in this guide; run them locally to understand behavior.
5. **Production awareness:** Discuss monitoring, error handling, and graceful shutdown in interviews.
6. **Tools knowledge:** Be comfortable with `--inspect`, `clinic.js`, Redis, PostgreSQL basics.

---

## Summary

This guide covers **senior-level Node.js interview prep** across **8 phases + appendix** with:

✅ **Core fundamentals** (event loop, async patterns, streams) with edge cases and traps  
✅ **Node.js internals** (module system, libuv thread pool, Buffer API, error handling)  
✅ **Concurrency deep dives** (cluster vs workers vs fork, with decision matrices)  
✅ **System design** (scalability, architecture patterns, real-world scenarios)  
✅ **Production readiness** (debugging, profiling, monitoring, security, graceful shutdown)  
✅ **Networking & real-time** (HTTP/2, WebSockets, message queues, background jobs)  
✅ **Testing & performance** (Jest, CI/CD, autocannon, clinic.js, flamegraphs)  
✅ **API design** (REST vs GraphQL, pagination, idempotency, rate limiting)  
✅ **Deployment & operations** (Docker, Kubernetes, PM2, graceful shutdown, health checks)  
✅ **Security hardening** (OWASP, prototype pollution, dependency scanning, secrets)  
✅ **Observability** (OpenTelemetry, Prometheus, distributed tracing, correlation IDs)  
✅ **Real interview questions** from Indian IT + fintech companies  
✅ **Runnable example code** linked to your workspace files  
✅ **Glossary & cheat sheet** for quick reference and last-minute revision

**Focus on understanding not memorization.** Be ready to:

- Explain tradeoffs (why cluster over workers for HTTP servers)
- Design systems under constraints (1000 concurrent WebSocket users)
- Reason about bottlenecks (memory, CPU, I/O)
- Discuss production considerations (monitoring, error handling, deployment)

Good luck with your interview! 🚀
