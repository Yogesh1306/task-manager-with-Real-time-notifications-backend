import './config/envConfig.js'
import { app } from './app.js';
import connectDB from './config/db.js';
import http from "node:http"
import { initSocket } from './config/socket.js';

try {
  await connectDB();
  const PORT = process.env.PORT;
  const server = http.createServer(app);

  await initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running at ${process.env.BACKEND_URL}${PORT}`);
  });
} catch (error) {
  console.log(`Error connecting to DB: ${error}`);
}
