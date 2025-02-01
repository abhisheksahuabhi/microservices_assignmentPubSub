const { MongoClient } = require("mongodb");
const AWS = require("aws-sdk");

// AWS SQS Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });


const client = new MongoClient(process.env.MONGO_URI);
client.connect().then(() => console.log("Connected to MongoDB"));
const db = client.db(process.env.DATABASE_NAME);
const collection = db.collection("second_table");

async function processMessages() {
    try {
        const queueUrl = process.env.SQS_URL + process.env.QUEUENAME;
        console.log("Listening to SQS Queue:", queueUrl);
        
        const params = {
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10, 
            WaitTimeSeconds: 20     
        };

        const response = await sqs.receiveMessage(params).promise();
        if (!response.Messages || response.Messages.length === 0) {
            console.log("No messages received.");
            return;
        }

        for (const message of response.Messages) {
            try {
                console.log("Received message:", message.Body);
                const data = JSON.parse(message.Body);
                data.modified_at = new Date().toISOString();

                
                await collection.insertOne(data);
                console.log("Message inserted into MongoDB:", data);

             
                await sqs.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }).promise();
                console.log("Message deleted from SQS.");
            } catch (err) {
                console.error("Error processing individual message:", err);
            }
        }
    } catch (err) {
        console.error("Error processing messages:", err);
    }
}

async function startListener() {
    console.log("Listener service started...");
    while (true) {
        await processMessages();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
startListener();