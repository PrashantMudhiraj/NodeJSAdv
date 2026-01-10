const crypto = require("crypto");
const total = 60;
const windowMs = 50; // time window to consider "simultaneous" finishes
let finished = 0;
let finishTimes = [];
let maxSimultaneousFinishes = 0;
const start = Date.now();

for (let i = 0; i < total; i++) {
    crypto.pbkdf2("a", "b", 200000, 64, "sha512", () => {
        const t = Date.now();
        finishTimes.push(t);
        // count finishes within the last `windowMs`
        const recent = finishTimes.filter((x) => t - x <= windowMs).length;
        if (recent > maxSimultaneousFinishes) maxSimultaneousFinishes = recent;

        finished++;
        if (finished === total) {
            console.log("Elapsed:", Date.now() - start, "ms");
            console.log(
                "Observed max concurrent finishes (approx):",
                maxSimultaneousFinishes
            );
            console.log(
                "process.env.UV_THREADPOOL_SIZE:",
                process.env.UV_THREADPOOL_SIZE || 4
            );
            console.log(
                "Note: if env var is undefined, libuv defaults to 4 threads."
            );
        }
    });
}
