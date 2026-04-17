const { validateJWT } = require("./validateJWT");

const authBackend = (req, res, next) => {
  // check JWT ONLY, no client-type check
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send();
  }

  const token = authHeader.replace("Bearer ", "");
  if (validateJWT(token) !== 200) {
    return res.status(401).send();
  }

  next();
};

module.exports = authBackend;
