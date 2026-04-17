function validateJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 401;

    // decode the payload
    const payloadObj = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // check if required claims exist
    if (!payloadObj.iss || !payloadObj.sub || !payloadObj.exp) {
      return 401;
    }

    // check issuer
    if (payloadObj.iss !== "cmu.edu") return 401;

    // check subject
    const allowed = ["groot", "rocket", "starlord", "gamora", "drax"];
    if (!allowed.includes(payloadObj.sub)) return 401;

    // check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payloadObj.exp < currentTime) {
      return 401;
    }

    return 200;
  } catch (error) {
    return 401;
  }
}

module.exports = { validateJWT };