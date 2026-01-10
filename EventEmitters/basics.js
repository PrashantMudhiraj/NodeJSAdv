const EventEmitter = require("node:events");

class MyEventEmitter extends EventEmitter {}

const myEventEmitter1 = new MyEventEmitter();
const myEventEmitter2 = new MyEventEmitter();

myEventEmitter2.on("event", (...args) => {
    setImmediate(() => console.log("event2 executed!", args));
});

myEventEmitter2.on("event", (...args) => {
    console.log("event3 executed!", args);
});

myEventEmitter1.on("event", (...args) => {
    console.log("event1 executed!", args);
});

myEventEmitter1.emit("event", 1, 2, 3);
myEventEmitter2.emit("event");
