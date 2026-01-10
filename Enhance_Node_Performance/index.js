const cluster = require("cluster");
const os = require("node:os");
const crypto = require("crypto");
const { fork } = require("node:child_process");

// //Check running on master mode
// if (cluster.isPrimary) {
//     console.log(os.cpus().length);
//     cluster.fork(); //Cause index.js to be executed again, but in child mode
//     // cluster.fork();
//     // cluster.fork();
//     // cluster.fork();

//     cluster.on("exit", (worker) => {
//         console.log(worker.process.pid);
//     });
// } else {
//Im a child, Im going to act like a server and do nothing
const express = require("express");

const app = express();

app.get("/", (req, res) => {
    console.log("GET /");

    const child = fork("./child.js");
    const child1 = fork("./child.js");

    child.on("message", (msg) => {
        console.log(msg);
        if (msg.type == "error") res.send("Task Failed " + msg.stack);
        else res.send("Task Completed " + msg?.message);
    });

    child1.on("message", (msg) => {
        console.log(msg);
    });

    child.on("error", (error) => {
        res.send("Task failed" + error);
    });

    child.send("hello from parent!");
});
app.get("/fast", (req, res) => {
    console.log("GET /fast");
    res.send("fast");
});

app.listen(3000, () => {
    console.log("app listening to port 3000");
});
// }
