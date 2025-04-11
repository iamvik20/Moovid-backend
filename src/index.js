const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();


const app = express();
const origins = [
    process.env.FRONTEND_URL,
    'https://moovid-zeta.vercel.app'
]
app.use(cors(origins));
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: origins,
        methods: ['GET', 'POST'],
    },
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    //Join Room
    socket.on('join-room', (roomId, userId) => {
        console.log(`User ${userId} joined room: ${roomId}`);

        // Check if the room exists, if not create it
        if (!rooms[roomId]) {
            rooms[roomId] = { users: [] };
        }

        // Add the user to the room
        rooms[roomId].users.push({
            id: userId,
            socketId: socket.id,
        });

        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        //send room info to the new user
        io.to(socket.id).emit('room-info', rooms[roomId]);
    });

    //WebRTC signaling
    socket.on('send-signal', (roomId, signal, receiverId) => {
        socket.to(roomId).emit('receive-signal', signal, socket.id);
    });

    //Playback sync
    socket.on('sync-action', (roomId, action) => {
        socket.to(roomId).emit('action', action);
    });

    //Handle user disconnection
    socket.on('disconnect', () => {
        const roomsList = Array.from(socket.rooms);
        roomsList.forEach((roomId) => {
            if (rooms[roomId]) {
                // Remove the user from the room
                rooms[roomId].users = rooms[roomId].users.filter(
                    (user) => user.socketId !== socket.id
                );

                // Notify other users in the room
                socket.to(roomId).emit('user-disconnected', socket.id);

                // If no users left in the room, delete it
                if (rooms[roomId].users.length === 0) {
                    delete rooms[roomId];
                }
            }
        });

        // socket.on('message', (msg) => {
        //     console.log('Message received: ' + msg);
        //     io.emit('message', msg);
        // });
    })
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});