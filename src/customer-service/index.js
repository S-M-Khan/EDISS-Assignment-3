// configure dotenv
require("dotenv").config();

const { Kafka } = require("kafkajs");

// load ExpressJS library from node modules
const express = require("express");

// import authentication middleware
const authBackend = require("./utils/authBackend");

// initialize an express app instance
const app = express();

// parse JSON strings to JS objects
app.use(express.json());

// initialize port number
const port = process.env.PORT || 3000;
// const port = process.env.PORT || 7000;

// setup kafka
const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
  : [];

// create kafka instance
const kafka = new Kafka({
  clientId: "bookstore-customer",
  brokers: brokers,
});

// initialize kafka producer
const producer = kafka.producer();

// connect at startup
async function init() {
  producer
    .connect()
    .then(() => {
      console.log("Kafka connected");
    })
    .catch((err) => {
      console.error(
        "Kafka connection failed, but server is starting anyway",
        err,
      );
    });
}
init();

module.exports = { producer };

const customerRoutes = require("./routes/customerRoutes");

app.use("/customers", authBackend, customerRoutes);

// route to check service status
app.get("/status", (req, res) => {
  res.set("Content-Type", "text/plain").status(200).send("OK");
});

app.listen(port, () => {
  console.log(`Customer service is live and listening on port ${port}`);
});
