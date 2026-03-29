import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDist = path.resolve(__dirname, "../../mosaic-maker/dist/public");
const frontendIndex = path.join(frontendDist, "index.html");

console.log("frontendDist:", frontendDist);
console.log("frontendIndex exists:", fs.existsSync(frontendIndex));

if (fs.existsSync(frontendDist) && fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(frontendIndex);
  });
}

export default app;
