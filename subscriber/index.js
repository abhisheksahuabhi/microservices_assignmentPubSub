const { MongoClient } = require("mongodb");
const AWS = require("aws-sdk");
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const client = new MongoClient(process.env.MONGO_URI);
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

client.connect().then(() => console.log("Connected to MongoDB"));
const db = client.db(process.env.DATABASE_NAME);
const collection = db.collection("second_table");

async function processMessages() {
    try {
        const params = { QueueUrl: process.env.SQS_URL + process.env.QUEUENAME, MaxNumberOfMessages: 1, WaitTimeSeconds: 10 };
        const response = await sqs.receiveMessage(params).promise();
        if (response.Messages) {
            const message = response.Messages[0];
            const data = JSON.parse(message.Body);
            data.modified_at = new Date().toISOString();
            await collection.insertOne(data);
            await sqs.deleteMessage({ QueueUrl: process.env.SQS_URL + process.env.QUEUENAME, ReceiptHandle: message.ReceiptHandle }).promise();
            console.log("Message processed and deleted:", data);
        }
    } catch (err) {
        console.error("Error processing message:", err);
    }
}

(async function () {
    console.log("Listener service started...");
    while (true) {
        await processMessages();
    }
})
