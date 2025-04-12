# Speech to Braille System Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [User Experience](#user-experience)
3. [System Architecture](#system-architecture)
4. [Web Application Components](#web-application-components)
5. [Hardware Components](#hardware-components)
6. [Setup Instructions](#setup-instructions)
7. [Usage Guide](#usage-guide)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Introduction

The Speech to Braille system is a comprehensive solution designed to convert spoken words into braille representations. It consists of a Progressive Web Application (PWA) that captures speech, processes it to find matching braille patterns, and presents both visual braille representations and physical braille output through an optional hardware component.

### Live Demo

The Speech to Braille web application is hosted on GitHub Pages and is accessible at:
[https://speech-to-braille.github.io](https://speech-to-braille.github.io)

The application is fully functional in modern browsers, with Chrome providing the best experience due to its comprehensive support for the Web Speech API and Bluetooth connectivity.

### Key Features
- Speech recognition with both online and offline capabilities
- Braille translation using a comprehensive database
- Text-to-speech feedback for interactive learning
- Visual braille representation
- Physical braille output via Arduino ESP32 hardware
- Progressive Web App for cross-platform compatibility
- Offline functionality with caching mechanisms

### Target Users
- Individuals learning braille
- Educators teaching braille
- Assistive technology developers
- Accessibility researchers

## User Experience

### Quick Start Guide

**Step 1: Access the Application**
- Visit [https://speech-to-braille.github.io](https://speech-to-braille.github.io) in your browser
- The application will load and initialize, downloading necessary resources

**Step 2: First-Time Setup**
- When prompted, allow microphone access permissions
- The application will automatically load the braille database
- You'll hear a welcome introduction through text-to-speech

**Step 3: Using the Application**
1. **Listen to Introduction**
   - The app begins with a brief spoken introduction
   - You'll learn about the app's purpose and how to use it

2. **Recording Phase (Speak)**
   - When you see "Listening Mode" and a red indicator, speak a word
   - The app will display what it hears in real-time
   - You have 5 seconds to speak before it switches to output mode

3. **Output Phase (View Results)**
   - When "Output Mode" appears with a green indicator, view your results
   - The app will show the braille pattern for the recognized word
   - The matched word will be spoken aloud
   - You have 5 seconds to view the result before returning to listening mode

4. **Repeat the Cycle**
   - The app automatically alternates between listening and output modes
   - Simply speak different words during each listening phase
   - No buttons to press - just speak and observe

**Step 4: Understanding the Display**
- **Matched Word**: The word that was recognized and matched in the database
- **Braille Symbol**: The Unicode braille representation
- **Braille Dots**: A visual representation of the raised dots (highlighted in blue)
- **Language**: The braille code system used (typically UEB - Unified English Braille)

**Step 5: Optional Hardware Connection**
- If you have the Arduino ESP32 hardware component:
  - Click the "Connect Hardware" button in the settings section
  - Select "Braille Display" from the Bluetooth device list
  - Once connected, the physical braille dots will activate during output phase

### Tips for Best Results
- Speak clearly and at a moderate pace
- Use single words for the most accurate matching
- Try common words first, which have better matching rates
- If using in a noisy environment, position the microphone closer
- For privacy, you can switch to the local speech recognition model in settings

## System Architecture

The system follows a modular architecture with distinct components for speech processing, braille translation, and output handling.

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Application                         │
│                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │Speech Recognition│──▶│Braille Translator│──▶│UI Controller│ │
│  └───────────────┘    └───────────────┘    └──────────────┘ │
│          │                     │                   │        │
│  ┌───────┴──────┐      ┌──────┴───────┐    ┌──────┴───────┐ │
│  │Text-to-Speech│      │Braille Database│   │Braille      │ │
│  │              │      │                │   │Visualizer   │ │
│  └──────────────┘      └────────────────┘   └──────────────┘ │
│          │                                        │         │
│          └────────────────┬───────────────────────┘         │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                    Bluetooth LE Connection                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     Hardware Component                        │
│                                                               │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐  │
│  │BLE Service    │──▶│Arduino ESP32   │──▶│Braille Actuators│  │
│  └───────────────┘    └───────────────┘    └───────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow
1. User speaks into the device microphone
2. Speech recognition module converts speech to text
3. Braille translator matches text against the braille database
4. UI controller updates the visual representation
5. If hardware is connected, braille data is sent via Bluetooth LE
6. Arduino ESP32 receives data and activates appropriate braille pins

## Web Application Components

### Speech Recognition Module

**File: `js/alternatives/speech-recognition.js`**

This module provides speech recognition functionality using the Web Speech API with a fallback to a local model for offline use.

**Key Features:**
- Web Speech API integration for online speech recognition
- Local model support using Vosk for offline speech recognition
- Event-based architecture with callbacks for speech results
- Handles partial and final speech recognition results

**Methods:**
- `startRecognition()`: Initiates speech recognition
- `stopRecognition()`: Stops active speech recognition
- `pauseRecognition()`: Temporarily pauses recognition
- `setRecognitionMethod(method)`: Switches between web and local modes
- `isSupported()`: Checks if speech recognition is supported in the browser
- `isModelAvailableOffline()`: Verifies if offline model is available

### Braille Translator

**File: `js/braille-translator.js`**

This module is responsible for loading the braille database and matching spoken words against the database to find corresponding braille representations.

**Key Features:**
- CSV database loading and parsing
- Word matching algorithm to find braille patterns
- Support for both simple braille cells and contractions
- Event system for notifying about matches and errors

**Methods:**
- `init()`: Loads the braille database from CSV
- `processText(text)`: Processes text to find braille matches
- `searchWord(word)`: Searches for a specific word in the database
- `isDatabaseLoaded()`: Checks if the database is loaded
- `parseArray(arrayString)`: Parses CSV array string into actual arrays

**Internal Functions:**
- `loadDatabase()`: Loads and parses the database file
- `processSentence(sentence)`: Processes a sentence to find matching words
- `parseCSVRow(row)`: Parses CSV rows handling quoted fields
- `triggerEvent(eventName, data)`: Triggers event callbacks for listeners

### Text-to-Speech Module

**File: `js/text-to-speech.js`**

This module provides text-to-speech functionality for reading matched words aloud and providing audio feedback during application phases.

**Key Features:**
- Web Speech Synthesis API integration
- Chrome-specific workarounds for speech synthesis
- Audio feedback for application phases
- Voice selection logic for consistent speech
- Introduction and welcome messages

**Methods:**
- `speak(text, callback)`: Speaks the provided text with callback on completion
- `stop()`: Stops any ongoing speech
- `speakMatchedWord(word)`: Speaks the matched word
- `speakIntroduction()`: Speaks the introduction message
- `playRecordingAudio()`: Plays audio cue for recording phase
- `playOutputAudio()`: Plays audio cue for output phase

### UI Controller

**File: `js/ui-controller.js`**

This module manages all UI interactions and DOM manipulation for the application.

**Key Features:**
- DOM element references and initialization
- UI state management for different application phases
- Loading indicators and progress bars
- Speech recognition control UI
- Braille result display

**Methods:**
- `init()`: Initializes UI components and references
- `setRecordingState(isRecording)`: Updates UI based on recording state
- `updateFinalText(text)` / `updateInterimText(text)`: Updates speech recognition text
- `showBrailleMatch(result)`: Displays matched braille data
- `showNoMatch()`: Displays no match found message
- `updateBrailleArray(formattedArray)`: Updates the displayed braille array
- `setCycleMode(mode)`: Updates UI based on current application phase
- `showDatabaseDebugInfo()`: Displays database diagnostic information

### Braille Visualizer

**File: `js/braille-visualizer.js`**

This module handles the visual representation of braille patterns in the web interface.

**Key Features:**
- Visual rendering of braille dot patterns
- Support for both single and multi-cell braille patterns
- Dynamic cell creation for longer contractions
- Interactive visual feedback

**Methods:**
- `init()`: Initializes the visualizer component
- `updateDisplay(brailleArray)`: Updates the visual display with new braille data
- `updateSingleCellDisplay(dotsArray)`: Updates display for a single braille cell
- `updateMultiCellDisplay(cellsArray)`: Updates display for multiple braille cells
- `clearDots()`: Clears all active dots from the display

### Cache Manager

**File: `js/cache-manager.js`**

This module manages the application's cache for offline functionality.

**Key Features:**
- Service worker registration and management
- Cache status reporting and management
- IndexedDB interaction for offline models
- Cache inspection and diagnostic tools

**Methods:**
- `init()`: Initializes the cache manager
- `checkCacheContents()`: Examines and reports on cached contents
- `updateLastUpdated()`: Updates the last cache check timestamp
- `clearAllCaches()`: Clears all application caches

## Hardware Components

### ESP32 BLE Controller

**File: `arduino-integration/esp32/speech_to_braille_ble.ino`**

This Arduino sketch runs on an ESP32 microcontroller and handles the physical braille output via Bluetooth Low Energy (BLE) communication with the web application.

**Key Features:**
- BLE server for receiving braille data
- Phase-based control system (listening vs. output phases)
- Automatic timeout for braille pin reset
- Connection status indication via LED
- Multi-cell braille support

**Hardware Requirements:**
- Arduino Nano ESP32 or compatible ESP32 board
- 6 actuators (solenoids or servos) for braille dots
- Status LED
- Power supply appropriate for the actuators

**Pin Configuration:**
- Braille dots 1-6: pins D2-D7
- Status LED: pin D13

**BLE Specifications:**
- Service UUID: "19b10000-e8f2-537e-4f6c-d104768a1214"
- Characteristic UUID: "19b10001-e8f2-537e-4f6c-d104768a1214"
- Device Name: "Braille Display"

**Data Protocol:**
- First byte: Phase indicator (0 = Not Output, 1 = Output)
- Subsequent bytes: Braille cell patterns (1 bit per dot)

**Functions:**
- `setup()`: Initializes hardware and BLE services
- `loop()`: Main program loop handling connection and timeouts
- `lowerAllDots()`: Resets all braille pins to the lowered position
- BLE callbacks for connect, disconnect, and data receive events

## Setup Instructions

### Web Application Setup

1. **Clone the Repository**
   ```
   git clone https://github.com/username/speech-to-braille.git
   cd speech-to-braille
   ```

2. **Install Dependencies**
   If using npm:
   ```
   npm install
   ```

3. **Run the Development Server**
   ```
   npm start
   ```

4. **Build for Production**
   ```
   npm run build
   ```

5. **Deploy the Application**
   - Upload the build directory to your web host
   - Configure your web server to serve the application as a PWA
   - Ensure proper HTTPS configuration for PWA and speech recognition features

### Hardware Setup

1. **Required Components**
   - Arduino Nano ESP32 or compatible ESP32 board
   - 6 solenoids or servo motors for braille dots
   - 1 LED for status indication
   - Resistors, wires, and breadboard
   - Power supply suitable for your actuators

2. **Circuit Assembly**
   - Connect braille actuators to pins D2-D7
   - Connect status LED to pin D13 with an appropriate resistor
   - Ensure proper power distribution for actuators

3. **Arduino IDE Setup**
   - Install Arduino IDE (version 1.8.13 or newer)
   - Install ESP32 board support through Boards Manager
   - Install required libraries:
     - BLEDevice
     - BLEUtils
     - BLEServer
     - BLE2902

4. **Upload the Sketch**
   - Open `arduino-integration/esp32/speech_to_braille_ble.ino`
   - Select your ESP32 board from the Boards menu
   - Select the appropriate port
   - Upload the sketch to the board

5. **Testing the Hardware**
   - The status LED should blink once per second when not connected
   - When connected to the web app, the LED should remain on

## Usage Guide

### Web Application Usage

1. **Initial Setup**
   - Open the application in a compatible browser (Chrome recommended)
   - Allow microphone permissions when prompted
   - The application will load the braille database and initialize

2. **Application Phases**
   The application operates in a cyclical flow with three main phases:

   - **Introduction Phase**:
     - Application starts with a welcome message
     - Text-to-speech introduces the application
     - Automatically transitions to Recording phase

   - **Recording Phase** (5 seconds):
     - Speech recognition is activated
     - User speaks words or phrases
     - Visual countdown timer displays remaining time
     - Audio cue signals the recording mode
     - Recognized speech is displayed in real-time

   - **Output Phase** (5 seconds):
     - Speech recognition is paused
     - Recognized text is processed for braille matches
     - Matching words with braille representations are displayed
     - Text-to-speech reads the matched word
     - Visual countdown timer displays remaining time
     - Audio cue signals the output mode

3. **Connecting Hardware**
   - Ensure Bluetooth is enabled on your device
   - Click the "Connect" button in the hardware section
   - Select "Braille Display" from the list of available devices
   - Once connected, the hardware status indicator will show "Connected"
   - The status LED on the ESP32 will remain on while connected

4. **Offline Usage**
   - The application works offline after the first load
   - Speech recognition will automatically switch to the local model
   - Cached resources enable full functionality without an internet connection

### Hardware Interaction

1. **Braille Output**
   - During the Output phase, the ESP32 will receive braille patterns
   - Braille pins will activate according to the matched pattern
   - Pins will automatically lower after 3 seconds of inactivity
   - The pins will also lower when switching to the Listening phase

2. **Status Indication**
   - Blinking LED: Device is powered but not connected
   - Solid LED: Device is connected to the web application
   - LED off: Device is powered off or disconnected unexpectedly

## API Reference

### BLE Communication Protocol

The web application communicates with the ESP32 hardware using a simple protocol:

1. **Service UUID**: "19b10000-e8f2-537e-4f6c-d104768a1214"
2. **Characteristic UUID**: "19b10001-e8f2-537e-4f6c-d104768a1214"

**Data Format**:
- First byte: Phase indicator
  - 0 = Not Output Phase (Listening)
  - 1 = Output Phase
- Subsequent bytes: Braille cell patterns
  - Each byte represents one braille cell
  - Bits 0-5 represent dots 1-6 (1 = raised, 0 = lowered)

Example:
```
[1, 0b00000111]  // Output phase, dots 1, 2, and 3 raised
```

### Braille Database Format

The braille database is stored in a CSV file (`ueb-philb-braille-database.csv`) with the following structure:

```
word,shortForm,braille,array,language
```

Where:
- `word`: The text representation of the word
- `shortForm`: Any abbreviated form (if applicable)
- `braille`: The braille symbol representation (Unicode)
- `array`: The dot number array in the format {1,2,3} or {{1,2},{3,4}} for contractions
- `language`: The language/braille code (e.g., UEB for Unified English Braille)

The array follows standard braille dot numbering:
```
1 4
2 5
3 6
```

### Event System

The application uses a custom event system for communication between modules:

**Event Registration**:
```javascript
brailleTranslator.on('databaseloaded', function(data) {
  console.log('Database loaded with', data.count, 'entries');
});
```

**Common Events**:
- `databaseloaded`: Fired when the braille database is loaded
- `error`: Fired when an error occurs in any module
- `speechstart`: Fired when speech recognition starts
- `speechend`: Fired when speech recognition ends
- `speechresult`: Fired when a speech result is received
- `phasechange`: Fired when the application phase changes

## Troubleshooting

The application includes built-in troubleshooting features:

### Common Issues and Solutions

1. **Database Not Loading**
   - Check internet connection
   - Verify the CSV file is accessible
   - Click the retry button
   - Check browser console for specific error messages

2. **Speech Recognition Not Working**
   - Ensure microphone permissions are granted
   - Try refreshing the page
   - Check if your browser supports the Web Speech API
   - Try switching to the local model instead of Web Speech

3. **Hardware Not Connecting**
   - Ensure Bluetooth is enabled on your device
   - Verify that the ESP32 is powered and the LED is blinking
   - Check if your browser supports Web Bluetooth (Chrome is recommended)
   - Restart the ESP32 and refresh the web application
   - Check the Arduino Serial Monitor for debugging information

4. **Braille Pins Not Activating**
   - Verify the connection is established (status LED solid)
   - Check power supply to the actuators
   - Ensure the wiring matches the pin configuration
   - Monitor the Serial output on the ESP32 for received data
   - Verify the web app is in Output phase

5. **Offline Mode Issues**
   - Ensure the application has been loaded at least once online
   - Check if the cache contains the necessary resources
   - Verify the local speech model is downloaded
   - Clear the application cache and reload if needed

### Diagnostic Tools

1. **Connection Status Indicator**
   - Shows online/offline status in the application header
   - Displays hardware connection status

2. **Cache Inspector**
   - Available in the diagnostic section
   - Shows all cached resources categorized by type
   - Provides options to refresh or clear the cache

3. **Database Status**
   - Shows number of loaded entries
   - Provides debug information for database loading issues

4. **Serial Monitor**
   - Connect to the ESP32 via USB and open the Arduino Serial Monitor
   - Monitor data reception and pin activation

5. **Browser Console**
   - Open developer tools (F12 in most browsers)
   - Check for error messages or warnings

## Future Enhancements

Planned improvements for the Speech-to-Braille system:

1. **Multi-cell Physical Braille Display**
   - Support for displaying multiple braille cells simultaneously
   - Enhanced hardware design with more actuators

2. **Extended Language Support**
   - Additional braille code systems beyond UEB
   - Multi-language speech recognition

3. **Advanced Speech Processing**
   - Improved word boundary detection
   - Context-aware braille translation

4. **User Profiles**
   - Customizable settings for different users
   - Progress tracking for learning

5. **Educational Game Modes**
   - Interactive learning exercises
   - Quiz modes for testing braille knowledge

6. **Mobile Application**
   - Native mobile apps for improved performance
   - Enhanced Bluetooth connectivity options

7. **Accessibility Improvements**
   - Screen reader optimizations
   - Keyboard navigation enhancements
