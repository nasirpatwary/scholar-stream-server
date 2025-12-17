const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
      });
      res.send(result);
    });
    app.patch("/users/:id/role", verifyToken, async (req, res) => {
      const {id} = req.params
      const {role} = req.body
      const query = {_id: new ObjectId(id)}
      const updateRole = await userCollection.findOneAndUpdate(query, 
        {$set: {role}},
        {returnDocument: "after"}
      )
      res.send({role: updateRole.role})
    })

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
