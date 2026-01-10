const express = require("express");
const crypto = require("crypto");
const Worker = require("webworker-threads").Worker;

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
    // crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    //     res.send("Hi there");
    // });

    const worker = new Worker(function(){
        
    })
});

app.get("/fast", (req, res) => {
    res.send("This was fast");
});

app.listen(3000, () => {
    console.log("Server listening on port 3000");
});
