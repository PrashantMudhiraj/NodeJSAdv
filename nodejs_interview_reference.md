# Node.js Interview Reference — 4 Years Experience
> Indian IT Companies: TCS, Infosys, Wipro, Cognizant, Razorpay, PhonePe, Swiggy, Flipkart, Paytm, Publicis Sapient

---

## TABLE OF CONTENTS
1. [Core JavaScript / Async](#1-core-javascript--async)
2. [Node.js Specific](#2-nodejs-specific)
3. [Streams & File Handling ⭐ (Your Weak Area)](#3-streams--file-handling)
4. [Express / REST API](#4-express--rest-api)
5. [Database — MongoDB / MySQL](#5-database)
6. [Redis / Caching / Queues ⭐ (Your Weak Area)](#6-redis--caching--queues)
7. [DSA in JavaScript ⭐ (Your Weak Area)](#7-dsa-in-javascript)
8. [System Design / Architecture Coding](#8-system-design--architecture-coding)
9. [Tricky Output Questions](#9-tricky-output-questions)

---

## 1. Core JavaScript / Async

### Q1. Implement `Promise.all()`
```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;

    if (promises.length === 0) return resolve([]);

    promises.forEach((p, i) => {
      Promise.resolve(p)
        .then(val => {
          results[i] = val;
          completed++;
          if (completed === promises.length) resolve(results);
        })
        .catch(reject); // Rejects immediately on first failure
    });
  });
}
```
> **Key points:** Results maintain ORDER (not speed). Rejects on first failure.

---

### Q2. Implement `Promise.race()`
```js
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve).catch(reject);
    });
  });
}
```

---

### Q3. Implement `Promise.allSettled()`
```js
function promiseAllSettled(promises) {
  return Promise.all(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```

---

### Q4. Implement `promisify`
```js
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

// Usage
const readFile = promisify(require('fs').readFile);
readFile('file.txt', 'utf8').then(console.log);
```

---

### Q5. `debounce` and `throttle`
```js
// DEBOUNCE: Wait until user STOPS calling (e.g., search input)
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// THROTTLE: Call at most once every N ms (e.g., scroll/resize)
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```
> **Interview tip:** Know the difference — debounce waits for pause, throttle allows periodic calls.

---

### Q6. Deep Clone (without JSON)
```js
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set([...obj].map(deepClone));

  const clone = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}
```
> **Why not JSON?** Fails on `undefined`, `Date`, `Map`, `Set`, circular refs, functions.

---

### Q7. Curry Function
```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...nextArgs) {
      return curried.apply(this, args.concat(nextArgs));
    };
  };
}

// Usage
const add = (a, b, c) => a + b + c;
const curriedAdd = curry(add);
curriedAdd(1)(2)(3); // 6
curriedAdd(1, 2)(3); // 6
```

---

### Q8. Memoize
```js
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Usage
const expensiveCalc = memoize((n) => {
  console.log('Computing...');
  return n * n;
});
expensiveCalc(5); // Computing... 25
expensiveCalc(5); // 25 (cached!)
```

---

### Q9. Flatten Nested Array/Object
```js
// Flatten Array
function flattenArray(arr, depth = Infinity) {
  return arr.reduce((flat, item) => {
    if (Array.isArray(item) && depth > 0) {
      return flat.concat(flattenArray(item, depth - 1));
    }
    return flat.concat(item);
  }, []);
}

// Flatten Object (nested keys become dot-notation)
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], fullKey));
    } else {
      acc[fullKey] = obj[key];
    }
    return acc;
  }, {});
}

// Example
flattenObject({ a: { b: { c: 1 } }, d: 2 });
// { 'a.b.c': 1, d: 2 }
```

---

## 2. Node.js Specific

### Q10. Build HTTP Server without Express
```js
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && pathname === '/users') {
    res.writeHead(200);
    res.end(JSON.stringify({ users: [] }));
  } else if (req.method === 'POST' && pathname === '/users') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.writeHead(201);
      res.end(JSON.stringify({ created: true, data }));
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(3000, () => console.log('Running on port 3000'));
```

---

### Q11. process.nextTick vs setImmediate vs setTimeout(0)
```js
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('Promise'));

// Output ORDER:
// nextTick       ← runs before any I/O (end of current operation)
// Promise        ← microtask queue (right after nextTick)
// setTimeout     ← timers phase of event loop
// setImmediate   ← check phase (after I/O)
```

> **Memory trick:** nextTick > Promises > setTimeout ≈ setImmediate
> **When to use nextTick:** Emit events AFTER constructor runs. Don't overuse — blocks I/O!

---

### Q12. Custom EventEmitter
```js
class MyEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this; // Allow chaining
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => listener(...args));
    return true;
  }
}

// Usage
const emitter = new MyEventEmitter();
emitter.on('data', (msg) => console.log('Got:', msg));
emitter.emit('data', 'Hello!'); // Got: Hello!
```

---

### Q13. Handle Uncaught Exceptions / Unhandled Rejections
```js
// Uncaught synchronous errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Log, cleanup, then EXIT (process is in undefined state)
  process.exit(1);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production: log and exit
  process.exit(1);
});

// BEST PRACTICE: Always use try/catch in async functions
async function fetchData() {
  try {
    const data = await someAsyncOperation();
    return data;
  } catch (err) {
    // Handle here, don't let it bubble up unhandled
    throw err;
  }
}
```

---

### Q14. Module Caching
```js
// module-a.js
let count = 0;
module.exports = { increment: () => ++count, getCount: () => count };

// main.js
const a1 = require('./module-a');
const a2 = require('./module-a');

a1.increment();
console.log(a2.getCount()); // 1 — SAME instance! Modules are cached.

// To get fresh instance each time:
// export a factory function instead
module.exports = () => {
  let count = 0;
  return { increment: () => ++count };
};
```

---

## 3. Streams & File Handling
> ⭐ Your Weak Area — Read this section carefully!

### CONCEPT FIRST: What are Streams?
Streams process data **piece by piece** instead of loading it all into memory.

```
Without Streams: readFile → wait → ALL data in RAM → process
With Streams:    chunk1 → process → chunk2 → process → ...
```

**4 Types of Streams:**
- `Readable` — data source (fs.createReadStream, http request)
- `Writable` — data destination (fs.createWriteStream, http response)
- `Duplex` — both (TCP socket)
- `Transform` — reads, modifies, writes (zlib.createGzip)

---

### Q15. Read Large File using Streams (NOT readFile)
```js
const fs = require('fs');

// ❌ BAD — loads entire file into RAM
const data = fs.readFileSync('hugefile.txt', 'utf8');

// ✅ GOOD — stream it
const readable = fs.createReadStream('hugefile.txt', { encoding: 'utf8' });

readable.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length, 'bytes');
  // process each chunk
});

readable.on('end', () => console.log('File read complete'));
readable.on('error', (err) => console.error('Error:', err));
```

---

### Q16. Pipe Streams (Copy a file)
```js
const fs = require('fs');

// Pipe = chain readable to writable
const readStream = fs.createReadStream('input.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.pipe(writeStream);

writeStream.on('finish', () => console.log('File copied!'));

// With error handling (better approach)
const { pipeline } = require('stream');
pipeline(
  fs.createReadStream('input.txt'),
  fs.createWriteStream('output.txt'),
  (err) => {
    if (err) console.error('Pipeline failed:', err);
    else console.log('Pipeline succeeded!');
  }
);
```
> **Why `pipeline` over `pipe`?** Pipeline auto-destroys streams on error. `pipe` can leave streams open.

---

### Q17. Read CSV File Line by Line (Streams + readline)
```js
const fs = require('fs');
const readline = require('readline');

async function processCSV(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity  // Handle \r\n on Windows
  });

  let headers = null;
  const records = [];

  for await (const line of rl) {
    const values = line.split(',');
    
    if (!headers) {
      headers = values; // First line = headers
    } else {
      const record = {};
      headers.forEach((header, i) => {
        record[header.trim()] = values[i]?.trim();
      });
      records.push(record);
    }
  }
  
  return records;
}

// Usage
processCSV('data.csv').then(records => {
  console.log(`Processed ${records.length} records`);
});
```

---

### Q18. Custom Transform Stream
```js
const { Transform } = require('stream');

// Transform stream that uppercases all text
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback(); // Signal done with this chunk
  }
}

// Usage — chain streams
const { pipeline } = require('stream');
const fs = require('fs');

pipeline(
  fs.createReadStream('input.txt'),
  new UpperCaseTransform(),
  fs.createWriteStream('output.txt'),
  (err) => {
    if (err) console.error(err);
    else console.log('Done!');
  }
);
```

---

### Q19. Compress File using Streams (zlib)
```js
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');

// COMPRESS
pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (err) => {
    if (err) console.error('Compress failed:', err);
    else console.log('Compressed!');
  }
);

// DECOMPRESS
pipeline(
  fs.createReadStream('input.txt.gz'),
  zlib.createGunzip(),
  fs.createWriteStream('input.txt'),
  (err) => {
    if (err) console.error('Decompress failed:', err);
    else console.log('Decompressed!');
  }
);
```

---

### Q20. Implement Backpressure Handling
```js
const fs = require('fs');

const readable = fs.createReadStream('large-file.txt');
const writable = fs.createWriteStream('output.txt');

readable.on('data', (chunk) => {
  const ok = writable.write(chunk);
  
  if (!ok) {
    // Writable buffer is full — pause reading!
    readable.pause();
    console.log('Paused reading (backpressure)');
  }
});

writable.on('drain', () => {
  // Writable buffer drained — resume reading
  readable.resume();
  console.log('Resumed reading');
});

readable.on('end', () => writable.end());
```
> **Note:** `pipeline()` handles backpressure automatically. Implement manually only if asked.

---

### Q21. Worker Threads for CPU-Intensive Tasks
```js
// worker.js
const { workerData, parentPort } = require('worker_threads');

// Heavy computation
function heavyTask(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += i;
  return sum;
}

const result = heavyTask(workerData.n);
parentPort.postMessage({ result });

// main.js
const { Worker } = require('worker_threads');

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('Starting workers...');
  const [r1, r2] = await Promise.all([
    runWorker({ n: 1e8 }),
    runWorker({ n: 1e8 }),
  ]);
  console.log('Results:', r1, r2);
}

main();
```
> **When to use:** CPU-intensive tasks (image processing, crypto, large calculations). NOT for I/O (async handles that fine).

---

## 4. Express / REST API

### Q22. Proper Error Handling Middleware
```js
const express = require('express');
const app = express();

// Custom Error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Async wrapper to avoid try/catch in every route
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json(user);
}));

// Global Error Handler (MUST have 4 params)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  
  console.error('[ERROR]', err);
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

---

### Q23. JWT Authentication Middleware
```js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based Access Control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
app.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ data: 'Admin only data' });
});
```

---

### Q24. Rate Limiter Middleware (Custom)
```js
class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.store = new Map(); // In production: use Redis
  }

  middleware() {
    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      if (!this.store.has(key)) {
        this.store.set(key, []);
      }
      
      // Remove old timestamps outside window
      const timestamps = this.store.get(key).filter(t => t > windowStart);
      
      if (timestamps.length >= this.maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      timestamps.push(now);
      this.store.set(key, timestamps);
      
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - timestamps.length);
      
      next();
    };
  }
}

// Usage: 100 requests per 15 minutes
const limiter = new RateLimiter(15 * 60 * 1000, 100);
app.use('/api/', limiter.middleware());
```

---

### Q25. Pagination, Filtering, Sorting API
```js
app.get('/products', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc',
    category,
    minPrice,
    maxPrice
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build filter
  const filter = {};
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Product.countDocuments(filter)
  ]);
  
  res.json({
    data: products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: skip + products.length < total,
      hasPrev: page > 1
    }
  });
}));
```

---

### Q26. Graceful Shutdown
```js
const server = app.listen(3000);

function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close DB connections
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
    
    // Close Redis
    await redisClient.quit();
    console.log('Redis disconnected');
    
    process.exit(0);
  });
  
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close gracefully, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker/k8s sends this
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C sends this
```

---

## 5. Database

### Q27. MongoDB Aggregation Pipeline
```js
// Get top 5 categories by revenue, with product count
db.orders.aggregate([
  { $match: { status: 'completed' } },           // Filter
  { $unwind: '$items' },                          // Flatten items array
  { $group: {
    _id: '$items.category',
    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
    productCount: { $sum: 1 },
    avgOrderValue: { $avg: '$totalAmount' }
  }},
  { $sort: { totalRevenue: -1 } },               // Sort by revenue desc
  { $limit: 5 },
  { $project: {
    category: '$_id',
    totalRevenue: 1,
    productCount: 1,
    _id: 0
  }}
]);
```

---

### Q28. MongoDB Transactions
```js
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Transfer money: debit from A, credit to B
  await Account.findByIdAndUpdate(
    fromId,
    { $inc: { balance: -amount } },
    { session, new: true }
  );
  
  await Account.findByIdAndUpdate(
    toId,
    { $inc: { balance: amount } },
    { session }
  );
  
  // Create transaction record
  await Transaction.create([{
    from: fromId, to: toId, amount
  }], { session });
  
  await session.commitTransaction();
  console.log('Transfer complete');
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

### Q29. Second Highest Salary (SQL)
```sql
-- Method 1: Using LIMIT/OFFSET
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- Method 2: Using subquery (works everywhere)
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Method 3: Using DENSE_RANK (handles ties properly)
SELECT salary
FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2
LIMIT 1;
```

---

### Q30. Handle N+1 Query Problem
```js
// ❌ N+1 Problem: 1 query for orders + N queries for each user
const orders = await Order.find({});
for (let order of orders) {
  order.user = await User.findById(order.userId); // N queries!
}

// ✅ Solution 1: populate() in Mongoose
const orders = await Order.find({}).populate('userId', 'name email');

// ✅ Solution 2: Manual $lookup aggregation
const orders = await Order.aggregate([
  { $lookup: {
    from: 'users',
    localField: 'userId',
    foreignField: '_id',
    as: 'user'
  }},
  { $unwind: '$user' }
]);

// ✅ Solution 3: Batch fetch and map
const orders = await Order.find({});
const userIds = [...new Set(orders.map(o => o.userId.toString()))];
const users = await User.find({ _id: { $in: userIds } });
const userMap = users.reduce((acc, u) => ({ ...acc, [u._id]: u }), {});
orders.forEach(o => o.user = userMap[o.userId]);
```

---

## 6. Redis / Caching / Queues
> ⭐ Your Weak Area — Study these patterns thoroughly!

### CONCEPT FIRST: Why Redis?
Redis is an in-memory data store used for:
- **Caching** — store frequent DB results in memory
- **Session storage** — store JWT blacklists or session data
- **Rate limiting** — count requests per IP
- **Pub/Sub** — messaging between services
- **Job Queues** — background task processing

```
Flow: Request → Check Cache → HIT? Return fast. MISS? Query DB → Cache it → Return
```

---

### Q31. Redis Caching with TTL and Cache Invalidation
```js
const redis = require('redis');
const client = redis.createClient({ url: 'redis://localhost:6379' });

await client.connect();

// Cache Middleware
function cache(keyFn, ttlSeconds = 300) {
  return async (req, res, next) => {
    const cacheKey = keyFn(req);
    
    try {
      const cached = await client.get(cacheKey);
      
      if (cached) {
        console.log('CACHE HIT:', cacheKey);
        return res.json(JSON.parse(cached));
      }
      
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        await client.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
        console.log('CACHE SET:', cacheKey);
        return originalJson(data);
      };
      
      next();
    } catch (err) {
      next(); // On Redis error, proceed without cache
    }
  };
}

// Cache Invalidation
async function invalidateCache(pattern) {
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
    console.log(`Deleted ${keys.length} cache keys matching: ${pattern}`);
  }
}

// Usage
app.get('/products', 
  cache(req => `products:${JSON.stringify(req.query)}`),
  async (req, res) => {
    const products = await Product.find(req.query);
    res.json(products);
  }
);

// When a product is updated, invalidate related cache
app.put('/products/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body);
  await invalidateCache('products:*'); // Clear all product list caches
  res.json(product);
});
```

---

### Q32. Redis-based Rate Limiter (Production Quality)
```js
const redis = require('redis');
const client = redis.createClient();

// Using Redis sliding window counter
async function rateLimiter(req, res, next) {
  const key = `rate:${req.ip}`;
  const limit = 100;
  const window = 60; // 60 seconds
  
  const multi = client.multi();
  multi.incr(key);
  multi.expire(key, window);
  
  const [count] = await multi.exec();
  
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
  
  if (count > limit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: window
    });
  }
  
  next();
}
```

---

### Q33. Job Queue with Redis (Bull-like, simplified)
```js
const redis = require('redis');

class JobQueue {
  constructor(name) {
    this.name = name;
    this.client = redis.createClient();
    this.client.connect();
  }

  // Add job to queue
  async add(jobData, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data: jobData,
      attempts: 0,
      maxAttempts: options.retries || 3,
      createdAt: new Date().toISOString()
    };
    
    // LPUSH = add to left (front) of list
    await this.client.lPush(
      `queue:${this.name}:waiting`,
      JSON.stringify(job)
    );
    
    console.log(`Job ${job.id} added to queue`);
    return job;
  }

  // Process jobs
  async process(handler) {
    console.log(`Worker started for queue: ${this.name}`);
    
    while (true) {
      try {
        // BRPOP = blocking pop from right (processes in FIFO order)
        const result = await this.client.brPop(
          `queue:${this.name}:waiting`,
          5 // 5 second timeout
        );
        
        if (!result) continue; // Timeout, loop again
        
        const job = JSON.parse(result.element);
        console.log(`Processing job ${job.id}...`);
        
        try {
          await handler(job.data);
          console.log(`Job ${job.id} completed`);
          
          // Save completed job
          await this.client.lPush(
            `queue:${this.name}:completed`,
            JSON.stringify({ ...job, completedAt: new Date().toISOString() })
          );
        } catch (err) {
          job.attempts++;
          job.lastError = err.message;
          
          if (job.attempts < job.maxAttempts) {
            // Retry — add back to queue
            await this.client.lPush(
              `queue:${this.name}:waiting`,
              JSON.stringify(job)
            );
            console.log(`Job ${job.id} failed, retry ${job.attempts}/${job.maxAttempts}`);
          } else {
            // Dead letter queue
            await this.client.lPush(
              `queue:${this.name}:failed`,
              JSON.stringify(job)
            );
            console.log(`Job ${job.id} permanently failed`);
          }
        }
      } catch (err) {
        console.error('Worker error:', err);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
}

// Usage
const emailQueue = new JobQueue('emails');

// Producer
await emailQueue.add({ to: 'user@example.com', subject: 'Welcome!' });

// Worker (run in separate process)
emailQueue.process(async (data) => {
  await sendEmail(data.to, data.subject);
  console.log('Email sent to:', data.to);
});
```

---

### Q34. Pub/Sub with Redis
```js
const redis = require('redis');

// Publisher
const publisher = redis.createClient();
await publisher.connect();

async function publishEvent(channel, data) {
  await publisher.publish(channel, JSON.stringify(data));
  console.log(`Published to ${channel}:`, data);
}

// Subscriber (in a different service/process)
const subscriber = redis.createClient();
await subscriber.connect();

subscriber.subscribe('order:created', async (message) => {
  const order = JSON.parse(message);
  console.log('New order received:', order);
  // Send confirmation email, update inventory, etc.
});

subscriber.subscribe('payment:completed', async (message) => {
  const payment = JSON.parse(message);
  console.log('Payment processed:', payment);
});

// Usage — when order is placed:
await publishEvent('order:created', { orderId: '123', userId: 'u1', amount: 999 });
```

---

### Q35. Session Storage with Redis
```js
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,   // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// JWT Blacklist (on logout)
async function blacklistToken(token, expirySeconds) {
  await redisClient.setEx(`blacklist:${token}`, expirySeconds, '1');
}

async function isTokenBlacklisted(token) {
  return await redisClient.exists(`blacklist:${token}`);
}
```

---

## 7. DSA in JavaScript
> ⭐ Your Weak Area — Focus on LRU, Graphs, and real-world problems!

### Q36. LRU Cache (Most Asked!)
```js
// LRU = Least Recently Used — evicts the least recently used item when full
// Use: Map (maintains insertion order) for O(1) get/set

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key); // Remove old entry
    } else if (this.cache.size >= this.capacity) {
      // Evict LRU (first key in Map = least recently used)
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    
    this.cache.set(key, value);
  }
}

// Test
const lru = new LRUCache(3);
lru.put(1, 'A');
lru.put(2, 'B');
lru.put(3, 'C');
lru.get(1);       // Access 1 → order: 2,3,1
lru.put(4, 'D'); // Evict 2 (LRU) → order: 3,1,4
console.log(lru.get(2)); // -1 (evicted)
console.log(lru.get(3)); // 'C'
```
> **Time Complexity:** O(1) for both get and put using Map.

---

### Q37. LRU Cache with Doubly Linked List (Optimal — asked at Flipkart/Razorpay)
```js
class Node {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class LRUCacheDLL {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    
    // Dummy head and tail to avoid edge case checks
    this.head = new Node(0, 0); // LRU end
    this.tail = new Node(0, 0); // MRU end
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    // Insert right after head (most recently used)
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._addToFront(node);
    return node.val;
  }

  put(key, val) {
    if (this.map.has(key)) {
      this._remove(this.map.get(key));
    } else if (this.map.size >= this.capacity) {
      // Evict LRU (node before tail)
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
    
    const newNode = new Node(key, val);
    this._addToFront(newNode);
    this.map.set(key, newNode);
  }
}
```

---

### Q38. API Request Deduplication
```js
// Problem: Same API called multiple times simultaneously — return same promise
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async fetch(key, fetchFn) {
    if (this.pending.has(key)) {
      console.log('Deduped:', key);
      return this.pending.get(key); // Return same promise!
    }
    
    const promise = fetchFn().finally(() => {
      this.pending.delete(key); // Clean up after resolve/reject
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

// Usage
const dedup = new RequestDeduplicator();

// These 3 calls for same user only make 1 actual API call
const [u1, u2, u3] = await Promise.all([
  dedup.fetch('user:1', () => fetchUserFromDB(1)),
  dedup.fetch('user:1', () => fetchUserFromDB(1)), // deduped
  dedup.fetch('user:1', () => fetchUserFromDB(1)), // deduped
]);
```

---

### Q39. Task Scheduler
```js
class TaskScheduler {
  constructor() {
    this.tasks = [];
  }

  schedule(fn, intervalMs, options = {}) {
    const task = {
      fn,
      intervalMs,
      runImmediately: options.runImmediately || false,
      timer: null,
      running: false
    };

    const run = async () => {
      if (task.running) return; // Prevent overlapping runs
      task.running = true;
      try {
        await fn();
      } catch (err) {
        console.error('Task failed:', err);
      } finally {
        task.running = false;
      }
    };

    if (task.runImmediately) run();
    task.timer = setInterval(run, intervalMs);
    this.tasks.push(task);
    
    return () => clearInterval(task.timer); // Return stop function
  }

  stopAll() {
    this.tasks.forEach(t => clearInterval(t.timer));
    this.tasks = [];
  }
}

// Usage
const scheduler = new TaskScheduler();

const stopCleanup = scheduler.schedule(
  async () => {
    await db.deleteExpiredSessions();
    console.log('Cleaned up expired sessions');
  },
  60 * 60 * 1000, // Every hour
  { runImmediately: true }
);

// Stop later
stopCleanup();
```

---

### Q40. Topological Sort (API Dependency Execution)
```js
// Problem: Execute API calls in dependency order
// A depends on nothing → B depends on A → C depends on A
// Run A first, then B and C in parallel

async function executeInOrder(tasks) {
  // tasks: [{ id, deps: [], fn }]
  
  const results = {};
  const inDegree = {};
  const graph = {};
  
  // Build graph
  tasks.forEach(t => {
    inDegree[t.id] = t.deps.length;
    graph[t.id] = [];
  });
  
  tasks.forEach(t => {
    t.deps.forEach(dep => graph[dep].push(t.id));
  });
  
  // Queue tasks with no dependencies
  const queue = tasks.filter(t => t.deps.length === 0).map(t => t.id);
  
  const taskMap = tasks.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
  
  while (queue.length > 0) {
    // Execute all ready tasks in parallel
    const batch = [...queue];
    queue.length = 0;
    
    const batchResults = await Promise.all(
      batch.map(id => taskMap[id].fn(results))
    );
    
    batch.forEach((id, i) => {
      results[id] = batchResults[i];
      
      // Reduce in-degree of dependents
      graph[id].forEach(dep => {
        inDegree[dep]--;
        if (inDegree[dep] === 0) queue.push(dep);
      });
    });
  }
  
  return results;
}

// Usage
const results = await executeInOrder([
  { id: 'user', deps: [], fn: async () => fetchUser() },
  { id: 'orders', deps: ['user'], fn: async (r) => fetchOrders(r.user.id) },
  { id: 'payments', deps: ['user'], fn: async (r) => fetchPayments(r.user.id) },
  { id: 'report', deps: ['orders', 'payments'], fn: async (r) => buildReport(r) }
]);
```

---

## 8. System Design / Architecture Coding

### Q41. Circuit Breaker Pattern
```js
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold || 5;
    this.cooldownMs = options.cooldownMs || 30000;
    this.successThreshold = options.successThreshold || 2;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailTime = null;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailTime;
      if (elapsed > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit HALF_OPEN — testing...');
      } else {
        throw new Error(`Circuit is OPEN. Try again in ${Math.ceil((this.cooldownMs - elapsed)/1000)}s`);
      }
    }
    
    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        console.log('Circuit CLOSED — service recovered!');
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    this.successes = 0;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit OPENED — too many failures!');
    }
  }
}

// Usage
const breaker = new CircuitBreaker(
  () => fetch('https://external-api.com/data'),
  { failureThreshold: 3, cooldownMs: 10000 }
);

async function getData() {
  try {
    return await breaker.call();
  } catch (err) {
    // Fallback when circuit is open
    return getCachedData();
  }
}
```

---

### Q42. Retry with Exponential Backoff
```js
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (attempt === maxAttempts) break;
      
      // Exponential backoff: 1s → 2s → 4s → 8s...
      let delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);
      
      // Add jitter to avoid thundering herd
      if (jitter) delay += Math.random() * 1000;
      
      console.log(`Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

// Usage
const data = await withRetry(
  () => fetch('https://api.example.com/data'),
  { maxAttempts: 5, initialDelay: 500 }
);
```

---

### Q43. WebSocket Chat Server
```js
const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map(); // roomId → Set of clients
const clients = new Map(); // ws → { userId, roomId }

wss.on('connection', (ws) => {
  console.log('New connection');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'JOIN':
        clients.set(ws, { userId: data.userId, roomId: data.roomId });
        if (!rooms.has(data.roomId)) rooms.set(data.roomId, new Set());
        rooms.get(data.roomId).add(ws);
        broadcast(data.roomId, { type: 'USER_JOINED', userId: data.userId }, ws);
        break;

      case 'MESSAGE':
        const client = clients.get(ws);
        if (!client) return;
        broadcast(client.roomId, {
          type: 'MESSAGE',
          userId: client.userId,
          text: data.text,
          timestamp: Date.now()
        });
        break;
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      rooms.get(client.roomId)?.delete(ws);
      broadcast(client.roomId, { type: 'USER_LEFT', userId: client.userId });
      clients.delete(ws);
    }
  });
});

function broadcast(roomId, data, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const message = JSON.stringify(data);
  room.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(message);
    }
  });
}

server.listen(8080, () => console.log('WebSocket server on :8080'));
```

---

### Q44. Webhook System
```js
const crypto = require('crypto');
const axios = require('axios');

class WebhookSystem {
  constructor() {
    this.subscriptions = new Map(); // event → [{url, secret}]
  }

  subscribe(event, url, secret) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }
    this.subscriptions.get(event).push({ url, secret });
  }

  async emit(event, payload) {
    const subscribers = this.subscriptions.get(event) || [];
    
    const results = await Promise.allSettled(
      subscribers.map(sub => this.deliver(sub, event, payload))
    );
    
    return results;
  }

  async deliver(subscriber, event, payload) {
    const body = JSON.stringify({ event, payload, timestamp: Date.now() });
    
    // HMAC signature for verification
    const signature = crypto
      .createHmac('sha256', subscriber.secret)
      .update(body)
      .digest('hex');

    return await withRetry(() =>
      axios.post(subscriber.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event
        },
        timeout: 5000
      })
    , { maxAttempts: 3 });
  }
  
  // On receiver side — verify signature
  static verifySignature(body, secret, signature) {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
```

---

## 9. Tricky Output Questions

### Output Q1 — Event Loop Order
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
process.nextTick(() => console.log('4'));
console.log('5');

// OUTPUT: 1, 5, 4, 3, 2
// WHY:
// 1, 5 → Synchronous (runs immediately)
// 4    → nextTick (runs before any async)
// 3    → Promise microtask (after nextTick)
// 2    → setTimeout (next event loop tick)
```

---

### Output Q2 — Classic var in Loop
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// OUTPUT: 3, 3, 3
// WHY: var is function-scoped, all callbacks share same `i`

// FIX 1: Use let (block-scoped)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}

// FIX 2: IIFE closure
for (var i = 0; i < 3; i++) {
  ((i) => setTimeout(() => console.log(i), 0))(i); // 0, 1, 2
}

// FIX 3: bind
for (var i = 0; i < 3; i++) {
  setTimeout(console.log.bind(null, i), 0); // 0, 1, 2
}
```

---

### Output Q3 — Promise Chaining
```js
Promise.resolve(1)
  .then(x => x + 1)       // returns 2
  .then(x => { return Promise.resolve(x + 1) }) // returns Promise(3)
  .then(x => console.log(x)); // 3

// OUTPUT: 3
```

---

### Output Q4 — Async/Await + Error
```js
async function getData() {
  throw new Error('Oops');
}

async function main() {
  const result = await getData().catch(err => 'caught: ' + err.message);
  console.log(result);
}

main(); // OUTPUT: caught: Oops
```

---

### Output Q5 — Tricky Closure
```js
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count
  };
}

const counter1 = makeCounter();
const counter2 = makeCounter();

counter1.increment();
counter1.increment();
counter2.increment();

console.log(counter1.value()); // 2
console.log(counter2.value()); // 1
// Each call to makeCounter() creates its own `count` closure
```

---

## Quick Cheat Sheet

| Topic | Key Concept |
|---|---|
| Event Loop Order | sync → nextTick → Promise → setTimeout → setImmediate |
| Streams | 4 types: Readable, Writable, Duplex, Transform |
| Backpressure | pause() on drain event, or use pipeline() |
| LRU Cache | Map (O(1)) or DLL + Map (explicit order control) |
| Redis Cache | setEx for TTL, keys() + del() for invalidation |
| Circuit Breaker | CLOSED → OPEN → HALF_OPEN → CLOSED |
| Retry Backoff | delay = min(initial × 2^attempt, maxDelay) + jitter |
| JWT Middleware | verify in middleware, check blacklist in Redis |
| Rate Limiter | Redis INCR + EXPIRE per window |
| Worker Threads | Use for CPU-bound, NOT for I/O |

---

*Good luck with your interviews! Focus on understanding the WHY behind each pattern, not just the code.*
