// Game loop with requestAnimationFrame for 60 FPS
import { getGameState, updateGameState, gridToPixel } from './GameApp.js';

class GameLoop {
    constructor() {
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.targetFrameTime = 1000 / 60; // 16.67ms for 60 FPS
        this.accumulator = 0;
        this.updateCallbacks = [];
        this.renderCallbacks = [];
        this.animationId = null;
        

        
        // Frame rate limiting
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTimestamp = 0;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.lastFrameTimestamp = this.lastFrameTime;
        this.accumulator = 0;

        
        this.loop();
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        

    }

    loop(currentTime = performance.now()) {
        if (!this.isRunning) return;

        // Calculate delta time
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Cap delta time to prevent spiral of death
        const clampedDeltaTime = Math.min(deltaTime, 50); // Max 50ms delta



        // Fixed timestep update loop
        this.accumulator += clampedDeltaTime;
        
        while (this.accumulator >= this.targetFrameTime) {
            // Update game logic
            this.update(this.targetFrameTime);
            this.accumulator -= this.targetFrameTime;
        }

        // Render (can be variable timestep)
        this.render();

         // Schedule next frame - let browser handle timing
        this.animationId = requestAnimationFrame((time) => this.loop(time));
    }

    update(deltaTime) {
        // Call all update callbacks
        this.updateCallbacks.forEach(callback => {
            try {
                callback(deltaTime);
            } catch (error) {
                console.error('❌ GameLoop: Update callback error:', error);
            }
        });
    }

    render() {
        // Call all render callbacks
        this.renderCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('❌ GameLoop: Render callback error:', error);
            }
        });
    }

    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    addRenderCallback(callback) {
        this.renderCallbacks.push(callback);
    }

    removeUpdateCallback(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    removeRenderCallback(callback) {
        const index = this.renderCallbacks.indexOf(callback);
        if (index > -1) {
            this.renderCallbacks.splice(index, 1);
        }
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            targetFPS: this.targetFPS
        };
    }
}

// Create and export singleton instance
export const gameLoop = new GameLoop();

// Add smooth movement update callback
const PLAYER_SPEED = 160; // pixels per second (5 cells/sec)
gameLoop.addUpdateCallback((deltaTime) => {
    const gameState = getGameState();
    let changed = false;
    const updatedPlayers = (gameState.players || []).map(player => {
        if (!player.pixelPosition || !player.targetPosition) return player;
        const targetPx = gridToPixel(player.targetPosition.x, player.targetPosition.y);
        let { x, y } = player.pixelPosition;
        const dx = targetPx.x - x;
        const dy = targetPx.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1 || player.isRespawning) {
            player.isRespawning = false; // Reset respawn state
            // Snap to target if close
            if (x !== targetPx.x || y !== targetPx.y) changed = true;
            return { ...player, pixelPosition: { ...targetPx } };
        }
        // Move toward target

        const moveDist = Math.min(dist, PLAYER_SPEED * (deltaTime / 1000));
        const nx = x + (dx / dist) * moveDist;
        const ny = y + (dy / dist) * moveDist;
        if (Math.abs(nx - x) > 0.01 || Math.abs(ny - y) > 0.01) {
            changed = true;
            return { ...player, pixelPosition: { x: nx, y: ny } };
        }
        return player;
    });
    if (changed) {
        updateGameState({ players: updatedPlayers });
    }
}); 