# Speech-to-Braille Arduino ESP32 Integration

This documentation explains how to integrate the Speech-to-Braille web application with an Arduino Nano ESP32 microcontroller to create a physical braille output device.

## Overview

The integration allows the web application to send braille cell pattern data to the Arduino Nano ESP32 via Bluetooth Low Energy (BLE). The ESP32 then activates the appropriate braille dot pins to physically represent the braille pattern.

## Hardware Requirements

- Arduino Nano ESP32 or compatible board
- Braille cell actuators (solenoids, servos, or other mechanical components)
- Power supply appropriate for your actuators
- USB cable for programming the ESP32

## Connection Diagram

```
                         +----------------+
                         |                |
+----------------+  BLE  |  Arduino Nano  |       +----------------+
|  Web Browser   | <---> |     ESP32      | <---> | Braille Output |
|  PWA Running   |       |                |       | Actuators      |
+----------------+       +----------------+       +----------------+
```

## Braille Pin Mapping

The Arduino sketch uses pins D2-D7 for the six braille dots in a standard braille cell:

```
Braille Cell:     Arduino Pins:
   1 4               D2 D5
   2 5               D3 D6
   3 6               D4 D7
```

## Setup Instructions

1. **Prepare the Arduino IDE:**
   - Install the Arduino IDE (2.0 or later recommended)
   - Add ESP32 board support via Boards Manager
   - Install required libraries:
     - BLEDevice (included with ESP32 board support)

2. **Upload the Sketch:**
   - Open `speech_to_braille_ble.ino` in the Arduino IDE
   - Select the appropriate board (Arduino Nano ESP32)
   - Upload the sketch to your ESP32 board

3. **Connect Hardware:**
   - Connect each braille actuator to pins D2-D7
   - Ensure proper power supply for your actuators
   - For solenoids, you may need additional driver circuitry (transistors or MOSFETs)

4. **Test the Connection:**
   - Open the Speech-to-Braille web app in Chrome or Edge browser
   - Click "Connect to Braille Device" in the app
   - Select the "Braille Display" device from the Bluetooth pairing dialog
   - After connecting, speak into the microphone to test the system

## How It Works

1. The web app recognizes speech and converts it to text
2. The text is matched against a braille database to find corresponding braille patterns
3. The matched braille pattern is sent to the ESP32 via BLE
4. The ESP32 activates the appropriate pins to form the physical braille pattern

## Data Format

The braille data is sent as byte values where each bit represents a dot:
- Bit 0 (LSB) = Dot 1
- Bit 1 = Dot 2
- Bit 2 = Dot 3
- Bit 3 = Dot 4
- Bit 4 = Dot 5
- Bit 5 = Dot 6

For example, the letter 'A' in braille is dot 1 only, which would be represented as:
```
Binary: 00000001
Decimal: 1
```

## Troubleshooting

1. **Cannot connect via BLE:**
   - Ensure the ESP32 is powered and running (check serial monitor)
   - Make sure you're using a compatible browser (Chrome or Edge)
   - Try resetting the ESP32

2. **No physical output when braille patterns change:**
   - Check your actuator connections
   - Verify power supply is adequate
   - Use the serial monitor to confirm data is being received

3. **Connection keeps dropping:**
   - Reduce distance between device and computer
   - Check for interference from other devices
   - Ensure ESP32 has stable power

## Extending the System

- Add more braille cells by extending the pin array and modifying the data handling
- Implement a feedback mechanism from the physical device to the web app
- Add haptic feedback or sound indicators for each pattern change