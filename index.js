const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// 1. Standard Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://scholarstream-2cf8d.web.app"],
    credentials: true,
  })
);

app.use("/scholarships", require("./routes/scholarship"));
app.use("/applications", require("./routes/application"));
app.use("/payments", require("./routes/payment"));
app.use("/reviews", require("./routes/review"));
app.use("/stats", require("./routes/stats"));
app.use("/users", require("./routes/user"));
app.use("/", require("./routes/auth"));

app.use((err, req, res, next) => {
  console.error("Server Error Stack:", err.stack);
  res.status(500).send({ message: "Internal Server Error", error: err.message });
});

app.get("/", (req, res) => res.send("ScholarStream API is running... 🚀"));

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});