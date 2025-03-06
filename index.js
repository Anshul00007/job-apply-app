const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

const JWT_SECRET = "1233ajsjd";
const MONGO_URI = ""

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const uploadTemp = multer({
  storage: tempStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "text/plain"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are allowed"), false);
    }
  }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String
});

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  postedBy: mongoose.Schema.Types.ObjectId
});

const applicationSchema = new mongoose.Schema({
  jobId: mongoose.Schema.Types.ObjectId,
  jobTitle: String,
  candidate: String,
  resume: String,
  status: { type: String, default: "Pending" },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Job = mongoose.model("Job", jobSchema);
const Application = mongoose.model("Application", applicationSchema);

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (e) {
    res.status(401).send({ error: "Please authenticate" });
  }
};

app.post("/signup", async (req, res) => {
  try {
    const user = new User({
      ...req.body,
      password: await bcrypt.hash(req.body.password, 8),
      role: req.body.role
    });
    await user.save();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.send({ user, token });
  } catch (e) {
    res.status(400).send(e);
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) {
      return res.status(401).send({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.send({ user, token });
  } catch (e) {
    res.status(400).send({ error: "Login failed" });
  }
});

app.post("/logout", (req, res) => {
  res.send({ message: "Logged out" });
});

app.get("/me", auth, (req, res) => {
  res.send(req.user);
});

app.get("/jobs", async (req, res) => {
  const jobs = await Job.find();
  res.send(jobs);
});

app.post("/add-job", auth, async (req, res) => {
  const job = new Job({ ...req.body, postedBy: req.user._id });
  await job.save();
  res.send(job);
});

app.put("/update-job/:id", auth, async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.send(job);
});

app.delete("/delete-job/:id", auth, async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.send({ message: "Job deleted" });
});

app.get("/applications/:jobId", auth, async (req, res) => {
  const applications = await Application.find({ jobId: req.params.jobId });
  res.send(applications);
});

app.post("/apply", auth, uploadTemp.single("resume"), async (req, res) => {
  try {
    const existingApplication = await Application.findOne({
      jobId: req.body.jobId,
      candidate: req.user.name
    });
    if (existingApplication) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).send({ error: "You have already applied for this job" });
    }
  
    const job = await Job.findById(req.body.jobId);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' });
    const readStream = fs.createReadStream(req.file.path);
    const uploadStream = bucket.openUploadStream(req.file.filename, {
      contentType: req.file.mimetype
    });
  
    readStream.pipe(uploadStream)
      .on("error", (error) => {
        console.error("Error uploading file to GridFS:", error);
        res.status(500).send({ error: "Error uploading file" });
      })
      .on("finish", async () => {
        fs.unlink(req.file.path, () => {});
        const application = new Application({
          jobId: req.body.jobId,
          jobTitle: job.title,
          candidate: req.user.name,
          resume: uploadStream.id.toString()
        });
        await application.save();
        res.send(application);
      });
  } catch (error) {
    console.error("Error during application process:", error);
    res.status(500).send({ error: "Server error while processing application" });
  }
});

app.put("/update-status/:id", auth, async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) {
    return res.status(404).send({ error: "Application not found" });
  }
  if (application.status === "Accepted" || application.status === "Rejected") {
    return res.status(400).send({ error: "Cannot update status of accepted or rejected application" });
  }
  application.status = req.body.status;
  await application.save();
  res.send(application);
});

app.get("/resume/:id", async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' });
    const _id = new mongoose.Types.ObjectId(req.params.id);
    bucket.find({ _id }).toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).send("File not found");
      }
      bucket.openDownloadStream(_id).pipe(res);
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));