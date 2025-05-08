(async () => {
  const useKeyboard = confirm("Use keyboard + mouse instead of joystick?");

  window.input = window.input || { key: {} };

  if (useKeyboard) {
    console.log("Using keyboard + mouse controls.");
    return;
  }

  if (!("serial" in navigator)) {
    alert("Web Serial API not supported in this browser. Use Chrome or Edge.");
    return;
  }

  try {
    const ports = await navigator.serial.getPorts();
    const port = ports.find(p => p.getInfo().usbProductId !== undefined) || await navigator.serial.requestPort();

    await port.open({ baudRate: 9600 });

    const decoder = new TextDecoderStream();
    const inputDone = port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    const mid = 512;
    const deadzone = 100;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const [x, y] = value.trim().split(',').map(Number);
      if (isNaN(x) || isNaN(y)) continue;

      window.input.key["KeyW"] = y < (mid - deadzone);
      window.input.key["KeyS"] = y > (mid + deadzone);
      window.input.key["KeyA"] = x < (mid - deadzone);
      window.input.key["KeyD"] = x > (mid + deadzone);
    }

    reader.releaseLock();
  } catch (err) {
    alert("Could not access joystick on COM4: " + err.message);
    console.error(err);
  }
})();
