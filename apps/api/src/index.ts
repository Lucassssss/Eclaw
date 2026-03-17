import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import killPort from 'kill-port';

const app = express();
const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (err) => {
  console.error('[API] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[API] Unhandled Rejection:', reason);
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  try {
    next();
  } catch (err: any) {
    console.error('[API] Route error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.use(router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer(retry = false) {
  return new Promise((resolve) => {
    try {
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
            resolve(null);
          } catch (e) {
            console.error('[API] Failed to kill port:', e);
            resolve(null);
          }
        } else {
          console.error('[API] Server error:', error.message);
          resolve(null);
        }
      });
    } catch (err: any) {
      console.error('[API] Failed to start server:', err.message);
      resolve(null);
    }
  });
}

startServer().then(() => {
  console.log('[API] Server initialization complete');
});
