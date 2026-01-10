// pending operations
/*
 Note: libuv (which Node uses for its threadpool) reads UV_THREADPOOL_SIZE
 from the environment before the Node process starts. Setting
 `process.env.UV_THREADPOOL_SIZE` inside this script does NOT change the
 threadpool size used by native modules (like `crypto.pbkdf2`).

 To change the threadpool size, set the environment variable before
 launching node:
     Windows cmd:   set UV_THREADPOOL_SIZE=5 && node threads.js
     Windows PowerShell: $env:UV_THREADPOOL_SIZE=5; node threads.js
     macOS/Linux:   UV_THREADPOOL_SIZE=5 node threads.js

 The line below was removed to avoid confusion; the script will still
 print `process.env.UV_THREADPOOL_SIZE` so you can see the value visible
 inside the script (not necessarily the threadpool size used by libuv).
*/
// process.env.UV_THREADPOOL_SIZE = 5;
const crypto = require("crypto");

const start = Date.now();

crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    console.log("1:", Date.now() - start);
});

crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    console.log("2:", Date.now() - start);
});

crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    console.log("3:", Date.now() - start);
});
crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    console.log("4:", Date.now() - start);
});

crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
    console.log("5:", Date.now() - start);
});

// crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
//     console.log("6:", Date.now() - start);
// });
// crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
//     console.log("7:", Date.now() - start);
// });
// crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
//     console.log("8:", Date.now() - start);
// });
// crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
//     console.log("9:", Date.now() - start);
// });
// crypto.pbkdf2("a", "b", 100000, 512, "sha512", () => {
//     console.log("10:", Date.now() - start);
// });
