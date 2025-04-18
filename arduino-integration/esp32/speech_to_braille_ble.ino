/*
 * Speech-to-Braille ESP32 BLE Integration
 * 
 * This sketch receives braille array data from the Speech-to-Braille web app
 * via Bluetooth Low Energy (BLE) and controls braille pins accordingly.
 * 
 * Hardware:
 * - Arduino Nano ESP32
 * - Solenoids or servos for braille dots (6 pins)
 * - LED for connection indicator (pin 13)
 * 
 * Connections:
 * - Braille dots 1-6 connected to pins D2-D7
 * - Status LED connected to pin D13
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <ArduinoJson.h>

// BLE service and characteristic UUIDs (must match web app)
#define BRAILLE_SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BRAILLE_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

// Define the GPIO pins for each braille cell (using the same structure as Version1.ino)
const int braillePins[3][6] = {
  {2, 3, 4, 5, 6, 7},     // Braille Cell 1
  {8, 9, 10, 11, 12, 13},     // Braille Cell 2
  {17, 20, 21, 22, 23, 24}  // Braille Cell 3
};
const int NUM_CELLS = 3;
const int NUM_PINS = 6;

// Define the LED pin for connection status
const int STATUS_LED_PIN = 13;
const int HEARTBEAT_INTERVAL = 1000; // 1 second interval for blink when not connected
unsigned long lastHeartbeatTime = 0;
bool ledState = false;

// Phase constants
const uint8_t PHASE_NOT_OUTPUT = 0;
const uint8_t PHASE_OUTPUT = 1;
uint8_t currentPhase = PHASE_NOT_OUTPUT;

// Auto-reset timeout for braille output
const unsigned long OUTPUT_TIMEOUT = 3000; // 3 seconds without new data to auto-reset
unsigned long lastOutputTime = 0;
bool outputActive = false;

// BLE objects
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint8_t currentBrailleState = 0;

// Function to lower all braille dots
void lowerAllDots() {
  for (int cell = 0; cell < NUM_CELLS; cell++) {
    for (int i = 0; i < NUM_PINS; i++) {
      digitalWrite(braillePins[cell][i], LOW);
    }
  }
  currentBrailleState = 0;
  Serial.println("Lowered all dots");
}

// Custom callback for BLE connections
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
    digitalWrite(STATUS_LED_PIN, HIGH); // Turn on LED when connected
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
    digitalWrite(STATUS_LED_PIN, LOW); // Turn off LED when disconnected
    
    // Reset all pins to off state
    lowerAllDots();
    currentPhase = PHASE_NOT_OUTPUT;
  }
};

// Custom callback for BLE characteristic operations
class CharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    
    if (value.length() > 0) {
      Serial.println("Received data from BLE client");
      
      // Process the incoming data
      processIncomingData((uint8_t*)value.data(), value.length());
    }
  }
};

/**
 * Process incoming BLE data with JSON format and timing measurement
 */
void processIncomingData(const uint8_t* data, size_t length) {
  // Current timestamp on ESP32
  unsigned long receiveTime = millis();
  
  // Check if data is in JSON format
  if (data[0] == '{') {
    // Try to parse as JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, data, length);
    
    if (!error) {
      // Successfully parsed JSON
      JsonVariant typeVar = doc["type"];
      JsonVariant idVar = doc["id"];
      JsonVariant dataVar = doc["data"];
      JsonVariant timestampVar = doc["sentTimestamp"];
      
      if (typeVar.isNull() || idVar.isNull()) {
        Serial.println("Invalid JSON format: missing type or id");
        return;
      }
      
      const char* type = typeVar.as<const char*>();
      const char* messageId = idVar.as<const char*>();
      unsigned long sentTimestamp = timestampVar.as<unsigned long>();
      
      // Calculate processing time (approximate one-way latency)
      unsigned long processingTime = 0;
      
      // Handle timestamp discrepancies
      if (sentTimestamp > 0) {
        // If the webapp timestamp is meaningful, calculate the difference
        // Note: this is a very rough estimate due to clock differences
        processingTime = receiveTime - (sentTimestamp % 86400000); // Mod by milliseconds in a day to handle rollover
      }
      
      Serial.print("Received message ID: ");
      Serial.println(messageId);
      Serial.print("Message type: ");
      Serial.println(type);
      
      // Process based on type
      if (strcmp(type, "braille") == 0) {
        if (!dataVar.isNull() && dataVar.is<JsonArray>()) {
          // Process the braille dot array
          JsonArray array = dataVar.as<JsonArray>();
          int dots[6] = {0, 0, 0, 0, 0, 0};
          
          int i = 0;
          for (JsonVariant value : array) {
            if (i < 6 && value.is<int>()) {
              dots[i] = value.as<int>();
            }
            i++;
          }
          
          // Activate the specified dots
          activateDots(dots);
          
          // Send acknowledgment with timing information
          sendAcknowledgment(messageId, sentTimestamp, processingTime);
        } else {
          Serial.println("Invalid braille data format");
        }
      } else {
        Serial.print("Unknown message type: ");
        Serial.println(type);
      }
    } else {
      Serial.print("JSON parsing error: ");
      Serial.println(error.c_str());
    }
  } else {
    // Handle legacy format (array of bytes)
    processBrailleArray(data, length);
    
    // No acknowledgment for legacy format
  }
}

/**
 * Send acknowledgment with timing information
 */
void sendAcknowledgment(const char* messageId, unsigned long originalTimestamp, unsigned long processingTime) {
  StaticJsonDocument<256> response;
  response["type"] = "ACK";
  response["id"] = messageId;
  response["originalTimestamp"] = originalTimestamp;
  response["deviceProcessingTime"] = processingTime;
  response["deviceTimestamp"] = millis();
  
  // Serialize to buffer
  char buffer[256];
  size_t bytes = serializeJson(response, buffer);
  
  // Send via BLE
  if (deviceConnected) {
    pTxCharacteristic->setValue((uint8_t*)buffer, bytes);
    pTxCharacteristic->notify();
    Serial.print("Sent acknowledgment for message: ");
    Serial.println(messageId);
  }
}

void setup() {
  // Initialize serial for debugging
  Serial.begin(115200);
  Serial.println("Starting Speech-to-Braille BLE Device with Phase Support");

  // Initialize braille pins as outputs and set to LOW
  for (int cell = 0; cell < NUM_CELLS; cell++) {
    for (int i = 0; i < NUM_PINS; i++) {
      pinMode(braillePins[cell][i], OUTPUT);
      digitalWrite(braillePins[cell][i], LOW);
    }
  }

  // Initialize LED pin as output and set to LOW
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

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
  
  // Heartbeat LED when not connected
  if (!deviceConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
      lastHeartbeatTime = currentTime;
    }
  }
  
  // Auto-reset braille output if no new data received within timeout
  if (outputActive && (millis() - lastOutputTime >= OUTPUT_TIMEOUT)) {
    Serial.println("Output timeout - lowering all dots");
    lowerAllDots();
    outputActive = false;
  }
  
  // Brief delay in the loop
  delay(100);
}