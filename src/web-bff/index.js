// load ExpressJS library from node modules
const express = require("express");

// import authentication middleware
const authMiddleware = require("./utils/authMiddleware");

// initialize an express app instance
const app = express();

// parse JSON strings to JS objects
app.use(express.json());

// initialize port number
const port = process.env.PORT || 80;
// const port = process.env.PORT || 6000;

// const CUSTOMER_SERVICE_URL = "http://localhost:7000";
// const CUSTOMER_SERVICE_URL = process.env.URL_BASE_BACKEND_SERVICES || "http://localhost:7000";
// const BOOK_SERVICE_URL = process.env.URL_BASE_BACKEND_SERVICES || "http://localhost:8000";

// variables for each service
const CUSTOMER_SERVICE_URL =
  process.env.CUSTOMER_SERVICE_URL || "http://customer-service:3000";
const BOOK_SERVICE_URL =
  process.env.BOOK_SERVICE_URL || "http://book-service:3000";

// helper function to call customers service
async function callCustomerService(path, req) {
  // construct the url to call the customers backend service
  const url = `${CUSTOMER_SERVICE_URL}/customers${path}`;

  console.log(url);

  // make a request to customers backend service
  const response = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: req.get("Authorization"),
      "X-Client-Type": req.get("X-Client-Type"),
      "Content-Type": "application/json",
    },
    // if it's a POST request, forward the body too
    body: ["POST"].includes(req.method) ? JSON.stringify(req.body) : null,
  });

  // throw error if it occurs
  if (!response.ok) {
    const error = new Error();
    error.status = response.status;
    throw error;
  }
  return await response.json();
}

// const BOOK_SERVICE_URL = "http://localhost:8000";

// helper function to call books backend service
async function callBookService(path, req) {
  // construct url for accessing relevant book service route
  const url = `${BOOK_SERVICE_URL}/books${path}`;
  console.log(url);

  // make a request to book backend service
  const response = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: req.get("Authorization"),
      "X-Client-Type": req.get("X-Client-Type"),
      "Content-Type": "application/json",
    },
    // if it's a POST or PUT request, forward the body too
    body: ["POST", "PUT"].includes(req.method)
      ? JSON.stringify(req.body)
      : null,
  });

  if (!response.ok) {
    const error = new Error();
    error.status = response.status;
    throw error;
  }

  // handle 204 No Content properly
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

// route to check bff service status
app.get("/status", (req, res) => {
  res.set("Content-Type", "text/plain").status(200).send("OK");
});

// proxy the status check to the internal Book Service root
app.get("/books/status", async (req, res) => {
  try {
    // We use a custom fetch here because callBookService adds a '/books' prefix we don't want
    const response = await fetch(`${BOOK_SERVICE_URL}/status`);
    if (response.ok) {
      res.status(200).send("OK");
    } else {
      res.status(response.status).send();
    }
  } catch (error) {
    res.status(500).send("Book Service Unreachable");
  }
});

// proxy the status check to the internal Customer Service root
app.get("/customers/status", async (req, res) => {
  try {
    const response = await fetch(`${CUSTOMER_SERVICE_URL}/status`);
    if (response.ok) {
      res.status(200).send("OK");
    } else {
      res.status(response.status).send();
    }
  } catch (error) {
    res.status(500).send("Customer Service Unreachable");
  }
});

// call customers backend service to get user by userId
app.get("/customers", authMiddleware, async (req, res) => {
  // call customers service helper function
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).send();
    }

    const data = await callCustomerService(`?userId=${userId}`, req);
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status).send();
  }
});

// call customers backend service to get user by ID
app.get("/customers/:id", authMiddleware, async (req, res) => {
  // call customers service helper function
  try {
    const data = await callCustomerService(`/${req.params.id}`, req);
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status).send();
  }
});

// call customers backend service to add customer
app.post("/customers", authMiddleware, async (req, res) => {
  // call customers backend service helper function
  try {
    const data = await callCustomerService("/", req);
    res
      .status(201)
      .set(
        "Location",
        `${req.protocol}://${req.get("host")}/customers/${data.id}`,
      )
      .json(data);
  } catch (error) {
    if (error.status === 422) {
      return res
        .status(422)
        .json({ message: "This user ID already exists in the system." });
    }
    res.status(error.status).send();
  }
});

// call books backend service to get book by ISBN
app.get(
  ["/books/:ISBN", "/books/isbn/:ISBN"],
  authMiddleware,
  async (req, res) => {
    // call books backend service helper function
    try {
      const data = await callBookService(`/${req.params.ISBN}`, req);
      res.status(200).json(data);
    } catch (error) {
      res.status(error.status).send();
    }
  },
);

// call book backend service to add book
app.post("/books", authMiddleware, async (req, res) => {
  // call books backend service helper function
  try {
    const data = await callBookService("/", req);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status).send();
  }
});

// call book backend service to update book
app.put("/books/:ISBN", authMiddleware, async (req, res) => {
  // call books backend service helper function
  try {
    const data = await callBookService(`/${req.params.ISBN}`, req);
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status).send();
  }
});

// call book backend service to get related books
app.get("/books/:ISBN/related-books", authMiddleware, async (req, res) => {
  try {
    const data = await callBookService(
      `/${req.params.ISBN}/related-books`,
      req,
    );

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(204).send();
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(error.status || 500).send(error);
  }
});

app.listen(port, () => {
  console.log(`Web BFF is live and listening on port ${port}`);
});
