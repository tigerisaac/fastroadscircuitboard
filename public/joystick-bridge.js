(async () => {
  const useJoystick = confirm("Use Arduino joystick? Click 'Cancel' to use keyboard.");

  window.input = window.input || { key: {} };

  if (!useJoystick) {
    console.log("Using keyboard input.");
    return; // WASD will work as normal
  }

  if (!("serial" in navigator)) {
    alert("Web Serial API not supported in this browser. Use Chrome or Edge.");
    return;
  }

  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const decoder = new TextDecoderStream();
    const inputDone = port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    console.log("Joystick connected.");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const [x, y] = value.trim().split(',').map(Number);
      if (isNaN(x) || isNaN(y)) continue;

      const deadzone = 100;
      const mid = 512;

      window.input.key["KeyW"] = y < (mid - deadzone);
      window.input.key["KeyS"] = y > (mid + deadzone);
      window.input.key["KeyA"] = x < (mid - deadzone);
      window.input.key["KeyD"] = x > (mid + deadzone);
    }

    reader.releaseLock();
  } catch (err) {
    alert("Failed to open serial port: " + err);
    console.error(err);
  }
})();
