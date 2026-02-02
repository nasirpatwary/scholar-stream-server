const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === "production";

router.post("/login", (req, res) => {
  const { email } = req.body;
  const token = jwt.sign({ email }, process.env.JWT_SECRET_TOKEN, { expiresIn: "365d" });
  
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }).send({ success: true });
});

router.get("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: isProd, sameSite: isProd ? "None" : "Lax" })
     .send({ message: "Logged out" });
});

module.exports = router;