// Braille pattern for letters A to Z
const byte brailleAlphabet[26][6] = {
  {1,0,0,0,0,0}, // A
  {1,1,0,0,0,0}, // B
  {1,0,0,1,0,0}, // C
  {1,0,0,1,1,0}, // D
  {1,0,0,0,1,0}, // E
  {1,1,0,1,0,0}, // F
  {1,1,0,1,1,0}, // G
  {1,1,0,0,1,0}, // H
  {0,1,0,1,0,0}, // I
  {0,1,0,1,1,0}, // J
  {1,0,1,0,0,0}, // K
  {1,1,1,0,0,0}, // L
  {1,0,1,1,0,0}, // M
  {1,0,1,1,1,0}, // N
  {1,0,1,0,1,0}, // O
  {1,1,1,1,0,0}, // P
  {1,1,1,1,1,0}, // Q
  {1,1,1,0,1,0}, // R
  {0,1,1,1,0,0}, // S
  {0,1,1,1,1,0}, // T
  {1,0,1,0,0,1}, // U
  {1,1,1,0,0,1}, // V
  {0,1,0,1,1,1}, // W
  {1,0,1,1,0,1}, // X
  {1,0,1,1,1,1}, // Y
  {1,0,1,0,1,1}  // Z
};

// Define the GPIO pins for each braille cell
const int braillePins[3][6] = {
  {2, 3, 4, 5, 6, 7},     // Braille Cell 1
  {8, 9, 10, 11, 12, 13},     // Braille Cell 2
  {17, 20, 21, 22, 23, 24}  // Braille Cell 3
};

void setup() {
  Serial.begin(115200);  // Start Serial Monitor
  Serial.println("Braille flasher starting...");

  for (int cell = 0; cell < 3; cell++) {
    for (int dot = 0; dot < 6; dot++) {
      pinMode(braillePins[cell][dot], OUTPUT);
    }
  }
}

void loop() {
  for (int i = 0; i < 26; i++) {  // Loop through A–Z
    char currentLetter = 'A' + i;
    Serial.print("Displaying: ");
    Serial.println(currentLetter);

    // Raise dots
    for (int cell = 0; cell < 3; cell++) {
      for (int dot = 0; dot < 6; dot++) {
        digitalWrite(braillePins[cell][dot], brailleAlphabet[i][dot]);
      }
      delay(1000);
    }

    delay(1000);  // Hold for 1 seconds

    // Lower dots
    for (int cell = 0; cell < 3; cell++) {
      for (int dot = 0; dot < 6; dot++) {
        digitalWrite(braillePins[cell][dot], LOW);
      }
    }

    Serial.println("Cleared all cells.\n");
    delay(3000);  // Pause before next letter
  }
}
