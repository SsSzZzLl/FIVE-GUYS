import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import leaderboardRouter from "./routes/leaderboard.routes.js";
import marketplaceRouter from "./routes/marketplace.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "512kb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/marketplace", marketplaceRouter);

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
      message: "服务器内部错误",
    });
  },
);

const PORT = Number(process.env.PORT ?? "4100");

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});

