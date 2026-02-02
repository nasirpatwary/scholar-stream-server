const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const client = new MongoClient(process.env.URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db("scholarStreamDB");

module.exports = {
  client,
  db,
  ObjectId,
  userCollection: db.collection("users"),
  scholarshipCollection: db.collection("scholarships"),
  applicationCollection: db.collection("applications"),
  reviewCollection: db.collection("reviews"),
};