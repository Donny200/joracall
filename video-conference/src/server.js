const io = require('socket.io')(5000, {
    cors: {
        origin: '*',
    },
});

const rooms = {};

io.on('connection', (socket) => {
    socket.on('create-room', (roomId) => {
        rooms[roomId] = rooms[roomId] || [];
        rooms[roomId].push(socket.id);
        socket.join(roomId);
        console.log(`Room ${roomId} created`);
    });

    socket.on('join-room', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].push(socket.id);
            socket.join(roomId);
            socket.to(roomId).emit('user-joined', { userId: socket.id });
        }
    });

    socket.on('leave-room', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
            socket.to(roomId).emit('user-left', socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
    });
});
