// import express library
const express = require("express");

// create router
const router = express.Router();

const { producer } = require("../index.js");

// import database pool
const pool = require("../persistence/db");

// define helper function to get user by id
async function getCustomerById(id) {
  const results = await pool.execute("SELECT * FROM Customer WHERE id = ?", [
    id,
  ]);
  const rows = results[0];
  return rows[0] || null;
}

// define helper function to get user by userId
async function customerExists(userId) {
  const results = await pool.execute(
    "SELECT userId FROM Customer WHERE userId = ?",
    [userId],
  );
  const rows = results[0];

  return rows.length > 0;
}

// define helper function to get customer by userId
async function getCustomerByUserId(userId) {
  const results = await pool.execute(
    "SELECT * FROM Customer WHERE userId = ?",
    [userId],
  );
  const rows = results[0];
  return rows[0] || null;
}

function validateCustomerData(customerData) {
  const requiredKeys = [
    "userId",
    "name",
    "phone",
    "address",
    "city",
    "state",
    "zipcode",
  ];

  // loop to check if all required keys are in request body
  for (const key of requiredKeys) {
    if (!(key in customerData)) {
      return 400;
    }
  }

  // validate user id
  const userIdRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (userIdRegex.test(customerData.userId) == false) {
    return 400;
  }

  // validate email
  const stateRegex = /^[A-Z]{2}$/;
  if (stateRegex.test(customerData.state) == false) {
    return 400;
  }

  // all is good, return status code 200
  return 200;
}

// define route to get user by id
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (isNaN(id) || id <= 0) {
      return res.status(400).send();
    }

    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).send();
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.log("error message from GET user by id route: ", error);
    return res.status(500).send(error.message);
  }
});

// define route to get user by userId
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;

    const userIdRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userId && !userIdRegex.test(userId)) {
      return res.status(400).send();
    }

    const customer = await getCustomerByUserId(userId);

    if (!customer) {
      return res.status(404).send();
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.log("error message from GET user by userId route: ", error);
    return res.status(500).send(error.message);
  }
});

// define route to add a customer
router.post("/", async (req, res) => {
  try {
    const customerData = req.body;
    const statusCode = validateCustomerData(customerData);

    if (statusCode !== 200) {
      return res.status(400).send();
    }

    // check if user exists
    const userExists = await customerExists(req.body.userId);
    if (userExists) {
      return res
        .status(422)
        .json({ message: "This user ID already exists in the system." });
    }

    // create customer
    const [result] = await pool.execute(
      "INSERT INTO Customer ( userId, name, phone, address, address2, city, state, zipcode) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
      [
        customerData.userId,
        customerData.name,
        customerData.phone,
        customerData.address,
        customerData.address2 || null,
        customerData.city,
        customerData.state,
        customerData.zipcode,
      ],
    );

    const newCustomer = await getCustomerById(result.insertId);

    // dump event message into kafka pipe
    await producer.send({
      topic: `${process.env.ANDREW_ID}.customer.evt`,
      messages: [
        {
          value: JSON.stringify(newCustomer),
        },
      ],
    });

    return res
      .status(201)
      .set(
        "Location",
        `${req.protocol}://${req.get("host")}/customers/${result.insertId}`,
      )
      .json(newCustomer);
  } catch (error) {
    console.log("error message from POST route: ", error);
    return res.status(500).send(error.message);
  }
});

module.exports = router;
