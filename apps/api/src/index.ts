import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { redis } from 'bun'
import killPort from 'kill-port';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(router);

async function startServer(retry = false) {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      resolve(server);
    });

    server.on('error', async (error: any) => {
      if (error.code === 'EADDRINUSE' && !retry) {
        console.log(`Port ${PORT} in use, killing process...`);
        try {
          await killPort(PORT, 'tcp');
          await new Promise(r => setTimeout(r, 500));
          server.close();
          await startServer(true);
          // Bun.serve({
          //   fetch: app.fetch,
          //   port: PORT,
          // });
          resolve(null);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(error);
      }
    });
  });
}

startServer();
