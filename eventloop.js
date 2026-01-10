//node myFile.js

const pendingTimers = [];
const pendingOSTasks = [];
const pendingOperations = [];

//New timers, tasks, and operations are recorded from myFile running
myFile.runContents();

function shouldContinue() {
    //check one : Any pending setTimeout, setImmediate and setInterval
    //check two : Any pending OS tasks? (like server listening to port)
    //check three : Any pending long running operations (like fs module)

    return pendingTimers.length || pendingOSTasks.length || pendingOperations.length
}

//Entire body executes in one 'tick' (EventLoop)
while(shouldContinue()) {
    // 1) Node looks at pendingTimers and sees if any functions are ready to be called. setTimeout, setInterval

    // 2) Node looks at pendingOperations and pendingOSTasks and calls relevant callbacks

    // 3) pause execution. Continue when...
    // - a new pendingOsTask is done
    // - a new pendingOperations is done
    // - a timer os about to complete 

    // 4) Loot at pendingTimers. Call any setImmediate 

    // 5) Handle any 'close' events
}

//exit back to terminal