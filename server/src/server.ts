import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './game/RoomManager';
import { setupSocketHandlers } from './socket/socketHandlers';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
  credentials: true
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/stats', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    activeRooms: roomManager.getRoomCount(),
    connectedClients: io.engine.clientsCount,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    },
    uptime: `${Math.round(process.uptime() / 60)} minutes`,
    timestamp: new Date().toISOString()
  });
});

const roomManager = new RoomManager();
setupSocketHandlers(io, roomManager);

const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  logger.cleanup('Running periodic room cleanup...');
  roomManager.cleanupStaleRooms();
  const memUsage = process.memoryUsage();
  logger.memory(`Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  logger.info(`Active rooms: ${roomManager.getRoomCount()}, Connected clients: ${io.engine.clientsCount}`);
}, CLEANUP_INTERVAL);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`Mafia Server running on port ${PORT}`);
  logger.info(`Socket.IO server ready for connections`);
  logger.info(`Automatic cleanup enabled (every ${CLEANUP_INTERVAL / 60000} minutes)`);
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
});
