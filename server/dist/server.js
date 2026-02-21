"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const RoomManager_1 = require("./game/RoomManager");
const socketHandlers_1 = require("./socket/socketHandlers");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    credentials: true
}));
app.use(express_1.default.json());
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
const roomManager = new RoomManager_1.RoomManager();
(0, socketHandlers_1.setupSocketHandlers)(io, roomManager);
const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
    logger_1.logger.cleanup('Running periodic room cleanup...');
    roomManager.cleanupStaleRooms();
    const memUsage = process.memoryUsage();
    logger_1.logger.memory(`Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    logger_1.logger.info(`Active rooms: ${roomManager.getRoomCount()}, Connected clients: ${io.engine.clientsCount}`);
}, CLEANUP_INTERVAL);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    logger_1.logger.info(`Mafia Server running on port ${PORT}`);
    logger_1.logger.info(`Socket.IO server ready for connections`);
    logger_1.logger.info(`Automatic cleanup enabled (every ${CLEANUP_INTERVAL / 60000} minutes)`);
    logger_1.logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
});
