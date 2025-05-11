// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io'); // Socket.IO server

// For COM4 Joystick (if you are still using it)
const { SerialPort } = require('serialport'); // Note the { } for named import
const { ReadlineParser } = require('@serialport/parser-readline'); // Note the { } and new name

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000; // Make sure this matches SOCKET_SERVER_URL in arduino-bridge.js
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

// Serve index.html for any other GET request
app.get('*', (_, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- JOYSTICK (COM4) BRIDGE ---
// This part handles your existing joystick on COM4.
// The new arduino-bridge.js (for rotary encoder) will handle COM14 separately.
const JOYSTICK_SERIAL_PORT = 'COM4'; // Your joystick port
const JOYSTICK_BAUD_RATE = 9600;
let joystickPortInstance; // To hold the joystick port instance

try {
  console.log(`Attempting to open joystick serial port ${JOYSTICK_SERIAL_PORT}...`);
  joystickPortInstance = new SerialPort({
    path: JOYSTICK_SERIAL_PORT,
    baudRate: JOYSTICK_BAUD_RATE,
    autoOpen: false, // We will open it manually after attaching error listeners
  });

  const joystickParser = joystickPortInstance.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  joystickPortInstance.on('open', () => {
    console.log(`Joystick serial port ${JOYSTICK_SERIAL_PORT} opened successfully.`);
  });

  joystickParser.on('data', (line) => {
    const [x, y] = line.split(',').map(s => parseInt(s.trim(), 10)); // Trim whitespace and parse as int
    if (!isNaN(x) && !isNaN(y)) {
      // console.log(`Joystick (COM4) data: x=${x}, y=${y}`);
      io.emit('joystick', { x, y }); // Emitting to all browser clients
    } else {
      // console.warn(`Received non-numeric joystick data from COM4: "${line}"`);
    }
  });

  joystickPortInstance.on('error', (err) => {
    console.error(`Error on joystick serial port ${JOYSTICK_SERIAL_PORT}:`, err.message);
    // You might not want to exit the whole server, just log the error
  });

  joystickPortInstance.on('close', () => {
    console.log(`Joystick serial port ${JOYSTICK_SERIAL_PORT} closed.`);
  });

  joystickPortInstance.open((err) => {
    if (err) {
      console.error(`Failed to open joystick serial port ${JOYSTICK_SERIAL_PORT}:`, err.message);
      console.log("If you are not using a joystick on COM4, this error can be ignored or this section of code can be removed/commented out.");
    }
  });

} catch (err) {
  // This catch block is for errors during the new SerialPort() or .pipe() setup.
  console.error(`Initial setup failed for joystick serial port ${JOYSTICK_SERIAL_PORT}:`, err.message);
  console.log("If you are not using a joystick on COM4, this error can be ignored or this section of code can be removed/commented out.");
}
// ------------------------

// --- Socket.IO Connection Handling ---
// This handles connections from browser clients AND from the arduino-bridge.js
io.on('connection', (socket) => {
    console.log('A client connected to the game server:', socket.id);

    // Listen for input from the arduino-bridge.js (which connects to COM14 for rotary encoder)
    // The arduino-bridge.js will emit 'arduinoInput' event
    socket.on('arduinoInput', (data) => {
        // data will be like { command: 'left' }, { command: 'right' }, or { command: 'reset' }
        console.log(`Received 'arduinoInput' (from rotary on COM14 via bridge, socket ${socket.id}):`, data);

        // Now, broadcast this command to all connected game clients (browsers)
        // All browser clients will receive 'gameControl'
        io.emit('gameControl', data);
        console.log(`Emitted 'gameControl' to all browser clients:`, data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected from game server:', socket.id);
    });

    // You can add other game-specific socket events here if needed
    // For example, if your browser clients send chat messages or other game state:
    // socket.on('chatMessage', (msg) => { io.emit('chatMessage', msg); });
});

server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
  console.log(`  - This server is attempting to listen directly on ${JOYSTICK_SERIAL_PORT} for joystick input (if available).`);
  console.log(`  - The separate 'arduino-bridge.js' (for COM14 rotary encoder) should connect to this server.`);
});