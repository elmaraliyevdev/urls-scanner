import express from "express";
import bodyParser from "body-parser";
import scanRoutes from "./routes/scanRoutes";

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use("/api/scans", scanRoutes);

export default app;
