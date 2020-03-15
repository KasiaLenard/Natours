const fs = require("fs");
const Tour = require("../models/tourModel");

const toursJSON = JSON.parse(
    fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

exports.checkID = (req, res, next, val) => {
    if (req.params.id * 1 > toursJSON.length) {
        return res.status(404).json({
            status: "fail",
            message: "Invalid ID"
        });
    }
    next();
};

exports.checkBody = (req, res, next) => {
    if (!req.body.name || !req.body.price) {
        return res.status(400).json({
            status: "fail",
            message: "Missing name or price"
        });
    }

    next();
};
/*          OTHER WAY
app.get("/", (req, res) => {
     res.status(200).json({
          message: "Hello from the server side!",
          app: "Natours"
     });
});

app.post("/", (req, res) => {
     res.send("You can post to this endpoint...");
});
*/

exports.getAllTours = (req, res) => {
    // console.log(req.requestTime);

    res.status(200).json({
        status: "success",
        requestedAt: req.requestTime

        results: toursJSON.length,
        data: {
            tours: toursJSON
        }
    });
};

exports.getTour = (req, res) => {
    // console.log(req.params);

    const id = req.params.id * 1;
    const tour = toursJSON.find(el => el.id === id);

    res.status(200).json({
        status: "success",
        data: {
    // just    tour    could do the same
            tour: tour
      }
    });
};

exports.createTour = (req, res) => {
    //console.log(req.body);
    const newId = toursJSON[toursJSON.length - 1].id + 1;
    const newTour = Object.assign({ id: newId }, req.body);

    toursJSON.push(newTour);

    fs.writeFile(
        `${__dirname}/dev-data/data/tours-simple.json`,
        JSON.stringify(toursJSON),
        () => {
            res.status(201).json({
                status: "success",
                data: {
                    tour: newTour
                }
            });
        }
    );
};

exports.updateTour = (req, res) => {
    res.status(200).json({
        status: "success",
        data: {
            tour: "<Updated tour here...>"
        }
    });
};

exports.deleteTour = (req, res) => {
    res.status(204).json({
        status: "success",
        data: null
    });
};
