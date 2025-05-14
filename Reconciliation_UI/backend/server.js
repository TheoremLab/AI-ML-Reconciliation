const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "reconciliation",
  password: "postgres",
  port: 5432,
});

// Temporary login check for "admin"
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    return res.status(200).json({ success: true, message: "Login successful"}); 
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// Basic signup route (no DB insert yet)
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    return res.status(200).json({ success: true, message: "Signup successful" });
  }

  return res.status(400).json({ success: false, message: "Use 'admin' for now" });
});
