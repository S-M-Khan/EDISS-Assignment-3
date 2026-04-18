// import express library
const express = require("express");

// create router
const router = express.Router();

// import database pool
const pool = require("../persistence/db");

const { GoogleGenAI } = require("@google/genai");

// the client gets the API key from the environment variable `GEMINI_API_KEY`
const ai = new GoogleGenAI({});

const fs = require("fs/promises");

// URL for recommendation service
// const BASE_URL = process.env.RECOMMENDATION_SERVICE_URL;

// define helper function to get user by userId
async function bookExists(isbn) {
  const results = await pool.execute("SELECT ISBN FROM Book WHERE ISBN = ?", [
    isbn,
  ]);
  const rows = results[0];

  return rows.length > 0;
}

// define helper function to get customer by userId
async function getBookByISBN(isbn) {
  const results = await pool.execute("SELECT * FROM Book WHERE ISBN = ?", [
    isbn,
  ]);
  const rows = results[0];
  return rows[0] || null;
}

// define helper function to get related books given an ISBN
async function getRelatedBooks(isbn) {
  let serviceState = "closed";
  let timeLastSet = 0;

  // read state from disk
  try {
    const data = await fs.readFile("./circuit-state.json", "utf8");
    const state = JSON.parse(data);
    serviceState = state.state;
    timeLastSet = state.time;
  } catch (e) {
    // If file doesn't exist, we assume circuit is closed
  }

  const timeToNextTry = 60000;
  const currentTime = Date.now();

  // if circuit is open and still within timeout → fail fast
  if (serviceState === "open" && currentTime - timeLastSet <= timeToNextTry) {
    throw new Error("503");
  }

  // initialize abort controller (3s timeout)
  const controller = new AbortController();
  let timeoutId;

  try {
    // call recommendation service
    const resultsPromise = fetch(
      `http://100.51.187.149/recommended-titles/isbn/${isbn}`,
      { signal: controller.signal }
    );

    timeoutId = setTimeout(() => controller.abort(), 3000);

    const results = await resultsPromise;
    clearTimeout(timeoutId);

    // non-200 = service failure
    if (!results.ok) {
      throw new Error("503");
    }

    // read response safely
    const text = await results.text();

    // empty response → no related books → 204
    if (!text) {
      return [];
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("503");
    }

    // success → close circuit
    try {
      await fs.writeFile(
        "./circuit-state.json",
        JSON.stringify({ state: "closed", time: 0 })
      );
    } catch (e) {
      console.log("circuit write failed:", e.message);
    }

    // map to assignment format
    return data.map((book) => ({
      ISBN: book.isbn,
      title: book.title,
      Author: book.authors,
    }));

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    const failTime = Date.now();

    // open circuit (safe write)
    try {
      await fs.writeFile(
        "./circuit-state.json",
        JSON.stringify({ state: "open", time: failTime })
      );
    } catch (e) {
      console.log("circuit write failed:", e.message);
    }

    // timeout → 504
    if (error.name === "AbortError") {
      throw new Error("504");
    }

    // everything else → 503
    throw new Error("503");
  }
}

// // define helper function to get related books given an ISBN
// async function getRelatedBooks(isbn) {
//   let serviceState = "closed";
//   let timeLastSet = 0;

//   // read state from volume (statelessness via disk)
//   try {
//     await fs.writeFile(
//       "./circuit-state.json",
//       JSON.stringify({
//         state: "open",
//         time: failTime,
//       }),
//     );
//   } catch (e) {
//     console.log("circuit write failed:", e.message);
//   }

//   const timeToNextTry = 60000;
//   const currentTime = Date.now();

//   // first check if circuit is open and return 503 if time to next try has not elapsed
//   if (serviceState === "open" && currentTime - timeLastSet <= timeToNextTry) {
//     throw new Error("503");
//   }

//   // initialize an abort controller to stop request after maximum time of 3 seconds
//   const controller = new AbortController();
//   let timeoutId;

//   try {
//     // fetch for recommended books and pass the abort controller
//     // const resultsPromise = fetch(
//     //   `${BASE_URL}/recommended-titles/isbn/${isbn}`,
//     //   { signal: controller.signal },
//     // );

//     const resultsPromise = fetch(
//       `http://52.73.13.84/recommended-titles/isbn/${isbn}`,
//       { signal: controller.signal },
//     );

//     // start timer for 3-second timeout
//     timeoutId = setTimeout(() => controller.abort(), 3000);
//     const results = await resultsPromise;
//     clearTimeout(timeoutId);

//     // If response is not 200 OK, treat as service failure
//     // FIX: return 503 instead of "NetworkError" to avoid 500 responses
//     if (!results.ok) {
//       throw new Error("503");
//     }

//     // retrieve results
//     const text = await results.text();

//     // triggers 204 No Content response
//     if (!text) {
//       return [];
//     }

//     // FIX: safely parse JSON to avoid crashing with 500
//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch (e) {
//       // treat malformed response as service failure
//       throw new Error("503");
//     }

//     // if success, close circuit and reset timer
//     await fs.writeFile(
//       "./circuit-state.json",
//       JSON.stringify({ state: "closed", time: 0 }),
//     );

//     // ensure data is always an array
//     if (!Array.isArray(data)) {
//       throw new Error("503");
//     }

//     // map to expected assignment format
//     const mapped = data.map((book) => ({
//       ISBN: book.isbn,
//       title: book.title,
//       Author: book.authors,
//     }));

//     return mapped;
//   } catch (error) {
//     if (timeoutId) clearTimeout(timeoutId);

//     // if failure occurs (timeout or network error), open the circuit
//     const failTime = Date.now();
//     await fs.writeFile(
//       "/circuit-state.json",
//       JSON.stringify({ state: "open", time: failTime }),
//     );

//     // if it was specifically a timeout, return 504
//     if (error.name === "AbortError") {
//       throw new Error("504");
//     }

//     // for other network errors or "Half-Open" failures, return 503
//     // throwing 503 tells the user the service is currently unavailable
//     throw new Error("503");
//   }
// }

// function to validate book data sent by client
function validateBookData(bookData) {
  const requiredKeys = [
    "ISBN",
    "title",
    "Author",
    "description",
    "genre",
    "price",
    "quantity",
  ];

  // loop to check if all required keys are in request body
  for (const key of requiredKeys) {
    if (!(key in bookData)) {
      return 400;
    }
  }

  // validate book price
  const bookPriceRegex = /^\d+(\.\d{1,2})?$/;
  if (bookPriceRegex.test(bookData.price) == false) {
    return 400;
  }

  // all is good, return status code 200
  return 200;
}

// helper function to generate and save book summary
async function generateAndSaveSummary(isbn, title, author) {
  let summaryToSave = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Write exactly a 500-word summary of the book "${title}" by ${author}. Ensure it is at least 200 words.`,
    });

    const aiText =
      typeof response.text === "function" ? response.text() : response.text;

    if (aiText && aiText.trim().split(/\s+/).length >= 200) {
      summaryToSave = aiText;

      // we only update if we have a valid summary to avoid overwriting with empty strings
      await pool.execute("UPDATE Book SET summary = ? WHERE ISBN = ?", [
        summaryToSave,
        isbn,
      ]);
    }
  } catch (error) {
    console.error("LLM failed:", error.message);
  }
}

// define route to retrieve related books given an ISBN
router.get("/:ISBN/related-books", async (req, res) => {
  try {
    const isbn = req.params.ISBN;
    const results = await getRelatedBooks(isbn);

    if (!results || results.length === 0) {
      return res.status(204).send();
    }

    return res.status(200).json(results);
  } catch (error) {
    console.log("error message from ISBN GET related books route: ", error);

    // let status = 500;
    // if (error.message === "504") status = 504;
    // if (error.message === "503") status = 503;
    // return res.status(status).send(error.message);
    let status = 500;
    if (error.message === "504") status = 504;
    if (error.message === "503") status = 503;

    return res.status(status).json({
      debug: "related-books failed",
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }
});

// define route to get book by ISBN using different endpoints
router.get(["/:ISBN", "/isbn/:ISBN"], async (req, res) => {
  try {
    const isbn = req.params.ISBN;
    let book = await getBookByISBN(isbn);

    if (!book) return res.status(404).send();

    // wait for the LLM to finish
    let attempts = 60;
    while (!book.summary && attempts > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      book = await getBookByISBN(isbn);
      attempts--;
    }

    book.price = parseFloat(book.price);
    book.quantity = parseInt(book.quantity);

    return res.status(200).json(book);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Diagnostic Error",
      error: error.message,
      stack: error.stack,
      db_config: {
        host: process.env.DB_HOST,
        db: process.env.DB_NAME,
      },
    });
  }
});

// define route to add a book
router.post("/", async (req, res) => {
  try {
    const bookData = req.body;
    const statusCode = validateBookData(bookData);

    if (statusCode !== 200) {
      return res.status(400).send();
    }

    // check if book exists
    const exists = await bookExists(req.body.ISBN);
    if (exists) {
      return res
        .status(422)
        .json({ message: "This ISBN already exists in the system." });
    }

    // create book
    await pool.execute(
      "INSERT INTO Book (ISBN, title, Author, description, genre, price, quantity, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        bookData.ISBN,
        bookData.title,
        bookData.Author,
        bookData.description,
        bookData.genre,
        bookData.price,
        bookData.quantity,
        "",
      ],
    );

    res
      .status(201)
      .set(
        "Location",
        `${req.protocol}://${req.get("host")}/books/${bookData.ISBN}`,
      )
      .json({
        ISBN: bookData.ISBN,
        title: bookData.title,
        Author: bookData.Author,
        description: bookData.description,
        genre: bookData.genre,
        price: bookData.price,
        quantity: bookData.quantity,
      });

    // make call to LLM to generate and save book summary
    await generateAndSaveSummary(bookData.ISBN, bookData.title, bookData.Author);
  } catch (error) {
    console.log("error message from add book POST route: ", error);
    return res.status(500).send(error.message);
  }
});

// define route to update book
router.put("/:ISBN", async (req, res) => {
  try {
    const bookData = req.body;
    const urlISBN = req.params.ISBN;

    if (bookData.ISBN !== urlISBN) {
      return res.status(400).send();
    }

    const exists = await bookExists(urlISBN);

    if (!exists) {
      return res.status(404).send();
    }

    const statusCode = validateBookData(req.body);

    if (statusCode !== 200) {
      return res.status(400).send();
    }

    await pool.execute(
      `UPDATE Book 
             SET ISBN =?, title=?, Author=?, description=?, genre=?, price=?, quantity=? 
             WHERE ISBN=?`,
      [
        bookData.ISBN,
        bookData.title,
        bookData.Author,
        bookData.description,
        bookData.genre,
        bookData.price,
        bookData.quantity,
        urlISBN,
      ],
    );

    const updatedBook = await getBookByISBN(urlISBN);

    updatedBook.price = parseFloat(updatedBook.price);
    updatedBook.quantity = parseInt(updatedBook.quantity);
    delete updatedBook.summary;

    res.status(200).json(updatedBook);
  } catch (error) {
    console.log("error message from PUT book route: ", error);
    return res.status(500).send(error.message);
  }
});

module.exports = router;
