// load environment variables
require("dotenv").config();

// import kafka and nodemailer
const { Kafka } = require("kafkajs");
const nodemailer = require("nodemailer");

// retrieve brokers and initialize a kafka instance
const brokers = process.env.KAFKA_BROKERS.split(",").map((b) => b.trim());
const kafka = new Kafka({
  clientId: "bookstore-crm",
  brokers,
});

// create Kafka consumer for CRM group (handles load balancing)
const consumer = kafka.consumer({ groupId: "crm-group" });

// configure Gmail SMTP transporter using App Password
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// main CRM function: connect → subscribe → process events
async function run() {

  // connect to kafka cluster and subscribe to Customer Registered events
  await consumer.connect();
  await consumer.subscribe({
    topic: `${process.env.ANDREW_ID}.customer.evt`,
  });

  console.log("CRM listening for customer events...");

   // process each Kafka message (idempotent, retries on crash)
  await consumer.run({
    eachMessage: async ({ message }) => {

      // parse Customer Registered event as JSON
      const customer = JSON.parse(message.value.toString());
      console.log("Processing customer:", customer.name);

      // send welcome email
      await transporter.sendMail({
        from: `"Bookstore CRM" <${process.env.SMTP_USER}>`,
        to: customer.userId,
        subject: "Activate your book store account",
        text: `Dear ${customer.name},\n\nWelcome to the Book store created by ${process.env.ANDREW_ID}.\n\nExceptionally this time we won't ask you to click a link to activate your account.`,
      });

      console.log(`Email sent to ${customer.userId}`);
    },
  });
}

run().catch(console.error);
