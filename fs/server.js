const fs = require("fs");
const http = require("http");
const url = require("url");

http.createServer(function (req, res) {
    const q = url.parse(req.url, true);
    const filename = "." + q.pathname;

    fs.readFile(filename, "utf-8", (err, data) => {
        if (err) {
            res.writeHead(404, { "content-type": "text/html" });
            return res.end("File Not Found!");
        } else {
            res.writeHead(200, { "content-type": "text/html" });
            res.write(data);
            return res.end();
        }
    });
}).listen(3000);
