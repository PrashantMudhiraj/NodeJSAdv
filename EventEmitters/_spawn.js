const { spawn } = require("child_process");

const child = spawn("cmd", ["/c", "dir"]);

child.stdout.on("data", (data) => console.log(data.toString()));
child.stderr.on("error", (err) => console.error(err));
child.on("error", (err) => console.error(err));
