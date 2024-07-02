const jwt = require("jsonwebtoken");
const { isBlacklisted } = require("../controllers/tokenBlacklist");
const secretKey = "test"; // Use a secure key or environment variable

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token not provided" }); // No token provided
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({ message: "Unauthorized" }); // Token is blacklisted
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" }); // Invalid token
    }
    req.user_id = decoded.userId; // Extract userId from the token payload
    next();
  });
};

module.exports = authenticateToken;
