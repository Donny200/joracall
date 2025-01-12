const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Импортируем объект Server
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Настройка CORS для Express
app.use(
    cors({
        origin: 'http://localhost:3000', // Укажите адрес вашего фронтенда
        methods: ['GET', 'POST'], // Разрешенные методы
        credentials: true, // Если вы используете авторизацию или куки
    })
);

// Настройка Socket.IO с CORS
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000', // Укажите адрес вашего фронтенда
        methods: ['GET', 'POST'], // Разрешенные методы
        credentials: true, // Разрешите передачу данных авторизации
    },
});

// Логика для Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Создание комнаты
    socket.on('create-room', (roomId) => {
        socket.join(roomId);
        console.log(`Room created: ${roomId}`);
    });

    // Подключение к комнате
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);

        // Уведомляем других участников о новом подключении
        socket.to(roomId).emit('user-joined', { userId: socket.id });

        // Отправляем уже подключившимся участникам, что к ним добавился новый пользователь
        const otherUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(
            (userId) => userId !== socket.id
        );
        socket.emit('all-users', otherUsers);
    });

    // Передача медиа-потока
    socket.on('send-stream', ({ roomId, stream }) => {
        socket.to(roomId).emit('receive-stream', { userId: socket.id, stream });
    });

    // Демонстрация экрана
    socket.on('share-screen', ({ roomId, stream }) => {
        socket.to(roomId).emit('receive-screen', { userId: socket.id, stream });
    });

    // Остановка демонстрации экрана
    socket.on('stop-share-screen', (roomId) => {
        socket.to(roomId).emit('stop-screen-share', { userId: socket.id });
    });

    // Уведомление о выходе из комнаты
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left', socket.id);
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Запуск сервера
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
