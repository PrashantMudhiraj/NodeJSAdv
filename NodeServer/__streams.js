const e = require("express");
const fs = require("fs");
const { Duplex, Transform } = require("stream");
const { pipeline } = require("stream/promises");

const fsPromises = fs.promises;

async function basic() {
    let data = "";

    /**
 -> File opened
 -> Buffer allocated (highWaterMark)
 -> Os fill buffer
 -> data event emitted
 -> Repeat
 */
    const readable = fs.createReadStream("./test.txt");

    // readable.on("data", (chuck) => {
    //     // console.log(chuck);
    //     data = data + chuck;
    //     // console.log(chuck)
    // });

    // readable.on("error", console.log);

    // readable.on("end", () => {
    //     console.log("Stream finished. Final data:");
    //     console.log(data);
    // });

    const writable = fs.createWriteStream("./out.txt");
    // writable.write("Hello \n");
    // writable.write("world ");
    // writable.end();

    // stream.pipe(writable);

    process.stdin.pipe(writable);

    //or
    readable.on("data", (chuck) => {
        const isWriting = writable.write(chuck);
        if (!isWriting) {
            readable.pause();
        }
        console.log(chuck);
    });

    writable.on("drain", () => {
        readable.resume();
    });
}

basic();
// Web sockets -> to and fro communication, But both read and write are independent
async function __duplex(params) {
    try {
        const duplex = new Duplex({
            read(size) {
                this.push("Hello ");
                this.push("World \n");
                this.push(null);
            },
            write(chuck, encoding, cb) {
                console.log("Received : " + chuck);
                cb();
            },
        });
        duplex.pipe(process.stdout);
        duplex.write("From Client");
    } catch (error) {
        console.log(error);
    }
}

// __duplex();

async function __transform(params) {
    try {
        const upper = new Transform({
            transform(chuck, encoding, cb) {
                this.push(chuck.toString().toUpperCase());
                process.stdout.write("."); // progress -> every dot(.) for chuck -> can also define the length of buffer(no of dots)
                cb();
            },
        });

        await pipeline(
            fs.createReadStream("./stream.txt"),
            upper,
            fs.createWriteStream("./out.txt")
        );
    } catch (error) {
        console.log(error);
    }
}

// __transform();
