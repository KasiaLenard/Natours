const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A user must have a name"],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, "A user must have an email."],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please provide a valid email."]
    },
    photo: {
        type: String,
        default: "default.jpg"
    },
    role: {
        type: String,
        enum: ["user", "guide", "lead-guide", "admin"],
        default: "user"
    },
    password: {
        type: String,
        required: [true, "A user must have a password"],
        minlength: [8, "A password must have min 8 characters"],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm the password"],
        validate: {
            // this only works on CREATE & SAVE
            validator: function(el) {
                return el === this.password;
            },
            message: "Passwords must be the same"
        }
    },
    passwordChangedAt: {
        type: Date,
        default: Date.now()
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre("save", async function(next) {
    // only run this function if password was modified
    if (!this.isModified("password")) return next();

    // hash the password and delete the passconfirm
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre("save", function(next) {
    if (!this.isModified("password") || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function(next) {
    // this points to current query
    this.find({ active: { $ne: false } });
    next();
});

userSchema.methods.correctPassword = async function(
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    console.log({ resetToken }, this.passwordResetToken);

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
