const express = require("express");
const {
  verifyToken,
  isMod,
  isStudent,
} = require("../middleware/authMiddleware");
const { applicationCollection, ObjectId } = require("../config/db");
const router = express.Router();

router.get("/manage", verifyToken, isMod, async (req, res) => {
  const result = await applicationCollection.find().toArray();
  res.send(result);
});

router.get("/:email/applied", verifyToken, isStudent, async (req, res) => {
  const { email } = req.params;
  const query = { userEmail: email };
  const result = await applicationCollection.find(query).toArray();
  res.send(result);
});

// 3. Get application details by ID
router.get("/:id/details", verifyToken, isStudent, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await applicationCollection.findOne(query);
  res.send(result);
});

router.patch("/:id/status", verifyToken, isStudent, async (req, res) => {
  const { id } = req.params;
  const { applicationStatus } = req.body;
  const query = { _id: new ObjectId(id) };

  const updateStatus = await applicationCollection.findOneAndUpdate(
    query,
    { $set: { applicationStatus } },
    { returnDocument: "after" },
  );
  res.send({ applicationStatus: updateStatus.applicationStatus });
});

router.post("/", verifyToken, isStudent, async (req, res) => {
  const newApplication = req.body;
  const result = await applicationCollection.insertOne(newApplication);
  res.send(result);
});

router.patch("/:id/feedback", verifyToken, isMod, async (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body;
  const query = { _id: new ObjectId(id) };

  const updateFeedBack = await applicationCollection.findOneAndUpdate(
    query,
    { $set: { feedback } },
    { returnDocument: "after" },
  );
  res.send({ feedback: updateFeedBack.feedback });
});

router.patch(
  "/:id/update/application",
  verifyToken,
  isStudent,
  async (req, res) => {
    const { id } = req.params;
    const application = req.body;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: application };

    const result = await applicationCollection.updateOne(query, updateDoc);
    res.send(result);
  },
);

router.delete("/:id", verifyToken, isStudent, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await applicationCollection.deleteOne(query);
  res.send(result);
});

module.exports = router;
