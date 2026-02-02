const express = require("express");
const { isAdmin, verifyToken } = require("../middleware/authMiddleware");
const {
  userCollection,
  scholarshipCollection,
  applicationCollection,
} = require("../config/db");
const router = express.Router();

router.get("/charts-revenu", verifyToken, isAdmin, async (req, res) => {
  try {
    const usersCount = await userCollection.countDocuments();
    const scholarshipCount = await scholarshipCollection.countDocuments();

    const feesResult = await applicationCollection.aggregate([
      {
        $addFields: {
          appFee: { $toDouble: { $ifNull: ["$applicationFees", "0"] } },
          servCharge: { $toDouble: { $ifNull: ["$serviceCharge", "0"] } }
        }
      },
      {
        $group: {
          _id: null,
          totalFees: { 
            $sum: { $add: ["$appFee", "$servCharge"] } 
          }
        }
      }
    ]).toArray();

    res.send({
      totalUsers: usersCount,
      totalScholarships: scholarshipCount,
      totalFeesCollected: feesResult[0]?.totalFees || 0
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch total stats", error: error.message });
  }
});


router.get("/charts", verifyToken, isAdmin, async (req, res) => {
  try {
    const universityData = await applicationCollection.aggregate([
      {
        $group: {
          _id: "$universityName", 
          total: { $sum: 1 } 
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",  
          value: "$total"
        }
      },
      { $sort: { value: -1 } } 
    ]).toArray();
    
    res.send(universityData);
    console.log(universityData);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch chart data", error: error.message });
  }
});

module.exports = router;
