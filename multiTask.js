const https = require("https");
const crypto = require("crypto");
const fs = require("fs");

const start = Date.now();

function doRequest() {
    https
        .request("https://google.com", (res) => {
            res.on("data", () => {});
            res.on("end", () => {
                console.log("HTTP:", Date.now() - start);
            });
        })
        .end();
}

function doHash() {
    // crypto used thread pool
    crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
        console.log("Hash:", Date.now() - start);
    });
}

// setTimeout(() => {
//     console.log("settimeout");
// }, 500);

doRequest();

// we call fs.readFile
// Node get some 'stats' on the file (require HD access)
// HD accessed, stats returned
// Node requested to read the file
// HP accessed, file contents streamed back to app
// Node return file contents to us
fs.readFile("multiTask.js", "utf8", () => {
    console.log("FS:", Date.now() - start);
});

doHash();
doHash();
doHash();
doHash();
// doHash();
// doHash();
