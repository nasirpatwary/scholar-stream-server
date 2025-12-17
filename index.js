const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(express.json());
app.use(cors())
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const db = client.db("scholarStreamDB");
  const userCollection = db.collection("users");
  try {

  // userCollection

    app.get("/users/:email", async (req, res) => {
      const {email} = req.params
      const query = {email: {$ne: email}}
      const result = await userCollection.find(query).toArray()
      res.send(result)

    })
    app.get("/users/:email/role", async (req, res) => {
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
    app.patch("/users/:id/role", async (req, res) => {
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
