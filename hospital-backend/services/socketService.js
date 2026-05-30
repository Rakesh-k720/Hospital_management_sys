let io = null;

exports.init = (socketServer) => {
    io = socketServer;
};

exports.emitQueueUpdate = (payload) => {
    if (io) io.emit('queue:update', payload);
};

exports.getIo = () => io;
