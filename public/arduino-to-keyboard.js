// arduino-to-keyboard.js
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const robot = require('robotjs');

// --- Configuration ---
const SERIAL_PORT_PATH = 'COM14'; // Your Arduino's port for the rotary encoder
const BAUD_RATE = 9600;

// Key mapping: What keyboard key to press for each Arduino signal
// Based on your Python script, 'a'/'d' from Arduino likely map to left/right arrow keys
// and 'Reset' to space. Adjust if your game uses different keys.
const KEY_MAPPINGS = {
    'a': 'left',       // Arduino sends 'a' for counter-clockwise
    'd': 'right',      // Arduino sends 'd' for clockwise
    'reset': 'space'   // Arduino sends "Reset to 0 degrees"
};
// --- End Configuration ---

let serialPort;

function connectToSerial() {
    console.log(`Attempting to connect to serial port ${SERIAL_PORT_PATH} at ${BAUD_RATE} baud...`);
    try {
        serialPort = new SerialPort({ path: SERIAL_PORT_PATH, baudRate: BAUD_RATE });
        const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        serialPort.on('open', () => {
            console.log(`Serial port ${SERIAL_PORT_PATH} opened successfully.`);
            console.log('Ensure the game window is focused to receive keyboard inputs.');
            console.log('Mappings:');
            console.log(`  Arduino 'a' -> Keyboard '${KEY_MAPPINGS.a}'`);
            console.log(`  Arduino 'd' -> Keyboard '${KEY_MAPPINGS.d}'`);
            console.log(`  Arduino 'Reset...' -> Keyboard '${KEY_MAPPINGS.reset}'`);
        });

        parser.on('data', (data) => {
            const trimmedData = data.toString().trim();
            // console.log('Data from Arduino:', trimmedData); // Optional: for debugging

            let keyToPress = null;

            if (trimmedData === 'a') {
                keyToPress = KEY_MAPPINGS.a;
            } else if (trimmedData === 'd') {
                keyToPress = KEY_MAPPINGS.d;
            } else if (trimmedData.toLowerCase().includes('reset')) {
                keyToPress = KEY_MAPPINGS.reset;
            }

            if (keyToPress) {
                try {
                    console.log(`Arduino: '${trimmedData}', Simulating key press: '${keyToPress}'`);
                    robot.keyTap(keyToPress);
                } catch (e) {
                    console.error(`Error simulating key press for '${keyToPress}':`, e.message);
                    console.error("This might be a permissions issue or robotjs setup problem.");
                }
            } else {
                // console.log('Unknown data from Arduino, not mapped to a key:', trimmedData);
            }
        });

        serialPort.on('error', (err) => {
            console.error('SerialPort Error: ', err.message);
            if (serialPort && serialPort.isOpen) {
                serialPort.close();
            }
            console.log('Attempting to reconnect in 5 seconds...');
            setTimeout(connectToSerial, 5000);
        });

        serialPort.on('close', () => {
            console.log('Serial port closed. Attempting to reconnect in 5 seconds...');
            setTimeout(connectToSerial, 5000);
        });

    } catch (err) {
        console.error(`Failed to initialize serial port ${SERIAL_PORT_PATH}: ${err.message}`);
        console.log('Ensure the port is correct and not in use. Retrying in 5 seconds...');
        setTimeout(connectToSerial, 5000);
    }
}

// Start the connection process
connectToSerial();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT received. Closing serial port...');
    if (serialPort && serialPort.isOpen) {
        serialPort.close(() => {
            console.log('Serial port closed.');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});