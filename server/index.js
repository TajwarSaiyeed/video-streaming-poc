import fs from "fs";
import cors from "cors";
import path from "path";
import multer from "multer";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process"; // watch out

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use((req, res, next) => {
  // res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Origin", "*");
  //   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With,Origin, Accept"
  );
  //   res.header("Access-Control-Allow-Credentials", true);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// multer middleware

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const ext =
      file.fieldname + "-" + uuidv4() + path.extname(file.originalname);
    cb(null, ext);
  },
});

// multer configuration
const upload = multer({
  storage: storage,
  // limits: {
  //   fileSize: 1024 * 1024 * 5,
  // },
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/upload", upload.single("file"), (req, res) => {
  const lessonId = uuidv4();
  const videoPath = req.file.path;
  const outputPath = `./uploads/courses/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.table({ lessonId, videoPath, outputPath, hlsPath });

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, {
      recursive: true,
    });
  }

  // ffmpeg
  // const ffmpegCommand = `ffmpeg -i ${videoPath} -vf scale=w=640:h=360:force_original_aspect_ratio=decrease -c:a aac -ar 48000 -c:v h264 -profile:v main -crf 20 -sc_threshold 0 -g 48 -keyint_min 48 -hls_time 4 -hls_playlist_type vod -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k -hls_segment_filename ${outputPath}/360p_%03d.ts ${hlsPath}`;

  const ffmpegCommand = `ffmpeg -i ${videoPath} -c:v libx264 -c:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`; 

  // no queue, just POC
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });

  const videoUrl = `http://localhost:5000/uploads/courses/${lessonId}/index.m3u8`;

  res.json({ videoUrl });
});

app.listen(5000, () => {
  console.log("Server started on http://localhost:5000");
});
