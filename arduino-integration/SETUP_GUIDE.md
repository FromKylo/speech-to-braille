# Connecting the Speech-to-Braille Web App to an Arduino Nano ESP32

This guide will help you set up the Arduino Nano ESP32 to work with the Speech-to-Braille web application via Bluetooth Low Energy (BLE).

## Hardware Requirements

- Arduino Nano ESP32 (not to be confused with regular Arduino Nano)
- Braille display mechanism (solenoids, servos, or other actuators)
- USB-C cable for programming the Arduino Nano ESP32
- Power supply for the Arduino (USB or external)
- Breadboard and jumper wires (for prototyping)

## Circuit Setup

### Braille Cell Connections

The project uses digital pins 2-7 on the Arduino Nano ESP32 to control a 6-dot braille cell:

| Braille Dot | Arduino Nano ESP32 Pin |
|-------------|------------------------|
| Dot 1       | D2                     |
| Dot 2       | D3                     |
| Dot 3       | D4                     |
| Dot 4       | D5                     |
| Dot 5       | D6                     |
| Dot 6       | D7                     |

**Important Note**: The Arduino Nano ESP32 uses different pin numberings than standard Arduino boards. Make sure you're using the GPIO numbers as labeled on the Nano ESP32 board.

See the detailed circuit diagram in [CIRCUIT_DIAGRAM.md](esp32/CIRCUIT_DIAGRAM.md) for more information.

## Software Setup

### Step 1: Install Required Software

1. Download and install the [Arduino IDE](https://www.arduino.cc/en/software) (version 2.0 or newer recommended for best ESP32 support)
2. Launch the Arduino IDE
3. Go to File → Preferences
4. Add the following URL to the "Additional Boards Manager URLs" field:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
5. Click OK
6. Go to Tools → Board → Boards Manager
7. Search for "esp32" and install the "ESP32 by Espressif Systems" package (version 2.0.5 or newer)

### Step 2: Install Required Libraries

1. In the Arduino IDE, go to Sketch → Include Library → Manage Libraries
2. Search for and install the following libraries:
   - ESP32 BLE Arduino (by Neil Kolban)
   - BLE Device (should be included with the ESP32 Arduino package)

### Step 3: Configure the Arduino IDE for Nano ESP32

1. Select the correct board from Tools → Board → ESP32 Arduino → "Arduino Nano ESP32"
2. Set the following parameters under the Tools menu:
   - Upload Speed: 921600
   - CPU Frequency: 240MHz (WiFi/BT)
   - Flash Frequency: 80MHz
   - Flash Mode: QIO
   - Flash Size: 4MB (32Mb)
   - Partition Scheme: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
   - Core Debug Level: None
   - PSRAM: Disabled

### Step 4: Upload the Sketch

1. Connect your Arduino Nano ESP32 to your computer via USB-C cable
2. Open the [speech_to_braille_ble.ino](esp32/speech_to_braille_ble.ino) sketch in the Arduino IDE
3. Select the correct port from Tools → Port (note that the Nano ESP32 typically appears as a USB Serial device)
4. Press and hold the BOOT button on the Nano ESP32 while clicking the upload button (right arrow) in the IDE
5. Release the BOOT button after the upload begins
6. Once uploaded, open the Serial Monitor (Tools → Serial Monitor) and set the baud rate to 115200 to verify the device is running and advertising as "Braille Display"

## Power Considerations for Arduino Nano ESP32

The Arduino Nano ESP32 can be powered in several ways:

1. **USB-C Connection**: Provides 5V power while connected to a computer or power adapter
2. **VIN Pin**: Accept 5-21V DC (7-12V recommended) for external power
3. **3.3V Pin**: The board operates at 3.3V logic level (not 5V like standard Arduino)

**Important**: The GPIO pins are NOT 5V tolerant. If you're connecting components that use 5V logic, you'll need level shifters to protect the Nano ESP32.

## Connecting the Web App to the Arduino

### Step 1: Open the Speech-to-Braille Web App

1. Open the Speech-to-Braille web application in a Bluetooth-compatible browser (Chrome, Edge, or Opera on desktop; most modern browsers on Android)
2. Note: iOS devices have limited Web Bluetooth API support and may not work

### Step 2: Connect to the Arduino

1. In the web app, click the "Connect BLE Device" button in the settings panel
2. A dialog will appear showing available Bluetooth devices
3. Select "Braille Display" from the list
4. If prompted, authorize the connection
5. The web app will display "Connected to Braille Display" when successful

### Step 3: Test the Connection

1. Speak into your microphone or type text into the input field
2. The translated braille pattern should appear on both the web interface and the physical braille display connected to the Arduino

## Troubleshooting

### Arduino Not Appearing in the Device List

- Make sure the Arduino is powered on and the code is uploaded successfully
- Check that your browser supports Web Bluetooth API (Chrome, Edge, or Opera recommended)
- Try refreshing the web page and attempting the connection again
- Ensure your computer's Bluetooth is enabled
- Try resetting the Arduino Nano ESP32 by pressing the reset button
- If upload fails, try holding the BOOT button while connecting the board, then release after the IDE connects

### Braille Output Doesn't Match the Web Interface

- Check the serial monitor output for debugging information
- Verify that the pin connections match the pin definitions in the code
- Make sure the actuators (solenoids/servos) are properly connected and functioning

### Connection Drops Frequently

- Keep the Arduino close to your computer to maintain a strong Bluetooth connection
- Check the Arduino's power supply - low power can cause connection issues
- Try using an external power supply instead of USB power if issues persist
- The ESP32 can experience brownouts if power is insufficient - check the serial monitor for "Brownout detector was triggered" messages

### ESP32-Specific Issues

- If you see "Connecting..." message that never completes during upload, try holding down the BOOT button until the connection starts
- If the BLE connection is unstable, try reducing the CPU frequency to 160MHz in the Arduino IDE settings
- If the serial monitor shows garbled text, make sure the baud rate matches the one in the code (115200)

## Additional Resources

- [Arduino Nano ESP32 Official Documentation](https://docs.arduino.cc/hardware/nano-esp32)
- [ESP32 BLE Arduino Library Documentation](https://github.com/nkolban/ESP32_BLE_Arduino)
- [ESP32 Power Management Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/power_management.html)

## Need Help?

If you encounter any issues not covered in this guide, please refer to the project documentation or open an issue on the project repository.

Last Updated: April 10, 2025