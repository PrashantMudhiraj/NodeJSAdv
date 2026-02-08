import { parentPort } from "node:worker_threads";
import { createHash } from "node:crypto";

parentPort.on("message", (arrBuff) => {
    try {
        const buffer = Buffer.from(arrBuff);
        console.log(buffer.toString());

        // CPU-heavy work
        let counter = 0;
        for (let i = 0; i < 1_00_000; i++) {
            for (let j = 0; j < i; j++) {
                counter++;
            }
        }

        const hash = hashBuffer(buffer);

        parentPort.postMessage({
            status: "ok",
            result: `${hash} ${counter}`,
        });
    } catch (error) {
        parentPort.postMessage({
            status: "error",
            message: error.message,
        });
    }
});

function hashBuffer(payload) {
    const hash = createHash("sha256");
    hash.update(payload);
    return hash.digest("hex");
}
