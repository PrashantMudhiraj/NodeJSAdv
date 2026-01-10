const EventEmitter = require("node:events");

const emitter = new EventEmitter();

emitter.once("newListener", (event, listener) => {
    if (event === "event") {
        emitter.on("event", () => {
            console.log("Listener A");
        });
    }
});

emitter.on("event", () => {
    console.log("Listener B");
});

emitter.emit("event");
emitter.emit("event");
emitter.emit("event");
