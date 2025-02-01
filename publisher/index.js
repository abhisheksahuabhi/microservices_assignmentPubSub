const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});
const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

client.connect().then(() => console.log("Connected to MongoDB"));
const db = client.db(process.env.DATABASE_NAME);
const collection = db.collection("first_table");

app.post("/receiver", async (req, res) => {
  try {
    const { user, class: userClass, age, email } = req.body;
    if (!user || !userClass || !age || !email) {
      return res.status(400).json({ error: "Invalid data send through request" });
    }
    const requestPayload = { _id: uuidv4(), user, class: userClass, age, email, inserted_at: new Date().toISOString() };
    const result = await collection.insertOne(requestPayload);
    if (!result.acknowledged) {
      return res.status(500).json({ error: "Insert operation failed" });
    }
    await sqs.sendMessage({ QueueUrl: process.env.SQS_URL + process.env.QUEUENAME, MessageBody: JSON.stringify(requestPayload) }).promise();
    res.status(200).json({ message: "Data received and published", results: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Receiver Service running on port 3000"));
