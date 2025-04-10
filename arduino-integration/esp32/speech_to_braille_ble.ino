/*
 * Speech-to-Braille ESP32 BLE Integration
 * 
 * This sketch receives braille array data from the Speech-to-Braille web app
 * via Bluetooth Low Energy (BLE) and controls braille pins accordingly.
 * 
 * Hardware:
 * - Arduino Nano ESP32
 * - Solenoids or servos for braille dots (6 pins)
 * 
 * Connections:
 * - Braille dots 1-6 connected to pins D2-D7
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// BLE service and characteristic UUIDs (must match web app)
#define BRAILLE_SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BRAILLE_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

// Braille dot pins (standard 6-dot braille cell)
const int braillePins[] = {2, 3, 4, 5, 6, 7}; // Pins D2-D7
const int NUM_PINS = 6;

// BLE objects
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t currentBrailleState = 0;

// Custom callback for BLE connections
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
    
    // Reset all pins to off state
    for (int i = 0; i < NUM_PINS; i++) {
      digitalWrite(braillePins[i], LOW);
    }
    currentBrailleState = 0;
  }
};

// Custom callback for BLE characteristic operations
class CharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      Serial.print("Received braille data: ");
      
      // Process each braille cell in the value
      for (int i = 0; i < value.length(); i++) {
        uint8_t cellValue = value[i];
        
        // Set pins based on braille cell value
        // Each bit represents a dot in the braille cell
        for (int pin = 0; pin < NUM_PINS; pin++) {
          bool dotState = (cellValue >> pin) & 0x01;
          digitalWrite(braillePins[pin], dotState ? HIGH : LOW);
          Serial.print(dotState ? "1" : "0");
        }
        
        Serial.println();
        
        // Save the current state
        if (i == 0) { // Just save the first cell for status
          currentBrailleState = cellValue;
        }
      }
    }
  }
};

void setup() {
  // Initialize serial for debugging
  Serial.begin(115200);
  Serial.println("Starting Speech-to-Braille BLE Device");

  // Initialize braille pins as outputs and set to LOW
  for (int i = 0; i < NUM_PINS; i++) {
    pinMode(braillePins[i], OUTPUT);
    digitalWrite(braillePins[i], LOW);
  }

  // Initialize BLE device
  BLEDevice::init("Braille Display");
  
  // Create BLE server and set callbacks
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create BLE service
  BLEService* pService = pServer->createService(BRAILLE_SERVICE_UUID);

  // Create BLE characteristic
  pCharacteristic = pService->createCharacteristic(
    BRAILLE_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );
  
  // Set callbacks for characteristic
  pCharacteristic->setCallbacks(new CharacteristicCallbacks());
  
  // Add client characteristic descriptor
  pCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BRAILLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // helps with iPhone connections issue
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE server ready. Waiting for connections...");
}

void loop() {
  // Disconnection handling
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give the Bluetooth stack time to get ready
    pServer->startAdvertising(); // Restart advertising
    Serial.println("Restarting BLE advertising");
    oldDeviceConnected = deviceConnected;
  }
  
  // Connection handling
  if (deviceConnected && !oldDeviceConnected) {
    Serial.println("Device connected - ready to receive braille data");
    oldDeviceConnected = deviceConnected;
  }
  
  // Brief delay in the loop
  delay(100);
}