const crypto = require("crypto");
const { promisify } = require("util");
const JWT = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");

const signToken = id => {
    return JWT.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

    res.cookie("JWT", token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user: user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });

    const url = `${req.protocol}://${req.get("host")}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // if email and password exists
    if (!email || !password) {
        return next(new AppError("Please provide email and password", 400));
    }

    // check if user exists && password is correct
    const user = await User.findOne({ email }).select(`+password`);

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password", 401));
    }

    // if all ok -> send token
    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.cookie("JWT", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: "success" });
};

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.JWT) {
        try {
            // verify the token
            const decoded = await promisify(JWT.verify)(
                req.cookies.JWT,
                process.env.JWT_SECRET
            );

            // check if user exists
            const currentUser = await User.findById(decoded.id);

            if (!currentUser) {
                return next();
            }

            // check if user changed password after token was issued
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.protect = catchAsync(async (req, res, next) => {
    // Get token and check if it exists
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.JWT) {
        token = req.cookies.JWT;
    }

    if (!token) {
        return next(
            new AppError(
                "You are not logged in. Please login to get access",
                401
            )
        );
    }

    // verify the token
    const decoded = await promisify(JWT.verify)(token, process.env.JWT_SECRET);

    // check if user exists
    const freshUser = await User.findById(decoded.id);

    if (!freshUser) {
        return next(new AppError("The user no longer exist", 401));
    }

    // check if user changed password after token was issued
    if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError("User recently changes password. Log in again.", 401)
        );
    }

    // Grant access to protected route
    req.user = freshUser;
    res.locals.user = freshUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You do not have permission to perform this action!",
                    403
                )
            );
        }

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError("There is no user with that email", 404));
    }

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send it to users email
    try {
        const resetURL = `${req.protocol}://${req.get(
            "host"
        )}/api/v1/users/resetPassword/${resetToken}`;

        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: "success",
            message: "Token sent to email!"
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                "There was an error sending the email. Try again later.",
                500
            )
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // if token has not expired and there is a user set New Password
    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Update changedPasswordAt property for the user
    // Log the user in, send JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // get user from collection
    const user = await User.findById(req.user.id).select("+password");

    // check if password is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError("Your current password is wrong", 401));
    }

    // if yes - update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // log in nad send JWT
    createSendToken(user, 200, res);
});
