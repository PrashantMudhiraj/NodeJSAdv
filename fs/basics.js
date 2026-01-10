const fs = require("fs");

//synchronous read
// const readSync = fs.readFileSync("./basics.js", "utf-8");
// console.log(readSync);

//asynchronous read
// fs.readFile("./basics.js", "utf-8", (error, data) => {
//     if (error) return error.message;
//     else console.log(data);
// });

//synchronous write
fs.writeFileSync("./demo.txt", "Hi Prashant");

fs.writeFile("./demo.txt", " Chevula", { flag: "a" }, (error) => {
    if (error) return error.message;
    else console.log("File Written !");
});
