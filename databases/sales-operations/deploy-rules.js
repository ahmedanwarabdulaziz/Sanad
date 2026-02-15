const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const env = { ...process.env };

if (fs.existsSync(serviceAccountPath)) {
  env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(serviceAccountPath);
}

const child = spawn("firebase", ["deploy", "--only", "firestore", "--non-interactive"], {
  stdio: "inherit",
  shell: true,
  env,
  cwd: path.join(__dirname, "../.."),
});

child.on("exit", (code) => process.exit(code ?? 1));
