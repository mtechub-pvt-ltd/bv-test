import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;

export const verification = async function (req, res, next) {
  const t = req.headers["authorization"];
  let token = null;
  if (t) {
    const bearer = t.split(" ");
    token = bearer[1];
  } else {
    return res.status(404).json({ statusCode: 404, message: "token not found" });
  }
  if (!token) {
    return res.status(404).json({ statusCode: 404, message: "token not found" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(400).json({ statusCode: 400, message: "invalid token" });
  }
};
export const optionalVerification = async function (req, res, next) {
  const t = req.headers["authorization"];
  let token = null;
  if (t) {
    const bearer = t.split(" ");
    token = bearer[1];
  } else {
    return next();
  }
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(400).json({ statusCode: 400, message: "invalid token" });
  }
};
