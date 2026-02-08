import { Worker } from "worker_threads";

const request = Buffer.from("ping");

const flag_bytes = 4;
const req_bytes = 32;
const res_bytes = 32;

const sab = new SharedArrayBuffer(flag_bytes + req_bytes + res_bytes);

const flag = new Int32Array(sab, 0, 1);
const req = new Uint8Array(sab, flag_bytes, req_bytes);
const res = new Uint8Array(sab, flag_bytes + req_bytes, res_bytes);

// console.log(sab, flag, req, res);

new Worker("./worker.js", { workerData: sab });

req.set(request);

//request set
Atomics.store(flag, 0, 1);
Atomics.notify(flag, 0);

//waiting from response
Atomics.wait(flag, 0, 1);

console.log("Parent received : " + Buffer.from(res).toString().trim());

//reset
Atomics.store(flag, 0, 0);
Atomics.notify(flag, 0);
