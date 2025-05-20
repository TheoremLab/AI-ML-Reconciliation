const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' })); 

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "reconciliation",
  password: "postgres",
  port: 5432,
});

// debug endpoint
app.get("/", (req, res) => {
  res.send("Backend is alive and reachable");
});

// endpoint for receiving files and calling script
app.post("/submit-batch", async (req, res) => {

  console.log("Received request to /submit-batch");

  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  console.log("Files received in /submit-batch:");

  files.forEach((file, idx) => {
    console.log(`  File ${idx + 1}:`);
    console.log(`    Name: ${file.name}`);
    console.log(`    Size: ${file.content.length} characters`);
    console.log(`    Sample (first 100 chars): ${file.content.slice(0, 100)}`);
  });


  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "recon-"));
  const writtenFiles = [];

  try {
    // This array holds the final key=value args
    for (const file of files) {
      const filePath = path.join(tempDir, file.name);
      const base64Data = file.content.split(",")[1]; // strip off data URI prefix
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      writtenFiles.push(filePath);
    }

    const args = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      const filePath = path.join(tempDir, file.name);

      if (name.includes("plan_sponsor")) {
        args.push(`plan_sponsor=${filePath}`);
      } else if (name.includes("recordkeeper")) {
        args.push(`recordkeeper=${filePath}`);
      } else if (name.includes("tpa_report")) {
        args.push(`tpa_report=${filePath}`);
      } else if (name.includes("statement_output")) {
        args.push(`statement_output=${filePath}`);
      } else if (name.includes("plan_rules")) {
        args.push(`plan_rules=${filePath}`);
      }
    }


    // Run the Python script from ../../rules_engine/
    const scriptPath = path.resolve(__dirname, "../../rules_engine/rules_engine_first_iteration.py");
    // const args = writtenFiles;


    console.log("Launching script with args:");
    args.forEach(arg => console.log("  " + arg));


    console.log("Checking that files exist:");
    writtenFiles.forEach(p => {
      console.log(`  ${p} → ${fs.existsSync(p) ? "OK" : "MISSING"}`);
    });


    const pythonProcess = spawn("python", [scriptPath, ...args]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", data => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", data => {
      stderr += data.toString();
    });

    pythonProcess.on("close", code => {
      // Clean up temp files
      writtenFiles.forEach(f => fs.unlinkSync(f));
      fs.rmdirSync(tempDir);

      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: `Python script exited with code ${code}`,
          stderr
        });
      }

      return res.status(200).json({
        success: true,
        result: stdout.trim()
      });
    });

  } catch (err) {
    console.error("Internal error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// endpoint for pretending to run a script, used for debugging
app.post("/run-fake-script", (req, res) => {
  const { filename } = req.body;
  console.log("Received filename:", filename);
  res.status(200).json({ result: `Analysis of "${filename}" complete!` });
});

// endpoint for receiving files and printing them, used for debugging
app.post("/submit-batch-test", (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  let responseText = `Received ${files.length} files:\n`;

  files.forEach((file, idx) => {
    const preview = file.content.slice(0, 100);
    responseText += `\n--- File ${idx + 1} ---\nName: ${file.name}\nContent (first 100 chars):\n${preview}\n`;
  });

  res.status(200).json({ success: true, received: files.length, log: responseText });
});



// Temporary login check for "admin"
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    return res.status(200).json({ success: true, message: "Login successful" });
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

app.listen(5000, () => console.log("Server running on port 5000"));
