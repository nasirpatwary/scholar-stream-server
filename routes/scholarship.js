const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const { scholarshipCollection, ObjectId } = require("../config/db");
const router = express.Router();

router.get("/", verifyToken, isAdmin, async (req, res) => {
  const {
    search = "",
    subject = "",
    category = "",
    limit = 6,
    skip = 0,
    sortField = "scholarshipPostDate",
    sortOrder = "desc",
  } = req.query;

  const query = {};
  if (search) {
    query.$or = [
      { scholarshipName: { $regex: search, $options: "i" } },
      { universityName: { $regex: search, $options: "i" } },
      { degree: { $regex: search, $options: "i" } },
    ];
  }
  if (subject) query.subjectCategory = subject;
  if (category) query.scholarshipCategory = category;

  const sortOptions = {};
  sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

  const scholarships = await scholarshipCollection
    .find(query)
    .sort(sortOptions)
    .skip(Number(skip))
    .limit(Number(limit))
    .toArray();

  const totalCount = await scholarshipCollection.countDocuments(query);
  res.send({ scholarships, totalCount });
});

router.get("/:email/manage", verifyToken, isAdmin, async (req, res) => {
  const { email } = req.params;
  const query = { postedUserEmail: email };
  const project = {
    postedUserEmail: 1,
    applicationFees: 1,
    serviceCharge: 1,
    scholarshipPostDate: 1,
    applicationDeadline: 1,
  };
  const result = await scholarshipCollection
    .find(query)
    .sort({scholarshipPostDate: -1})
    .project(project)
    .toArray();
  res.send(result);
});

router.get("/:id/details", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await scholarshipCollection.findOne(query);
  res.send(result);
});

router.post("/", verifyToken, isAdmin, async (req, res) => {
  const newScholarship = req.body;
  const result = await scholarshipCollection.insertOne(newScholarship);
  res.send(result);
});

router.patch(
  "/:id/update/scholarship",
  verifyToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const scholarship = req.body;
    const query = { _id: new ObjectId(id) };
    const updateDoc = { $set: scholarship };
    const result = await scholarshipCollection.updateOne(query, updateDoc);
    res.send(result);
  },
);

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await scholarshipCollection.deleteOne(query);
  res.send(result);
});

module.exports = router;
