const express = require("express");
const https = require("https");
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
app.all("*", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const targetPath = `${req.path}${qs}`;
  const bodyData = (req.method !== "GET" && req.method !== "HEAD")
    ? JSON.stringify(req.body)
    : undefined;

  const options = {
    hostname: "generativelanguage.googleapis.com",
    path: targetPath,
    method: req.method,
    headers: { "Content-Type": "application/json" },
  };
  if (bodyData) options.headers["Content-Length"] = Buffer.byteLength(bodyData);

  console.log(`Proxying ${req.method} ${targetPath}`);

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    res.setHeader("Content-Type", "application/json");
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({ error: err.message });
  });

  if (bodyData) proxyReq.write(bodyData);
  proxyReq.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gemini proxy running on port ${PORT}`));
