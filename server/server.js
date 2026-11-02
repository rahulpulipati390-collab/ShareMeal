
require("dns").setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const donationRoutes = require("./routes/donationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing in server/.env");
  process.exit(1);
}

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
  "http://localhost:5180",
  "http://localhost:5181",
  "http://localhost:5182",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5180",
  "http://127.0.0.1:5181",
  "http://127.0.0.1:5182",
];

const envAllowed = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...envAllowed,
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isLocalVite =
      /^http:\/\/(localhost|127\.0\.0\.1):(517\d|518\d)$/.test(origin);

    if (isLocalVite || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log("REQUEST RECEIVED:", req.method, req.url);
  next();
});

app.use("/api/auth", authRoutes);
console.log("AUTH ROUTES MOUNTED");

app.use("/api/donations", donationRoutes);
console.log("DONATION ROUTES MOUNTED");

app.get("/debug", (req, res) => {
  res.json({ message: "Debug route works!" });
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to ShareMeal API!" });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");
    console.log("Database name:", mongoose.connection.name);
    console.log("Database host:", mongoose.connection.host);

    app.listen(PORT, () => {
      console.log(`ShareMeal server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
