// Phase 3: Game loop with requestAnimationFrame for 60 FPS
import { performanceMonitor } from './PerformanceMonitor.js';

class GameLoop {
    constructor() {
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.targetFrameTime = 1000 / 60; // 16.67ms for 60 FPS
        this.accumulator = 0;
        this.updateCallbacks = [];
        this.renderCallbacks = [];
        this.animationId = null;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;
        
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
        this.frameCount = 0;
        this.lastFpsUpdate = this.lastFrameTime;
        
        performanceMonitor.start();
        this.loop();
        
        console.log('🎮 GameLoop: Started with 60 FPS limit');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        performanceMonitor.stop();
        console.log('🎮 GameLoop: Stopped');
    }

    loop(currentTime = performance.now()) {
        if (!this.isRunning) return;

        // Calculate delta time
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Cap delta time to prevent spiral of death
        const clampedDeltaTime = Math.min(deltaTime, 50); // Max 50ms delta

        // Update performance monitor
        performanceMonitor.update();

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
            fps: performanceMonitor.getStats().fps,
            frameDrops: performanceMonitor.getStats().frameDrops,
            warnings: performanceMonitor.getStats().warnings,
            isOptimal: performanceMonitor.getStats().isOptimal,
            targetFPS: this.targetFPS
        };
    }
}

// Create and export singleton instance
export const gameLoop = new GameLoop(); 