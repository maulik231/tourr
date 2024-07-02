const express = require("express");
const cors = require("cors");
const router = require("./routes");
require('dotenv').config();
const corsOptions = {
  origin: "http://localhost:3133", // Allow requests from this origin
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow cookies to be sent with requests
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

const app = express();
app.use(cors(corsOptions));
const Port = 8000;

// Simplified CORS configuration

app.use(express.json()); // Parse JSON bodies

app.use(router);

app.listen(Port, () => {
  console.log(`Server is running on port ${Port}`);
});
