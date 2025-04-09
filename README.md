# speech-to-braille
An attempt on creating a Progressive Web App (PWA) for Speech-to-Braille Refreshable Display capstone project. Developed by KiloJoules³

## Speech to Braille PWA

This Progressive Web App (PWA) converts speech to Braille using the Vosk API for speech recognition.

### Features
- Offline support with service workers.
- Speech recognition using Vosk.
- Dynamic content updates.

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start a local server to test the PWA:
   ```bash
   npx http-server
   ```
4. Open the app in a browser.

### Notes
- Ensure the Vosk model is cached for offline speech recognition.
- The app requires microphone access for speech recognition.
