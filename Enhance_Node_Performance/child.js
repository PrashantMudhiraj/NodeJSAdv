const crypto = require("crypto");

// child.js
process.on("uncaughtException", (err) => {
    // Report the exact error (TypeError: crypto.pbkdf2 is not a function) to parent
    if (process.send) {
        process.send({
            type: "error",
            message: err.message,
            stack: err.stack,
        });
    }
    // ALWAYS exit after an uncaught exception in 2026 to prevent "undefined state"
    process.exit(1);
});

process.on("message", (msg) => {
    console.log(msg);
});

function doWork() {
    for (let i = 0; i < 1000; i++) {
        for (let j = 0; j < i * 2; j++) {
            crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {});
        }
    }
    process.send({ status: "done", message: "created hash", pid: process.pid });
}

doWork();
process.on("error", (err) => {
    process.send({ type: "error", message: err.message, stack: err.stack });
});
