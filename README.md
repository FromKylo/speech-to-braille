An attempt on creating a Progressive Web App (PWA) for Speech-to-Braille Refreshable Display capstone project. Developed by KiloJoules³

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
