const http = require('http');
const app = require('./app');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const socketService = require('./services/socketService');

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] }
});

socketService.init(io);

io.on('connection', (socket) => {
    socket.join('lobby');
    socket.on('lobby:subscribe', () => socket.join('lobby'));
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API docs: http://localhost:${PORT}/api/docs`);
    console.log(`WebSocket enabled for live OPD queue`);
});

module.exports = server;
