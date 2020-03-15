const express = require("express");

const tourController = require("./../controllers/tourController");
const authController = require("./../controllers/authController");
const reviewRouter = require("./../routes/reviewRoutes");

const router = express.Router();

// USED WITH JSON 👺
//router.param("id", tourController.checkID);

router.use("/:tourId/reviews", reviewRouter);

router.route("/stats").get(tourController.getTourStats);
router
    .route("/monthly-plan/:year")
    .get(
        authController.protect,
        authController.restrictTo("admin", "lead-guide", "guide"),
        tourController.getMonthlyPlan
    );

router
    .route("/top-5-cheap")
    .get(tourController.aliasTopTours, tourController.getAllTours);

router
    .route("/tours-within/:distance/center/:latlng/unit/:unit")
    .get(tourController.getToursWithin);

router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

router
    .route("/")
    .get(tourController.getAllTours)
    .post(
        authController.protect,
        authController.restrictTo("admin", "lead-guide"),
        tourController.createTour
    );
//.post(tourController.checkBody, tourController.createTour);

router
    .route("/:id")
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo("admin", "lead-guide"),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo("admin", "lead-guide"),
        tourController.deleteTour
    );

module.exports = router;

/*      OTHER WAY
app.get("/api/v1/tours", getAllTours);
app.post("/api/v1/tours", createTour);

// for optional variable in the url do :x?
app.get("/api/v1/tours/:id", getTour);
app.patch("/api/v1/tours/:id", updateTour);
app.delete("/api/v1/tours/:id", deleteTour);
*/
