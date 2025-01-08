const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIo } = require('socket.io-client'); // Client to connect to the laptop server

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to the laptop server
const laptopSocket = ClientIo('http://localhost:4000'); // Replace with the actual laptop server address if needed

// Setup EJS as the view engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('Phone connected:', socket.id);

    // Forward start-camera event to the laptop server
    socket.on('start-camera', () => {
        console.log('Start camera command received from phone');
        laptopSocket.emit('camera-start');
    });

    // Forward stop-camera event to the laptop server
    socket.on('stop-camera', () => {
        console.log('Stop camera command received from phone');
        laptopSocket.emit('camera-stop');
    });

    socket.on('disconnect', () => {
        console.log('Phone disconnected:', socket.id);
    });
});

// Render the phone interface
app.get('/', (req, res) => {
    res.render('index'); 
});

// Start the server
const PHONE_PORT = 3000;
server.listen(PHONE_PORT, '0.0.0.0', () => {
    console.log(`Phone server running at http://0.0.0.0:${PHONE_PORT}`);
});