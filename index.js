const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./serviceKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.u1z8wkz.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    res.status(401).send({
      message: "unauthorized access: token not found",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const decode = await admin.auth().verifyIdToken(token);
    console.log("✅ Token verified:", decode.email);

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    res.status(401).send({
      message: "unauthorized access",
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("travelEase_db");
    const vehicleCollection = db.collection("travel-collection");
    const bookingCollection = db.collection("booking-collection");

    app.get("/vehicles", async (req, res) => {
      const result = await vehicleCollection
        .find()
        .sort({ pricePerDay: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/vehicles", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await vehicleCollection.insertOne(data);
      res.send(result);
    });

    app.get("/vehicles/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const result = await vehicleCollection.findOne({ _id: objectId });
      res.send(result);
    });

    app.get("/my-vehicles", async (req, res) => {
      const email = req.query.email;
      const result = await vehicleCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.put("/vehicles/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: data,
      };
      const result = await vehicleCollection.updateOne(filter, update);
      res.send(result);
    });

    app.delete("/vehicles/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const result = await vehicleCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/my-bookings", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await bookingCollection.insertOne(data);
      res.send(result);
    });

    app.get("/my-bookings", verifyToken, async (req, res) => {
      const email = req.query.email;
      const result = await bookingCollection
        .find({ bookedBy: email })
        .toArray();
      res.send(result);
    });

    app.get("/latest-vehicles", async (req, res) => {
      const result = await vehicleCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("travelEase server is running now!");
});

app.listen(port, () => {
  console.log(`travelEase server is listening on port ${port}`);
});
