// const data = "Prashant";

// Buffer.alloc(0);
// const bufferData = Buffer.from(data);
// console.log(bufferData);
// console.log(bufferData.toString());

const fs = require("fs");
const { pipeline } = require("stream/promises");

const read = fs.createReadStream("./async.js");
const write = fs.createWriteStream("./async.txt");

// read.pipe(write);

// fs.readFile("./async.txt", "utf8", (err, data) => {
//     if (err) console.log(err);
//     console.log(data);
// });

async function copy() {
    try {
        await pipeline(read, write);
        console.log("Copy successful");
    } catch (err) {
        console.error("Pipeline failed:", err);
    }
}

copy();
