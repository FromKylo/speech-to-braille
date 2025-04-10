## ESP32 Circuit Diagram for Braille Display

This document provides a detailed circuit diagram and connection information for implementing the physical braille display with an Arduino Nano ESP32.

### Basic Wiring Diagram

```
                           Arduino Nano ESP32
                           +-------------+
                           |             |
                           |         3V3 o-----------------+
                           |             |                 |
                           |         GND o---------+      |
                           |             |         |      |
                           |         D2  o---------+------+--> Braille Dot 1
                           |             |         |      |
                           |         D3  o---------+------+--> Braille Dot 2
                           |             |         |      |
                           |         D4  o---------+------+--> Braille Dot 3
                           |             |         |      |
                           |         D5  o---------+------+--> Braille Dot 4
                           |             |         |      |
                           |         D6  o---------+------+--> Braille Dot 5
                           |             |         |      |
                           |         D7  o---------+------+--> Braille Dot 6
                           |             |
                           +-------------+
```

### Enhanced Circuit with Solenoid Drivers

For solenoid-based actuators, you'll need transistors or MOSFETs to handle the higher current requirements:

```
                     +5V External Power
                         |
                         |
                         v
                 +-------+-------+
                 |               |
                 |               |
                 |              Load
                 |       (Solenoid/Actuator)
                 |               |
                 |               |
                 |          Collector
                 |               |
Arduino Nano     |     +----+   |
ESP32            |     |    |   |
   +             |     |    v   |
   |          Resistor |  +-----+----+
   v             |     |  |     |    |
+--o D2          +-----+--|     |    |
|                          | NPN |    +---> GND
|  1kΩ                     |     |
+--www-------------------->| Base|
                           +-----+----+
                                 |    |
                                 |    |
                                 |    |
                                 +----+
                                 Emitter
                                    |
                                    v
                                   GND
```

### Component List

1. **Arduino Nano ESP32** - Main microcontroller
2. **Braille Actuators** (6 units) - Choose one of these options:
   - Small solenoids (5V or 12V)
   - Micro servos
   - Shape memory alloy wires

3. **Driver Components** (if using solenoids):
   - NPN Transistors (e.g., 2N2222, BC337) or MOSFETs (e.g., IRLZ44N) - 6 units
   - 1kΩ resistors - 6 units
   - Diodes (1N4001 or similar) - 6 units (for back EMF protection)

4. **Power Supply**:
   - 5V power supply for ESP32
   - Separate power supply for actuators (voltage depends on actuator type)

### Detailed Connection Instructions

1. **Using Solenoids**:
   - Connect each solenoid between the power supply and the collector of its transistor
   - Connect the emitter of each transistor to ground
   - Connect each ESP32 pin (D2-D7) to the base of its transistor through a 1kΩ resistor
   - Add a flyback diode in parallel with each solenoid (cathode to power, anode to collector)

2. **Using Servos**:
   - Connect servo signal wires directly to ESP32 pins D2-D7
   - Connect servo power wires to an appropriate power supply (typically 5V)
   - Connect servo ground wires to ground

### Code Modification Notes

If using servos instead of solenoids, modify the Arduino code to use the Servo library:

```cpp
#include <Servo.h>

// Create servo objects for each braille dot
Servo servoDot1;
Servo servoDot2;
// ... and so on for all 6 dots

void setup() {
  // Attach servos to pins
  servoDot1.attach(2);
  servoDot2.attach(3);
  // ... attach the rest
  
  // Initialize all servos to "dot down" position
  servoDot1.write(0);
  servoDot2.write(0);
  // ... initialize the rest
}

// Then modify the CharacteristicCallbacks::onWrite method to control servos
// instead of digital pins:

void onWrite(BLECharacteristic* pCharacteristic) {
  std::string value = pCharacteristic->getValue();
  if (value.length() > 0) {
    uint8_t cellValue = value[0];
    
    // Set servos based on braille cell value
    // For each bit that is 1, move servo to "dot up" position (e.g., 180°)
    // For each bit that is 0, move servo to "dot down" position (e.g., 0°)
    
    servoDot1.write((cellValue & 0x01) ? 180 : 0);
    servoDot2.write((cellValue & 0x02) ? 180 : 0);
    // ... and so on for all 6 dots
  }
}
```

### Power Considerations

- Solenoids or other actuators may require more current than the ESP32 can provide
- Always use a separate power supply for actuators, with common ground
- Consider adding a capacitor (e.g., 1000μF) across the actuator power supply to handle current spikes