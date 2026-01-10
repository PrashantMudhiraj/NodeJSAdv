const express = require("express");
const app = express();
const PORT = 4000;

app.get("/", (req, res) => {
    res.send("Hello World!").status(200);
});

app.use((req, res) => {
    res.redirect("/");
});

app.listen(PORT, () => {
    console.log("App running on port : " + PORT);
});
