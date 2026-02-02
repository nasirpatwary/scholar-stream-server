const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const { userCollection, ObjectId } = require("../config/db");
const router = express.Router();

router.get("/all/:email", verifyToken, isAdmin, async (req, res) => {
  const { email } = req.params;
  const query = { email: { $ne: email } };
  const result = await userCollection.find(query).toArray();
  res.send(result);
});

router.get("/role/:email", verifyToken, async (req, res) => {
  const user = await userCollection.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: "No account exists" });
  res.send({ role: user.role || "user" });
});

router.post("/", async (req, res) => {
  const newUser = req.body;
  const exists = await userCollection.findOne({ email: newUser.email });
  if (exists) return res.send({ message: "User already exists" });

  const result = await userCollection.insertOne({
    ...newUser,
    role: "student",
    createdAt: new Date(),
  });
  res.send(result);
});

router.patch("/role/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const result = await userCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { role } },
    { returnDocument: "after" },
  );
  res.send({ role: result.role });
});

module.exports = router;
