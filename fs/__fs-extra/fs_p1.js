// Go through this github to know more about fs-extra
// https://github.com/jprichardson/node-fs-extra/tree/e2615e501e7b261b832170b3eb7e26c82668b215/docs
const fse = require("fs-extra");

async function copyFile(params) {
    try {
        await fse.copy("../app.log", "../app_dup.log"); // file copy
        await fse.copy("../__fs-extra", "../copyfsextra"); // dir copy
    } catch (error) {
        console.log(error);
    }
}

async function emptyDir(params) {
    try {
        await fse.emptyDir("../copyfsextra");
    } catch (error) {
        console.log(error);
    }
}

// emptyDir();
// copyFile();
