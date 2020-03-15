const multer = require("multer");
const sharp = require("sharp");

const Tour = require("../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, file);
    } else {
        cb(
            new AppError("Not an image! Please upload only images.", 400),
            false
        );
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

// when multiple with the same name:
// upload.array("images", 5);

exports.uploadTourImages = upload.fields([
    { name: "imageCover", mexCount: 1 },
    { name: "images", maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    // Cover Image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // Images
    req.body.images = [];

    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i +
                1}.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat("jpeg")
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    next();
});

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = "5";
    req.query.sort = "-ratingsAverage,price";
    req.query.fields = "name,price,ratingsAverage,summary,difficulty";
    next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, "reviews");

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                //_id: "$ratingsAverage",
                _id: { $toUpper: "$difficulty" },
                numTours: { $sum: 1 },
                numRatings: { $sum: "$ratingsQuantity" },
                avgRating: { $avg: "$ratingsAverage" },
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" }
            }
        },
        {
            $sort: { avgPrice: 1 }
        }
        // {
        //     $match: { _id: { $ne: "EASY" } }
        // }
    ]);
    res.status(200).json({
        status: "success",
        data: stats
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
        {
            $unwind: "$startDates"
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$startDates" },
                numTourStarts: { $sum: 1 },
                month: { $push: "$_id" },
                tours: { $push: "$name" }
            }
        },
        {
            $addFields: { month: "$_id" }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: { numTourStarts: -1 }
        },
        {
            $limit: 12
        }
    ]);
    res.status(200).json({
        status: "success",
        data: plan
    });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",");

    // if unit is "miles" then distance / ... else distance / ...
    const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        return next(
            new AppError("Please specify your location in format lat,lng.", 400)
        );
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });
    console.log(distance, lat, lng, unit);

    res.status(200).json({
        status: "success",
        results: tours.length,
        data: {
            data: tours
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",");

    const multiplier = unit === "mi" ? 0.000621371 : 0.001;

    if (!lat || !lng) {
        return next(
            new AppError("Please specify your location in format lat,lng.", 400)
        );
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: "distance",
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: "success",
        results: distances.length,
        data: {
            data: distances
        }
    });
});

// exports.getAllTours = catchAsync(async (req, res, next) => {
//     // BUILD A QUERY
//     // 1) Filtering
//     // const queryObj = { ...req.query };
//     // const excludedFields = ["page", "sort", "limit", "fields"];
//     // excludedFields.forEach(el => delete queryObj[el]);

//     // // 2) Advanced Filtering
//     // let queryStr = JSON.stringify(queryObj);
//     // queryStr = queryStr.replace(
//     //     /\b(gte|gt|lte|lt)\b/g,
//     //     match => `$${match}`
//     // );

//     // let query = Tour.find(JSON.parse(queryStr));

//     // SORTING
//     // if (req.query.sort) {
//     //     const sortBy = req.query.sort.split(",").join(" ");
//     //     query = query.sort(sortBy);
//     // } else {
//     //     query = query.sort("-createdAt");
//     // }

//     // SELECTING FIELDS
//     // if (req.query.fields) {
//     //     const limitBy = req.query.fields.split(",").join(" ");
//     //     console.log(limitBy);
//     //     query = query.select(limitBy);
//     // } else {
//     //     query = query.select("-__v");
//     // }

//     // PAGINATION
//     // const page = req.query.page * 1 || 1; //default ||
//     // const limit = req.query.limit * 1 || 100;
//     // const skip = (page - 1) * limit;

//     // query = query.skip(skip).limit(limit);

//     // if (req.query.page) {
//     //     const numTours = await Tour.countDocuments();
//     //     if (skip >= numTours) throw new Error("This page does not exist.");
//     // }

//     // EXECUTE QUERY
//     const features = new APIFeatures(Tour.find(), req.query)
//         .filter()
//         .sort()
//         .limitFields()
//         .paginate();
//     const tours = await features.query;

//     // const tours = await (await Tour.find().where("duration"))
//     //     .lt(5)
//     //     .where("difficulty")
//     //     .equals("easy");

//     // SEND RESPONSE
//     res.status(200).json({
//         status: "success",
//         results: tours.length,
//         data: {
//             tours
//         }
//     });
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//     // const newTour = new Tour({});
//     // newTour.save();
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//         status: "success",
//         data: {
//             tour: newTour
//         }
//     });

//     // try {

//     // } catch (err) {
//     //     res.status(400).json({
//     //         status: "fail",
//     //         message: err
//     //     });
//     // }
// });
