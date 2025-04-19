/*
 * Speech-to-Braille ESP32 BLE Integration
 * 
 * This sketch receives braille array data from the Speech-to-Braille web app
 * via Bluetooth Low Energy (BLE) and controls braille pins accordingly.
 * Updated to prioritize 6-bit format (2-byte format with phase + dots as bits)
 */

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

// BLE service and characteristic UUIDs (must match web app)
#define BRAILLE_SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BRAILLE_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

const int braillePins[3][6] = {
  {13, 12, 11, 10, 9, 8}, // Braille Cell 1
  {7, 6, 5, 4, 3, 2},    // Braille Cell 2
  {24, 23, 22, 21, 20, 17}  // Braille Cell 3
};
const int NUM_CELLS = 3;
const int NUM_PINS = 6;

// Heartbeat
const int STATUS_LED_PIN = 15; // Green LED status indicator
const int HEARTBEAT_INTERVAL = 1200;
unsigned long lastHeartbeatTime = 0;
bool ledState = false;

// Phase constants
const uint8_t PHASE_NOT_OUTPUT = 0;
const uint8_t PHASE_OUTPUT = 1;
uint8_t currentPhase = PHASE_NOT_OUTPUT;

// Auto-reset timeout for braille output
const unsigned long OUTPUT_TIMEOUT = 7000; 
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
      
      // Process the incoming binary data directly - prioritizing 6-bit format
      processBrailleArray((uint8_t*)value.data(), value.length());
    }
  }
};

/**
 * Activate braille dots based on array inputs
 */
void activateDots(int dots[6]) {
  // For now, we'll just set the first cell with the pattern
  Serial.print("[");
  Serial.print(millis()/1000.0, 3);
  Serial.print("s] Setting dots [");
  for (int i = 0; i < NUM_PINS; i++) {
    digitalWrite(braillePins[0][i], dots[i] ? HIGH : LOW);
    Serial.print(dots[i] ? "1" : "0");
    if (i < NUM_PINS - 1) Serial.print(",");
  }
  Serial.println("]");
  
  // Update tracking variables
  outputActive = true;
  lastOutputTime = millis();
  currentPhase = PHASE_OUTPUT;
  Serial.println("Braille dots activated");
}

/**
 * Process binary braille array format
 * Prioritizes the 2-byte format (phase byte + 6-bit dots byte)
 */
void processBrailleArray(const uint8_t* data, size_t length) {
  Serial.print("[");
  Serial.print(millis()/1000.0, 3);
  Serial.print("s] Received ");
  Serial.print(length);
  Serial.print(" bytes: ");
  for (size_t i = 0; i < length; i++) {
    Serial.print("0x");
    if (data[i] < 16) Serial.print("0");
    Serial.print(data[i], HEX);
    if (i < length - 1) Serial.print(" ");
  }
  Serial.println();
  
  // 2-byte format (preferred): first byte is phase, second byte has dot states in bits
  if (length == 2) {
    uint8_t phase = data[0];
    uint8_t dotBits = data[1];
    int dots[6];
    
    // Extract individual bits for each dot (bit 0 = dot 1, bit 1 = dot 2, etc.)
    for (int i = 0; i < 6; i++) {
      dots[i] = (dotBits & (1 << i)) ? 1 : 0;
    }
    
    // Update phase if provided
    currentPhase = phase;
    
    // Activate dots
    Serial.print("Processing 2-byte format - Phase: ");
    Serial.print(phase == PHASE_OUTPUT ? "OUTPUT" : "NOT_OUTPUT");
    Serial.print(", Packed bits: 0b");
    for (int i = 5; i >= 0; i--) {
      Serial.print((dotBits & (1 << i)) ? "1" : "0");
    }
    Serial.println();
    activateDots(dots);
  }
  // 7-byte legacy format: phase byte + 6 individual dot bytes
  else if (length == 7) {
    uint8_t phase = data[0];
    int dots[6];
    
    // Extract the 6 dot values following the phase byte
    for (int i = 0; i < 6; i++) {
      dots[i] = data[i+1] > 0 ? 1 : 0;
    }
    
    // Update phase if provided
    currentPhase = phase;
    
    Serial.print("Processing 7-byte format - Phase: ");
    Serial.println(phase == PHASE_OUTPUT ? "OUTPUT" : "NOT_OUTPUT");
    activateDots(dots);
  }
  // 6-byte legacy format (just 6 dots)
  else if (length == 6) {
    int dots[6];
    for (int i = 0; i < 6; i++) {
      dots[i] = data[i] > 0 ? 1 : 0;
    }
    Serial.println("Processing 6-byte legacy format");
    activateDots(dots);
  }
  else {
    Serial.print("Invalid data format length: ");
    Serial.println(length);
  }
}

void setup() {
  // Initialize serial for debugging
  Serial.begin(115200);
  Serial.println("Starting Speech-to-Braille BLE Device with Legacy Format");

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
  
  // Sequential pin activation when not connected - loop through all braille pins
  if (!deviceConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastHeartbeatTime >= HEARTBEAT_INTERVAL) {
      // Calculate which pin to activate based on sequence
      static int sequence = 0;
      int totalPins = NUM_CELLS * NUM_PINS;
      
      // Turn off all pins
      for (int cell = 0; cell < NUM_CELLS; cell++) {
        for (int pin = 0; pin < NUM_PINS; pin++) {
          digitalWrite(braillePins[cell][pin], LOW);
        }
      }
      
      // Calculate which pin to light up
      int cellIndex = sequence / NUM_PINS;
      int pinIndex = sequence % NUM_PINS;
      
      // Turn on just this pin
      digitalWrite(braillePins[cellIndex][pinIndex], HIGH);
      
      // Move to next in sequence
      sequence = (sequence + 1) % totalPins;
      
      // Toggle the status LED
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
      
      lastHeartbeatTime = currentTime;
    }
  }
  
  // Auto-reset braille output if no new data received within timeout
  if (outputActive && (millis() - lastOutputTime >= OUTPUT_TIMEOUT)) {
    unsigned long idleTime = millis() - lastOutputTime;
    Serial.print("[");
    Serial.print(millis()/1000.0, 3);
    Serial.print("s] Output timeout after ");
    Serial.print(idleTime);
    Serial.println("ms - lowering all dots");
    outputActive = false;
    lowerAllDots();
  }
  
  // Brief delay in the loop
  delay(100);
}