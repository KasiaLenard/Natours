const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");

const Tour = require("./../../models/tourModel");
const User = require("./../../models/userModel");
const Review = require("./../../models/reviewModel");

dotenv.config({ path: "./config.env" });
//console.log(process.env);

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

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));
const reviews = JSON.parse(
    fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);

// IMPORT DATA INTO DB
const importData = async () => {
    try {
        await Tour.create(tours);
        await User.create(users, { validateBeforeSave: false });
        await Review.create(reviews);
        console.log("Data successfully loaded");
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
    try {
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        console.log("Data successfully deleted");
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

if (process.argv[2] === "--import") {
    importData();
} else if (process.argv[2] === "--delete") {
    deleteData();
}

//console.log(process.argv);
