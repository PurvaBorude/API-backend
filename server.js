const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
require("./workers/pingScheduler");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json());

// API routes (these must come BEFORE static files and catch-all)
app.use("/api/users", userRoutes);
app.use("/api/websites", websiteRoutes);

app.get("/ping", (req, res) => res.send("pong"));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// SPA catch-all handler
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  
  // index.html is inside the static folder
  const indexPath = path.join(__dirname, '../frontend/build/static', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Something went wrong!');
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));