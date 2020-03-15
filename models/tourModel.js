const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
//const User = require("./userModel");

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A tour must have a name"],
            unique: true,
            trim: true,
            maxlength: [40, "A tour has to have at least 40 characters"],
            minlength: [10, "A tour has to have more than 10 characters"]
            //validate: [validator.isAlpha,"Tour name should only contain characters"]
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, "A tour must have a duration"]
        },
        maxGroupSize: {
            type: Number,
            required: [true, "A tour must have a group size"]
        },
        difficulty: {
            type: String,
            required: [true, "A tour should have a difficulty"],
            enum: {
                values: ["easy", "medium", "difficult"],
                message: "Difficulty is either easy, medium or difficult"
            }
        },
        price: {
            type: Number,
            required: [true, "A tour must have a price"]
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function(val) {
                    // this only points to current doc on the NEW document creation
                    return val < this.price;
                },
                message:
                    "Discount price ({VALUE}) should be below the regular price"
            }
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, "The rating must be above 1.0"],
            max: [5, "The rating must be below 5.0"],
            set: val => Math.round(val * 10) / 10
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        summary: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            required: [true, "A tour must have a discription"]
        },
        imageCover: {
            type: String,
            required: [true, "A tour must have a cover image"]
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false
        },
        startLocation: {
            //GeoJSON
            type: {
                type: String,
                default: "Point",
                enum: ["Point"]
            },
            coordinates: [Number],
            address: String,
            description: String
        },
        locations: [
            {
                type: {
                    type: String,
                    default: "Point",
                    enum: ["Point"]
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number
            }
        ],
        //     guides: Array
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); //-1 descending order
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// in normal functions we use "this."
tourSchema.virtual("durationWeeks").get(function() {
    return this.duration / 7;
});

// Virtual populate - in reviews it's called tour and same thing in here (local) is called _id
tourSchema.virtual("reviews", {
    ref: "Review",
    foreignField: "tour",
    localField: "_id"
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre("save", function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// tourSchema.pre("save", async function(next) {
//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// tourSchema.post("save", function(doc, next) {
//     console.log(doc);
//     next();
// });

// QUERY MIDDLEWARE
// /^find/ - all the strings that start with find
tourSchema.pre(/^find/, function(next) {
    //tourSchema.pre("find", function(next) {
    this.find({ secretTour: { $ne: true } });

    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function(next) {
    this.populate({
        path: "guides",
        select: "-__v -passwordChangedAt"
    });
    next();
});

tourSchema.post(/^find/, function(docs, next) {
    console.log(`Query took ${Date.now() - this.start} milliseconds!`);
    //console.log(docs);
    next();
});

// AGGREGATION MIDDLEWARE - to not repeat the code
// tourSchema.pre("aggregate", function(next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//     console.log(this.pipeline);
//     next();
// });

// Models = capital letter
const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
