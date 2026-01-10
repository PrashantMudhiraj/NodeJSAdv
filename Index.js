process.env.UV_THREADPOOL_SIZE = 4; 
const cluster = require("cluster");
// const { availableParallelism } = require("node:os");

if (cluster.isPrimary) {
  //   console.log(availableParallelism());
  console.log(`Primary ${process.pid} is running.`);
  cluster.fork();
  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
    console.log(`Worker ${process.pid} started`);
  const express = require("express");
  const crypto = require("crypto");

  const app = express();

  // function doWork(duration) {
  //     const start = Date.now();
  //     //210 - 200 < 40
  //     //230 - 200 < 40
  //     //250 - 200 < 40
  //     while (Date.now() - start < duration) {
  //         // console.log('In while loop')
  //     }
  // }

  app.get("/", (req, res) => {
    // doWork(1000);
    console.log(Date.now())
    crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
      res.send("Hi there");
    });
  });

  app.get("/fast", (req, res) => {
    res.send("This was fast");
  });

  app.listen(3000, () => {
    console.log("Server listening on port 3000");
  });
}
