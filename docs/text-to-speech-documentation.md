# Text-to-Speech Module Documentation

This document provides a complete reference for the Text-to-Speech functionality in the Speech-to-Braille application.

## Overview

The Text-to-Speech module is responsible for providing audio feedback to users through speech synthesis. It handles introductions, reading matched braille words, and providing audio cues during phase transitions.

## Functions Reference

### Core Speech Functions
- `speakText(text, callback)`: Speaks the provided text and executes the callback when complete
- `stopSpeaking()`: Immediately stops any ongoing speech
- `speakMatchedWord(word)`: Specialized function to speak matched braille words
- `speakIntroduction()`: Speaks the welcome introduction message
- `speakWelcome()`: Legacy wrapper for speakIntroduction (deprecated)

### Speech Engine Management
- `initSpeechSynthesis()`: Sets up speech synthesis and selects appropriate voice
- `synthesizeSpeech(utterance)`: Wrapper for the Web Speech API with error handling
- `useFallbackSpeech(text, callback)`: Visual fallback when audio speech is unavailable
- `startChromeWorkaround()`: Fixes Chrome's speech synthesis timeout issue

### Audio Transition Effects
- `playRecordingAudio()`: Plays the audio cue for entering recording mode
- `playOutputAudio()`: Plays the audio cue for entering output mode
- `tryUnlockAudio()`: Attempts to unlock audio capabilities in mobile browsers

### User Interaction Management
- `updateInteractionPrompts()`: Updates UI prompts based on interaction state
- `createInitialInteractionPrompt()`: Creates the initial audio permission prompt
- `createPersistentInteractionPrompt()`: Creates a more prominent interaction prompt when needed
- `finishIntroduction(speakingIndicator)`: Completes the introduction phase and transitions to recording

### State Management
- `wasBrailleMatchFound()`: Returns whether a braille match was found
- `resetBrailleMatchStatus()`: Resets the braille match status flag

## Event Listeners

The module sets up several event listeners:
- DOM Content Loaded: Initializes speech synthesis and registers other event listeners
- User Interaction Events (click, touchstart, keypress): Detects user interactions for audio unlocking
- Custom Events:
  - `brailleMatchFound`: Updates match state when braille matches are found
  - `brailleNoMatchFound`: Updates match state when no matches are found

## Module Flow Diagram

```mermaid
flowchart TD
    %% Main initialization flow
    DOMContentLoaded --> initSpeechSynthesis
    initSpeechSynthesis --> speakIntroduction
    
    %% Introduction flow
    speakIntroduction --> createInitialInteractionPrompt
    speakIntroduction --> speakText
    speakIntroduction --> finishIntroduction
    finishIntroduction -- "dispatches 'introCompleted'" --> PhaseController["Phase Controller (external)"]
    
    %% User interaction handling
    UserInteraction["User Interaction\n(click, touch, key)"] --> hasUserInteracted
    hasUserInteracted --> updateInteractionPrompts
    hasUserInteracted --> tryUnlockAudio
    
    %% Audio playback paths
    subgraph "Audio Feedback"
        speakText --> synthesizeSpeech
        synthesizeSpeech --> WebSpeechAPI["Web Speech API"]
        synthesizeSpeech -. "fallback" .-> useFallbackSpeech
        playRecordingAudio --> AudioElement1["Audio Element"]
        playOutputAudio --> AudioElement2["Audio Element"]
    end
    
    %% Braille event handling
    BrailleMatchFoundEvent --> brailleMatchFound
    BrailleNoMatchFoundEvent --> brailleMatchFound
    
    %% State checking
    PhaseController -- "checks match status" --> wasBrailleMatchFound
    PhaseController -- "resets match state" --> resetBrailleMatchStatus
    
    %% Main functional flow
    speakMatchedWord --> speakText
    speakMatchedWord --> brailleMatchFound
    
    %% Chrome specific workarounds
    initSpeechSynthesis --> startChromeWorkaround
    
    %% Error handling
    AudioFailure["Audio Permission Error"] --> createPersistentInteractionPrompt
    
    %% External component interactions
    App["App.js"] -- "calls" --> speakMatchedWord
    PhaseController -- "calls" --> playRecordingAudio
    PhaseController -- "calls" --> playOutputAudio
    UIController["UI Controller"] -- "updates" --> speakingIndicator["Speaking Indicators"]
    
    %% Styling
    classDef mainFunc fill:#f9f,stroke:#333,stroke-width:2px;
    classDef eventFunc fill:#bbf,stroke:#33f,stroke-width:1px;
    classDef external fill:#fbb,stroke:#f33,stroke-width:1px;
    
    class speakIntroduction,speakText,speakMatchedWord mainFunc;
    class playRecordingAudio,playOutputAudio eventFunc;
    class App,PhaseController,UIController,WebSpeechAPI external;
```

## Integration with Other Modules

The Text-to-Speech module integrates with several other components:

1. **Phase Controller**: Receives phase transition events and provides audio feedback
2. **App Module**: Used to process speech for braille matching and announcement
3. **UI Controller**: Updates UI elements based on speech states
4. **BLE Controller**: Coordinates with hardware during speech phases

## Public API

The module exposes the following public interface through `window.textToSpeech`:

```javascript
window.textToSpeech = {
    speak: speakText,
    stop: stopSpeaking,
    speakMatchedWord,
    speakIntroduction,
    speakWelcome,
    playRecordingAudio,
    playOutputAudio,
    wasBrailleMatchFound,
    resetBrailleMatchStatus,
    introCompleted: () => introCompleted
};
```

## Configuration Options

The module respects several configuration options from the global config:

- `config.timings.introductionPhase`: Duration of the introduction phase
- `config.behavior.debugMode`: Enables additional logging
- `config.behavior.loopListeningIfNoMatch`: Used in conjunction with braille match detection

## Troubleshooting

Common issues:

1. **Audio not playing**: This is usually due to browsers requiring user interaction before allowing audio playback. The module attempts to handle this with interaction prompts.

2. **Speech synthesis not working**: The module includes fallbacks for when speech synthesis fails, including visual indicators.

3. **Chrome speech timeout**: A known issue in Chrome where speech synthesis stops after a period of inactivity - fixed with the Chrome workaround.
