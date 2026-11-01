
const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Rate limiting for authentication endpoints


// Rate limiting for authentication endpoints
const createLimiter = () => rateLimit({
  windowMs: 5 * 1000,
  max: () => (process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 10),
  skip: () => !process.env.ENABLE_RATE_LIMIT_IN_TESTS,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
const signupLimiter = createLimiter();
const loginLimiter = createLimiter();

const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
// Test API
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working!" });
});

// Signup API
router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      });
    }

    if (!["donor", "ngo", "volunteer"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      message: "Account created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    console.error("Signup error:", error.message);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
});

// Login API with JWT authentication
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password.",
      });
    }

    // Use JWT secret from environment or fallback for tests
const JWT_SECRET = process.env.JWT_SECRET || 'ShareMeal_Test_Secret';
// No explicit error handling needed; fallback will be used.


    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      // In production enforce secure flag; in dev allow insecure.
      secure: process.env.NODE_ENV === "production",
      // Use SameSite=None for cross-origin requests (frontend runs on different port).
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Login successful!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
});

// Logout API
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    message: "Logged out successfully!",
  });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Fetch user error:", error.message);

    return res.status(500).json({
      message: "Unable to fetch user details.",
    });
  }
});

console.log("AUTH ROUTES FILE LOADED");

module.exports = router;
