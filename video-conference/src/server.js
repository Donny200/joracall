const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let usersInRoom = {};

io.on('connection', (socket) => {
    socket.on('join', ({ room }) => {
        socket.join(room);
        usersInRoom[socket.id] = room;
        socket.to(room).emit('new-user', socket.id);
    });

    socket.on('offer', ({ offer, userId }) => {
        socket.to(userId).emit('offer', offer, socket.id);
    });

    socket.on('answer', ({ answer, userId }) => {
        socket.to(userId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (candidate, userId) => {
        socket.to(userId).emit('ice-candidate', candidate, socket.id);
    });

    socket.on('user-left', (roomId) => {
        socket.leave(roomId);
        delete usersInRoom[socket.id];
        socket.to(roomId).emit('user-left');
    });

    socket.on('end-conference', (roomId) => {
        io.to(roomId).emit('end-conference');
    });

    socket.on('disconnect', () => {
        const roomId = usersInRoom[socket.id];
        delete usersInRoom[socket.id];
        socket.to(roomId).emit('user-left');
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
