const fs = require("fs");
const path = "./logs.txt";

function log(message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  };

  const text = JSON.stringify(entry) + "\n";
  fs.appendFileSync(path, text);

  console.log(text.trim());
}

module.exports = { log };
