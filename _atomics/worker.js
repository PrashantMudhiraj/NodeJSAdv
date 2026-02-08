import { workerData } from "worker_threads";

const sab = workerData;
const flag_bytes = 4;
const req_bytes = 32;
const res_bytes = 32;

const flag = new Int32Array(sab, 0, 1);
const req = new Uint8Array(sab, flag_bytes, req_bytes);
const res = new Uint8Array(sab, flag_bytes + req_bytes, res_bytes);

Atomics.wait(flag, 0, 0);

const message = Buffer.from(req).toString().trim();
let counter = 0;
for (let i = 0; i < 1_00_000; i++) {
    for (let j = 0; j < i; j++) {
        counter++;
    }
}
console.log("Worker received : " + message + " " + counter);

const response = Buffer.from("pong");
res.set(response);

Atomics.store(flag, 0, 2);
Atomics.notify(flag, 0);
