const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", err => {
    console.log(err.name, err.message, err.stack);
    console.log("UNCAUGHT REJECTION! Shutting down...");

    process.exit(1);
});

dotenv.config({ path: "./config.env" });
//console.log(process.env);

const app = require("./app");

let DB = process.env.DATABASE;
DB = DB.replace("<PASSWORD>", process.env.PASSWORD);
DB = DB.replace("<USERNAME>", process.env.USER);

mongoose
    //.connect(process.env.DATABASE_LOCAL, {
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then(con => console.log("DB Connection Successful!"));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", err => {
    console.log(err.name, err.message);
    console.log("UNHANDLER REJECTION! Shutting down...");
    server.close(() => {
        process.exit(1);
    });
});
