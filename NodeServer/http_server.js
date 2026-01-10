const http = require("http");
const fs = require("fs");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const fsPromises = fs.promises;

const server = http.createServer(async function (req, res) {
    try {
        const { url, method } = req;

        if (url === "/") {
            await FileOperations("default");
            res.writeHead(200, { "content-type": "text/plain" });
            const data = await fsPromises.readFile("./stream.txt");
            return res.end(data);
        }

        if (url === "/image") {
            // const data = await FileOperations("image");
            res.writeHead(200, { "content-type": "image/png" });
            fs.createReadStream("./image.png").pipe(res);
            return;
            // return res.end();
        }

        if (url === "/delete") {
            await FileOperations("delete");
            res.writeHead(200, { "content-type": "text/html" });
            return res.end("File Deleted!");
        }

        // if (url === "/write") {
        //     const data = await FileOperations("write", req);
        //     res.writeHead(200, { "content-type": "text/html" });
        //     return res.end(data);
        // }

        res.writeHead(404);
        res.end(http.STATUS_CODES[404]);
    } catch (error) {
        console.error("Request Error:", error.message);

        // Ensure we only send a response if headers haven't been sent yet
        if (!res.headersSent) {
            res.writeHead(500, { "content-type": "text/plain" });
            res.end("Internal Server Error");
        }
    }
});

server.listen(3000, () => {
    console.log("App running on port 3000");
});

async function FileOperations(op, req) {
    // const fs = require("fs");
    try {
        switch (op) {
            case "delete":
                await fsPromises.unlink("./stream.txt");
                break;
            case "image":
                return await fsPromises.readFile("./image.png");
            // case "write":
            //     let body;
            //     req.setEncoding("utf-8");
            //     req.on("data", (chuck) => {
            //         body += chuck;
            //     });

            //     req.on("end", () => {
            //         return JSON.parse(body);
            //     });

            //     req.on("error", console.error);
            case "default":
            default:
                // await fs.writeFile("./test.txt", "data123@123", "utf-8");
                // const stat = await fsPromises.stat("./stream.txt");
                // // console.log(stat);
                // const data = await fsPromises.readFile("./server.js");
                // console.log(data.toString());

                const streamData = Array(1000)
                    .fill("")
                    .map((_, i) => `${`${i}`.repeat(100)} \n`);
                const readableData = Readable.from(streamData);
                const writableData = fs.createWriteStream("./stream.txt");

                await pipeline(readableData, writableData);
                break;
        }
    } catch (error) {
        // console.log(error);
        throw error;
    }
}
