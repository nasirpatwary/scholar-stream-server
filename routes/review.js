const express = require("express");
const { verifyToken, isMod, isStudent } = require("../middleware/authMiddleware");
const { reviewCollection, ObjectId } = require("../config/db");
const router = express.Router();

router.get("/", verifyToken, isMod, async (req, res) => {
  const result = await reviewCollection.find().toArray();
  res.send(result);
});

router.get("/user/:email", verifyToken, isStudent, async (req, res) => {
  const { email } = req.params;
  const query = { userEmail: email };
  const result = await reviewCollection.find(query).toArray();
  res.send(result);
});

router.post("/", verifyToken, isStudent, async (req, res) => {
  const newReview = req.body;
  const result = await reviewCollection.insertOne(newReview);
  res.send(result);
});

router.patch("/:id/update/review", verifyToken, isStudent, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  delete updatedData._id; 

  const query = { _id: new ObjectId(id) };
  const updateDoc = { $set: updatedData };
  const result = await reviewCollection.updateOne(query, updateDoc);
  res.send(result);
});


router.delete("/:id", verifyToken, isStudent, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await reviewCollection.deleteOne(query);
  res.send(result);
});

module.exports = router;