const express = require("express");
const app = express();
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Proxy all requests to Google Generative Language API
app.all("*", async (req, res) => {
  const targetUrl = `https://generativelanguage.googleapis.com${req.path}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;

  try {
    const fetchModule = await import("node-fetch");
    const fetch = fetchModule.default;

    const headers = { "Content-Type": "application/json" };
    if (req.headers["x-goog-api-key"]) {
      headers["x-goog-api-key"] = req.headers["x-goog-api-key"];
    }

    const options = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const data = await response.text();

    res.status(response.status).send(data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gemini proxy running on port ${PORT}`));
