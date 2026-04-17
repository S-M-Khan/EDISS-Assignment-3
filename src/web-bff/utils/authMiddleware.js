const { validateJWT } = require("./validateJWT");

const authMiddleware = (req, res, next) => {
  // check client type
  const clientType = req.get("X-Client-Type");
  if (!clientType || !["web"].includes(clientType.toLowerCase())) {
    return res.status(400).send();
  }

  // check authorization header
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send();
  }

  // extract and validate token
  const token = authHeader.replace("Bearer ", "");
  const statusCode = validateJWT(token);
  if (statusCode === 401) {
    return res.status(401).send();
  }

  next();
};

module.exports = authMiddleware;
