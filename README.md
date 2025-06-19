# BomberGhost Game

## Overview
BomberGhost is a classic Bomberman-style game implemented using plain JavaScript, HTML, and CSS. The game features a fast-paced gameplay experience with a scoreboard, pause menu, and various game mechanics.

## Project Structure
```
bomberman-game
├── src
│   ├── index.js        # Entry point of the game
│   ├── game.js         # Main game logic
│   ├── ui.js           # User interface management
│   ├── utils.js        # Utility functions
│   └── styles
│       └── styles.css  # Styles for the game
├── index.html          # Main HTML document
└── README.md           # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd bomberman-game
   ```
3. Open `index.html` in your web browser to start the game.

## Gameplay Mechanics
- The game runs at a minimum of 60 FPS, ensuring smooth gameplay.
- Players can control their character using keyboard inputs.
- The scoreboard displays:
  - A countdown timer
  - Current score
  - Remaining lives
- A pause menu allows players to:
  - Continue the game
  - Restart the game

## Performance Considerations
- The game utilizes `requestAnimationFrame` for efficient rendering.
- Event listeners are set up to handle user input without causing performance bottlenecks.

## Contributing
Feel free to submit issues or pull requests to improve the game. Your contributions are welcome!