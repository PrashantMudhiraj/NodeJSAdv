import express from "express";

import { Worker } from "node:worker_threads";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/non-blocking/", (req, res) => {
    res.status(200).send("This page is non-blocking");
});

app.get("/blocking", async (req, res, next) => {
    try {
        const buf = Buffer.from("Hello this is sample text !!!!!!!!!", "utf-8");
        const hash = await runWorker({
            payload: buf.buffer.slice(
                buf.byteOffset,
                buf.byteOffset + buf.byteLength
            ),
        });

        res.json({ hash });
    } catch (error) {
        next(error);
    }
});

function runWorker(workerData) {
    return new Promise((resolve, reject) => {
        let settled = false;

        // Will create a new thread within same process, use IPC for communication between threads and shared libuv(thread pool -> no use)
        // worker thread are used to run javascript code in parallel on multi thread within same Node.js process
        // these are strictly used only for javascript code
        // terminate the thread once task is done
        // const worker = new Worker("./worker.js", { workerData });
        const worker = new Worker("./worker.js");

        worker.postMessage(workerData.payload, [workerData.payload]);

        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            worker.terminate();
            reject(new Error("Worker timeout!"));
        }, 10_000);

        function safeResolve(value) {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            worker.terminate();
            resolve(value);
        }

        function safeReject(value) {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            worker.terminate();
            reject(value);
        }

        worker.once("message", (data) => {
            if (data.status === "ok") safeResolve(data.result);
            else safeReject(data.message);
        });

        worker.once("error", (err) => {
            safeReject(new Error(err.message));
        });

        worker.once("exit", (code) => {
            if (code !== 0) {
                safeReject(new Error(`Worker exited with code ${code}`));
            }
        });
    });
}
app.use((error, req, res, _next) => {
    res.status(500).json({ error: error.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
