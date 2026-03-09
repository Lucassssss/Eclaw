import express from "express";
import cors from "cors";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(router);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
