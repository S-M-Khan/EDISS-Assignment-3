

// configure dotenv
require('dotenv').config();

// load ExpressJS library from node modules
const express = require("express");

// import authentication middleware
const authBackend = require('./utils/authBackend');

// initialize an express app instance
const app = express();

// parse JSON strings to JS objects
app.use(express.json());

// initialize port number
const port = process.env.PORT || 3000;
// const port = process.env.PORT || 8000;

const bookRoutes = require('./routes/bookRoutes');

app.use('/books', authBackend, bookRoutes);

// route to check service status
app.get('/status', (req, res) => {
    res.set('Content-Type', 'text/plain').status(200).send('OK')
});

app.listen(port, () => {
  console.log(`Book service is live and listening on port ${port}`);
});
