# Bomberman Multiplayer Game - Phase 1

A multiplayer Bomberman game built with the all4one-js framework and WebSocket support.

## Phase 1 Status: ✅ COMPLETED

### What's Implemented in Phase 1:

#### ✅ 1.1 Project Setup
- [x] Created package.json with dependencies
- [x] Installed all4one-js framework: `npm i all4one-js`
- [x] Installed WebSocket server: `npm i ws`
- [x] Set up basic project structure

#### ✅ 1.2 Basic HTML Structure
- [x] Created index.html with framework imports
- [x] Set up basic CSS structure
- [x] Created responsive layout foundation

#### ✅ 1.3 Framework Integration
- [x] Imported and set up all4one-js framework
- [x] Created basic reactive state management
- [x] Tested framework functionality

### Current Features:

1. **Nickname Entry Screen**
   - Input validation (2-15 characters)
   - Error message display
   - Form submission handling

2. **Waiting Room Screen**
   - Player display
   - Back navigation
   - Placeholder for multiplayer functionality

3. **Basic Navigation**
   - Screen transitions
   - State management
   - Responsive design

### Setup Instructions:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   python3 -m http.server 8000
   # or
   npm start
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

### Project Structure:

```
bomberman-dom/
├── index.html              # Main HTML file
├── package.json            # Dependencies and scripts
├── src/
│   ├── GameApp.js         # Main application component
│   └── styles/
│       ├── style.css      # Main styles
│       ├── menu.css       # Menu and form styles
│       ├── multiplayer.css # Game-specific styles
│       ├── map.css        # Map styles
│       ├── player.css     # Player styles
│       └── scoreboard.css # Scoreboard styles
└── node_modules/          # Dependencies
```

### Next Steps (Phase 2):

- Game state management
- UI components (GameBoard, Chat)
- Basic styling improvements
- WebSocket server setup

### Technical Details:

- **Framework:** all4one-js
- **State Management:** Reactive state with createState
- **Styling:** CSS with responsive design
- **Architecture:** Component-based with Vnode rendering

### Testing:

1. Enter a nickname (2-15 characters)
2. Click "Join Game" to go to waiting room
3. Use "Back to Nickname" to return
4. Test form validation with invalid inputs

Phase 1 is complete and ready for Phase 2 development! 