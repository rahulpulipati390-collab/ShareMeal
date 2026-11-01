
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session. Please log in again.",
    });
  }
}

module.exports = authMiddleware;
