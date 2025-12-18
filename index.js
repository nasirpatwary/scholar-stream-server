const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));
  const isProd = process.env.NODE_ENV === "production";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verifyToken
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("token ----->", token)
  if (!token) return res.status(401).send({ message: "unauthorized access" });

  jwt.verify(token, process.env.JWT_SECRET_TOKEN, (err, decoded) => {
    if (err) return res.status(403).send({ message: "forbidden access" });
    req.token_email = decoded.email;
    console.log(req.token_email)
    next();
  });
};


async function run() {
  const db = client.db("scholarStreamDB");
  const userCollection = db.collection("users");
  const scholarshipCollection = db.collection("scholarships");
  const applicationCollection = db.collection("applications ");
  const reviewCollection = db.collection("reviews ");

  // verify admin
  const verifyAdmin = async (req, res, next) => {
    const email = req.token_email
    const query = {email}
    const user = await userCollection.findOne(query)
    if (!user || !user.role === "admin") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next()
  }
  // verify moderator
  const verifyModerator = async (req, res, next) => {
    const email = req.token_email
    const query = {email}
    const user = await userCollection.findOne(query)
    if (!user || !user.role === "moderator") {
      return res.status(403).send({ message: "forbidden access" });
    }
    next()
  }
  try {
    // jwt token post and login
  app.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "Email required" });

  const token = jwt.sign({ email }, process.env.JWT_SECRET_TOKEN, {
    expiresIn: "365d",
  }); 
  
  console.log("post token --->", token)
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,          
    sameSite: isProd ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });

  res.send({ message: "JWT stored in cookie" });
    });
    // logout
  app.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  });

  res.send({ message: "Logged out!" });
  }); 

  // userCollection

    app.get("/users/:email", verifyToken,  async (req, res) => {
      const {email} = req.params
      const query = {email: {$ne: email}}
      const result = await userCollection.find(query).toArray()
      res.send(result)

    })
    app.get("/users/:email/role", verifyToken, async (req, res) => {
      const {email} = req.params;
      const query = {email}
      const user = await userCollection.findOne(query)
      if (!user) {
        return res.send({ message: "No account exists for this email" });
      }
      res.send({role: user.role || "user"})
    })
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const user = await userCollection.findOne(query);
      if (user) {
        return res.send({
          message: "user already exist Please log in or use a different email",
        });
      }
      const result = await userCollection.insertOne({
        ...newUser,
        role: "student",
        createdAt: new Date()
      });
      res.send(result);
    });
    app.patch("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
      const {id} = req.params
      const {role} = req.body
      const query = {_id: new ObjectId(id)}
      const updateRole = await userCollection.findOneAndUpdate(query, 
        {$set: {role}},
        {returnDocument: "after"}
      )
      res.send({role: updateRole.role})
    })

    // scholarshipCollection

    app.get("/scholarships",verifyToken, async (req, res) => {
      const {search="",subject="",
      category="", limit=6, skip=0} = req.query
      const query = {}
      if (search) {
         query.$or = [
        { scholarshipName: { $regex: search, $options: "i" } },
        { universityName: { $regex: search, $options: "i" } },
        { degree: { $regex: search, $options: "i" } },
      ];
      }
       if (subject) {
        query.subjectCategory = subject; 
      }

      if (category) {
        query.scholarshipCategory = category;
      }
      console.log(query)
      const sorted = {scholarshipPostDate: -1}
      const scholarships = await scholarshipCollection.find(query).sort(sorted).skip(Number(skip)).limit(Number(limit)).toArray()
      const totalCount = await scholarshipCollection.countDocuments(query)
      res.send({scholarships, totalCount})
    })
    app.get("/scholarships/:email/manage", verifyToken, async (req, res) => {
      const {email} = req.params
      const query = {postedUserEmail: email}
      const createPorject = {postedUserEmail: 1, applicationFees: 1, serviceCharge: 1, scholarshipPostDate: 1, applicationDeadline: 1}
      const result = await scholarshipCollection.find(query).project(createPorject).toArray()
      res.send(result)
    })
    app.get("/scholarships/:id/details", verifyToken, async (req, res) => {
      const {id} = req.params
      const query = {_id: new ObjectId(id)}
      const result = await scholarshipCollection.findOne(query)
      res.send(result)
    })
    app.post("/scholarships", verifyToken, async (req, res) => {
      const newShcolarship = req.body;
      const result = await scholarshipCollection.insertOne(newShcolarship)
      res.send(result)
    })
    app.patch("/scholarships/:id/update/scholarship", verifyToken, async (req, res) => {
      const {id} = req.params;
      const scholarship = req.body
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: scholarship
      }
      const result = await scholarshipCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.delete("/scholarships/:id",verifyToken, async (req, res) => {
      const {id} = req.params;
      const query = {_id: new ObjectId(id)}
      const result = await scholarshipCollection.deleteOne(query)
      res.send(result)
    })

    // applicationCollection

    app.get("/applications/manage", verifyToken, async (req, res) => {
      const result = await applicationCollection.find().toArray()
      res.send(result)
    })
    app.get("/applications/:email/applied", verifyToken, async (req, res) => {
      const {email} = req.params
      const query = {userEmail: email}
      const result = await applicationCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/applications/:id/details", verifyToken, async (req, res) => {
      const {id} = req.params
      const query = {_id: new ObjectId(id)}
      const result = await applicationCollection.findOne(query)
      res.send(result)
    })
    app.patch("/applications/:id/status", verifyToken, async (req, res) => {
      const {id} = req.params
      const {applicationStatus} = req.body
      const query = {_id: new ObjectId(id)}
      const updateStatus = await applicationCollection.findOneAndUpdate(query, 
        {$set: {applicationStatus}},
        {returnDocument: "after"}
      )
      res.send({applicationStatus: updateStatus.applicationStatus})
    })
    app.post("/applications", verifyToken,  async (req, res) => {
      const newApplication = req.body;
      const result = await applicationCollection.insertOne(newApplication)
      res.send(result)
    })
    app.patch("/applications/:id/feedback", verifyToken, async (req, res) => {
      const {id} = req.params
      const {feedback} = req.body
      const query = {_id: new ObjectId(id)}
      const updateFeedBack = await applicationCollection.findOneAndUpdate(query, 
        {$set: {feedback}},
        {returnDocument: "after"}
      )
      res.send({feedback: updateFeedBack.feedback})
    })
    app.patch("/applications/:id/update/application", verifyToken, async (req, res) => {
      const {id} = req.params;
      const application = req.body
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: application
      }
      const result = await applicationCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    app.delete("/applications/:id", verifyToken, async (req, res) => {
      const {id} = req.params;
      const query = {_id: new ObjectId(id)}
      const result = await applicationCollection.deleteOne(query)
      res.send(result)
    })

// reviewCollection 

   app.get("/reviews", verifyToken, async (req, res) => {
    const result = await reviewCollection.find().toArray()
    res.send(result)
   })
   app.get("/reviews/:email",verifyToken, async (req, res) => {
     const {email} = req.params
      const query = {userEmail: email}
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
   })
   app.post("/reviews", verifyToken, async (req, res) => {
    const newReview = req.body
    const result = await reviewCollection.insertOne(newReview)
    res.send(result)
   })
   app.patch("/reviews/:id/update/review", verifyToken, async (req, res) => {
    const {id} = req.params;
      const review = req.body
      const query = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: review
      }
      const result = await reviewCollection.updateOne(query, updateDoc)
      res.send(result)
   })

   app.delete("/reviews/:id", verifyToken, async (req, res) => {
    const {id} = req.params;
      const query = {_id: new ObjectId(id)}
      const result = await reviewCollection.deleteOne(query)
      res.send(result)
   })

  //  paymet checkout 
   app.post('/create-checkout-session',verifyToken, async (req, res) => {
   const {
      scholarshipId,
      scholarshipName,
      universityName,
      userEmail,
      totalAmount } = req.body
  const amount = parseInt(totalAmount) * 100
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
       price_data:{
        currency: "usd",
        unit_amount: amount,
        product_data: {
          name: universityName || scholarshipName
        }
       },
        quantity: 1,
      },
    ],
    mode: 'payment',
    metadata: {scholarshipId},
    customer_email: userEmail,
    success_url: `${process.env.DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/dashboard/payment-cancelled`,
  });

  res.send({ url: session.url });
});
    app.put('/session-status',verifyToken,  async (req, res) => {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    const transactionId = session.payment_intent
    const queryTransactionId = {transactionId}
    const existApplication = await applicationCollection.findOne(queryTransactionId)
    if(existApplication) return res.send({message: "already exists", transactionId })
      if (session.payment_status === "paid") {
      const scholarshipId = session.metadata.scholarshipId
      const query = {scholarshipId}
      const update = {
      $set: {
        paymentStatus: "paid",
        transactionId,
      },
    };
    const options = {
      returnDocument: "after",
    };
      const result = await applicationCollection.findOneAndUpdate(query, update, options)
      res.send({
        transactionId: result.transactionId, 
        universityCity: result.universityCity,
        scholarshipName: result.universityCity,
        applicationFees: result.applicationFees,
        serviceCharge: result.serviceCharge
      })
    }
  });

  // admin status

  app.get("/admin-stats", async (req, res) => {
  const usersCount = await userCollection.countDocuments();
  const scholarshipCount = await scholarshipCollection.countDocuments();
  const feesResult = await applicationCollection.aggregate([
    {
      $addFields: {
        applicationFeesNum: { $toInt: "$applicationFees" },
        serviceChargeNum: { $toInt: "$serviceCharge" }
      }
    },
    {
      $group: {
        _id: null,
        totalFees: {
          $sum: {
            $add: ["$applicationFeesNum", "$serviceChargeNum"]
          }
        }
      }
    }
  ]).toArray();

  res.send({
    totalUsers: usersCount,
    totalScholarships: scholarshipCount,
    totalFeesCollected: feesResult[0]?.totalFees || 0
  });
});


    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
