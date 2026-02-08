const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const fs = require("fs").promises;

async function readFile() {
    try {
        const data = await fs.readFile("./demo.txt", "utf-8");
        console.log(data);
    } catch (error) {
        console.log(error);
    }
}

// readFile();

//or

// const { promisify } = require("util");

// const readFileAsync = promisify(require("fs").readFile);

// async function readWithPromisify() {
//     try {
//         const data = await readFileAsync("./demo.txt", "utf-8");
//         console.log(data);
//     } catch (error) {
//         console.log(error);
//     }
// }

async function writeFileAsync() {
    try {
        await fs.writeFile("./demo.txt", "New Text");

        const data = { name: "Prashant", age: 26, location: "Hyderabad" };
        await fs.writeFile(
            "data.json",
            JSON.stringify(data, null, "\t"), // (value , replacer , space(tab))
            "utf-8"
        );

        console.log("File Written!");
    } catch (error) {
        console.log(error);
    }
}

async function appendToFile(params) {
    try {
        const logEntry = `${new Date().toISOString()} Application Started.`;
        await fs.appendFile("app.log", logEntry, "utf-8");
        console.log("logs added");
    } catch (error) {}
}

async function writeWithFileHandle(params) {
    let filehandle;
    try {
        filehandle = await fs.open("./demo.txt", "w");
        await filehandle.write("first line \n");
        await filehandle.write("second line \n");
    } catch (error) {
        console.log(error);
    } finally {
        if (filehandle) await filehandle.close();
    }
}

async function WriteLargeFile(params) {
    const fs = require("fs");
    const data = Array(1000)
        .fill()
        .map((_, i) => `Line ${i + 1} :  ${"x".repeat(100)}\n`);
    const readableData = Readable.from(data);
    const writableData = fs.createWriteStream("large.txt");
    try {
        await pipeline(readableData, writableData);
    } catch (error) {
        console.log(error);
    }
}
// readFile();
// readWithPromisify();
// writeFileAsync();
// appendToFile();
// writeWithFileHandle();
WriteLargeFile();
