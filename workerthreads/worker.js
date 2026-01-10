import { parentPort, workerData } from "node:worker_threads";
import { createHash } from "node:crypto";

try {
    let counter = 0;

    const result = hasBuffer(workerData.payload.toString());

    for (let i = 0; i < 10_00_000; i++) {
        for (let j = 0; j < i; j++) {
            counter = counter + 1;
        }
    }
    parentPort.postMessage({
        status: "ok",
        result: `${result} ${counter}`,
    });
} catch (error) {
    parentPort.postMessage({ status: "error", message: error.message });
}

function hasBuffer(payload) {
    const hash = createHash("sha256");
    hash.update(payload, "utf-8");
    return hash.digest("hex");
}
