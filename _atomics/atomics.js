const data = Buffer.from("hello world");

const arrBuff = new SharedArrayBuffer(data.length);
const a = new Uint8Array(arrBuff);

a.set(data);

console.log(Buffer.from(a).toString()); //hello world
//----------------------------------------------------------------------------
//or
// 4 bytes for Int32 flag + data bytes
const sab2 = new SharedArrayBuffer(4 + data.length);
/**
 * Byte 0–3   → control flag (Int32)
 * Byte 4–N   → payload data (Uint8 bytes)
 * first 4 bytes = traffic signal, rest = actual data
 */

// control channel - flag
const control = new Int32Array(sab2, 0, 1);
/**
 * sab2 → shared memory buffer
 * 0 → byte offset (start at byte 0)
 * 1 → number of elements (1 × 4 bytes)
 */

// data channel
const payload = new Uint8Array(sab2, 4);
/**
 * same SharedArrayBuffer
 * Starts at byte offset 4
 * Each element = 1 byte
 */

//copy bytes from buffer data
payload.set(data); // main thread

// signal data is ready
Atomics.store(control, 0, 1); // main thread

/**
 * Meaning
 * Atomically set control[0] = 1
 * Guarantees:
 *      Visibility: all previous writes (payload.set) are visible
 *      Ordering: happens-before any Atomics.wait unblocks
 */

//Wake up waiting threads
Atomics.notify(control, 0); // main thread

// wait until writer signals
console.log(Atomics.wait(control, 0, 0)); // this should be  in worker
/**
 * What this means
 * If control[0] === 0
 * Block the thread (sleep) (not ready)
 * If control[0] !== 0
 * Return immediately (ready)
 *
 * Return values:
 * "ok" → notified
 * "not-equal" → value already changed
 * "timed-out" → timeout (if provided)
 */

console.log(Buffer.from(payload).toString());

//----------------------------------------------------------------------------
const sab = new SharedArrayBuffer(64);

const arr = new Int32Array(sab);

console.log(arr);

console.log(arr[0]); // 0
console.log(Atomics.add(arr, 0, 10)); // 0 -> return old value
console.log(Atomics.load(arr, 0)); // 10

console.log(Atomics.and(arr, 0, 1)); // 10 -> return old value
console.log(Atomics.load(arr, 0)); // 0

/**
 * const sab = new SharedArrayBuffer(1024);
const ta = new Uint8Array(sab);

ta[0]; // 0
ta[0] = 5; // 5

Atomics.add(ta, 0, 12); // 5
Atomics.load(ta, 0); // 17

Atomics.and(ta, 0, 1); // 17
Atomics.load(ta, 0); // 1

Atomics.compareExchange(ta, 0, 5, 12); // 1
Atomics.load(ta, 0); // 1

Atomics.exchange(ta, 0, 12); // 1
Atomics.load(ta, 0); // 12

Atomics.isLockFree(1); // true
Atomics.isLockFree(2); // true
Atomics.isLockFree(3); // false
Atomics.isLockFree(4); // true

Atomics.or(ta, 0, 1); // 12
Atomics.load(ta, 0); // 13

Atomics.store(ta, 0, 12); // 12

Atomics.sub(ta, 0, 2); // 12
Atomics.load(ta, 0); // 10

Atomics.xor(ta, 0, 1); // 10
Atomics.load(ta, 0); // 11
 */
