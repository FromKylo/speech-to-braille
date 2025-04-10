# Speech to Braille PWA Documentation

## Introduction

The Speech to Braille PWA (Progressive Web Application) is designed to convert spoken words into braille representations. It uses speech recognition technology to capture user speech, processes the recognized text to find matching braille patterns from a database, and presents the corresponding braille arrays and symbols to the user. 

This application serves as an educational and accessibility tool to help users learn braille by speaking words and seeing their braille representations. The application includes text-to-speech functionality to provide audio feedback for a more interactive learning experience.

## Core Components

### Speech Recognition Module

**File: `js/alternatives/speech-recognition.js`**

This module provides speech recognition functionality using Web Speech API with a fallback to a local model for offline use.

Key Features:
- Web Speech API integration for online speech recognition
- Local model support using Vosk for offline speech recognition
- Event-based architecture with callbacks for speech results
- Handles partial and final speech recognition results

Methods:
- `startRecognition()`: Initiates speech recognition
- `stopRecognition()`: Stops active speech recognition
- `pauseRecognition()`: Temporarily pauses recognition
- `setRecognitionMethod(method)`: Switches between web and local modes
- `isSupported()`: Checks if speech recognition is supported in the browser

### Braille Translator

**File: `js/braille-translator.js`**

This module is responsible for loading the braille database and matching spoken words against the database to find corresponding braille representations.

Key Features:
- CSV database loading and parsing
- Word matching algorithm to find braille patterns
- Support for both simple braille cells and contractions
- Event system for notifying about matches and errors

Methods:
- `init()`: Loads the braille database from CSV
- `processText(text)`: Processes text to find braille matches
- `searchWord(word)`: Searches for a specific word in the database
- `isDatabaseLoaded()`: Checks if the database is loaded
- `parseArray(arrayString)`: Parses CSV array string into actual arrays

Internal Functions:
- `loadDatabase()`: Loads and parses the database file
- `processSentence(sentence)`: Processes a sentence to find matching words
- `parseCSVRow(row)`: Parses CSV rows handling quoted fields

### Text-to-Speech Module

**File: `js/text-to-speech.js`**

This module provides text-to-speech functionality for reading matched words aloud and providing audio feedback during application phases.

Key Features:
- Web Speech Synthesis API integration
- Chrome-specific workarounds for speech synthesis
- Audio feedback for application phases
- Voice selection logic for consistent speech
- Introduction and welcome messages

Methods:
- `speak(text, callback)`: Speaks the provided text with callback on completion
- `stop()`: Stops any ongoing speech
- `speakMatchedWord(word)`: Speaks the matched word
- `speakIntroduction()`: Speaks the introduction message
- `playRecordingAudio()`: Plays audio cue for recording phase
- `playOutputAudio()`: Plays audio cue for output phase

### UI Controller

**File: `js/ui-controller.js`**

This module manages all UI interactions and DOM manipulation for the application.

Key Features:
- DOM element references and initialization
- UI state management for different application phases
- Loading indicators and progress bars
- Speech recognition control UI
- Braille result display

Methods:
- `init()`: Initializes UI components and references
- `setRecordingState(isRecording)`: Updates UI based on recording state
- `updateFinalText(text)` / `updateInterimText(text)`: Updates speech recognition text
- `showBrailleMatch(result)`: Displays matched braille data
- `showNoMatch()`: Displays no match found message
- `updateBrailleArray(formattedArray)`: Updates the displayed braille array
- `setCycleMode(mode)`: Updates UI based on current application phase

### Phase Controller

**Embedded in: `index.html`**

This component manages the application's phase transitions between introduction, recording, and output phases.

Key Features:
- Timed phase transitions (5 seconds per phase)
- Visual countdown indicators
- Phase-specific UI updates
- Integration with audio cues
- Event-based triggers for phase transitions

Methods:
- `showPhase(phase)`: Transitions to the specified phase
- `startPhaseTimer(timerElement, nextPhase)`: Starts countdown timer for phase
- `getCurrentPhase()`: Returns the current application phase

### Utilities

**File: `utils/braille-array-formatter.js`**

This utility module provides functions for formatting and parsing braille arrays.

Key Functions:
- `formatBrailleArrayForDisplay(arrayData)`: Formats braille arrays for display
- `parseBrailleArray(arrayString)`: Parses braille array strings into arrays
- `convertArrayToVisualDots(arrayData)`: Converts arrays to visual dot patterns

## Application Flow

The application operates in a cyclical flow with three main phases:

1. **Introduction Phase**:
   - Application starts with a welcome message
   - Text-to-speech introduces the application
   - Automatically transitions to Recording phase

2. **Recording Phase** (5 seconds):
   - Speech recognition is activated
   - User speaks words or phrases
   - Visual countdown timer displays remaining time
   - Audio cue signals the recording mode
   - Recognized speech is displayed in real-time

3. **Output Phase** (5 seconds):
   - Speech recognition is paused
   - Recognized text is processed for braille matches
   - Matching words with braille representations are displayed
   - Text-to-speech reads the matched word
   - Visual countdown timer displays remaining time
   - Audio cue signals the output mode

The application automatically cycles between Recording and Output phases, with 5 seconds allocated to each phase.

## Database Structure

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

## User Interface

The user interface is divided into several sections:

1. **Header**: Application title and status indicators
2. **Main Content**: Contains the phase-specific content
   - Introduction Phase: Welcome message and loading indicators
   - Recording Phase: Speech recognition display and status
   - Output Phase: Braille matching results and details
3. **Troubleshooting Section**: Diagnostic information and status details
4. **Loading Indicators**: Progress bars for database and model loading

Each phase has distinct visual cues:
- Recording Phase: Red recording indicator with countdown
- Output Phase: Green output indicator with countdown
- Phase transitions are accompanied by audio cues

## Troubleshooting

The application includes built-in troubleshooting features:

1. **Connection Status**: Indicates online/offline status
2. **Database Loading**: Shows database loading status with retry options
3. **Model Status**: Displays the current speech recognition model
4. **Cached Resources**: Information about cached application resources
5. **Speech Recognition Diagnostics**: Status of speech recognition capabilities

Common issues and solutions:
- **Database Not Loading**: Retry button with diagnostic information
- **Speech Recognition Errors**: Error messages with autorecovery
- **Offline Mode Issues**: Automatic fallback to local models