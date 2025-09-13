const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const websiteRoutes = require("./routes/websiteRoutes");
require("./workers/pingScheduler");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000"; // set it in Render environment variables , no hardcoding


app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));


app.use(express.json());

app.use("/api/users", userRoutes);      // user routes
app.use("/api/websites", websiteRoutes); // website monitoring routes

app.get("/ping", (req, res) => res.send("pong"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

