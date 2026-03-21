const { exec } = require("child_process");

exec("node  --version", (error, stdout, stderr) => {
    if (error) {
        console.error(error);
        return;
    }

    if (stderr) {
        console.error(stderr);
        return;
    }

    console.log(stdout);
});
