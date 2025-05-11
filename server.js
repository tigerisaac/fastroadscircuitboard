const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('*', (_, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- JOYSTICK BRIDGE ---
const ARDUINO_PORT = 'COM4';
const BAUD = 9600;

try {
  const port = new SerialPort(ARDUINO_PORT, { baudRate: BAUD });
  const parser = port.pipe(new Readline({ delimiter: '\r\n' }));

  parser.on('data', (line) => {
    const [x, y] = line.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) {
      io.emit('joystick', { x, y });
    }
  });
} catch (err) {
  console.error('Failed to open serial port:', err.message);
}
// ------------------------

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
