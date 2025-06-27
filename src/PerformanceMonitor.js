// Phase 3: Performance monitoring system for 60 FPS
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.frameDrops = 0;
        this.totalFrames = 0;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS; // 16.67ms per frame
        this.lastFrameTime = 0;
        this.isMonitoring = false;
        this.performanceWarnings = [];
        
        // Performance thresholds - stricter for 60 FPS target
        this.fpsThreshold = 58; // Warning if FPS drops below 58 (allowing 2 FPS variance)
        this.frameDropThreshold = 0.02; // Warning if more than 2% frame drops
    }

    start() {
        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.frameDrops = 0;
        this.totalFrames = 0;
        this.performanceWarnings = [];
        console.log('📊 PerformanceMonitor: Started monitoring (Target: 60 FPS)');
    }

    stop() {
        this.isMonitoring = false;
        console.log('📊 PerformanceMonitor: Stopped monitoring');
    }

    update() {
        if (!this.isMonitoring) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        this.frameCount++;
        this.totalFrames++;

        // Calculate FPS
        if (deltaTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Check for frame drops
            const expectedFrames = Math.floor(deltaTime / this.frameTime);
            const actualFrames = this.frameCount;
            if (actualFrames < expectedFrames - 1) {
                this.frameDrops++;
            }
        }

        // Check frame time consistency
        const frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Generate performance warnings
        this.checkPerformance(frameTime);
    }

    checkPerformance(frameTime) {
        this.performanceWarnings = [];

        // FPS warning - be more lenient with browser variations
        if (this.fps < 50 && this.fps > 0) {
            this.performanceWarnings.push(`Low FPS: ${this.fps} (target: 60)`);
        }

        // Frame drop warning
        const dropRate = this.frameDrops / this.totalFrames;
        if (dropRate > this.frameDropThreshold) {
            this.performanceWarnings.push(`Frame drops: ${Math.round(dropRate * 100)}%`);
        }

        // Frame time warning - be more lenient
        if (frameTime > this.frameTime * 2) {
            this.performanceWarnings.push(`Slow frame: ${Math.round(frameTime)}ms`);
        }
    }

    getStats() {
        const dropRate = this.totalFrames > 0 ? this.frameDrops / this.totalFrames : 0;
        const isOptimal = this.fps >= 50 && dropRate < this.frameDropThreshold;
        
        return {
            fps: this.fps,
            frameDrops: this.frameDrops,
            totalFrames: this.totalFrames,
            dropRate: dropRate,
            warnings: this.performanceWarnings,
            isOptimal: isOptimal,
            targetFPS: this.targetFPS
        };
    }

    getOptimizationSuggestions() {
        const suggestions = [];
        const stats = this.getStats();

        if (stats.fps < this.fpsThreshold) {
            suggestions.push('FPS below 58 - check for expensive operations');
            suggestions.push('Consider reducing visual effects or complexity');
            suggestions.push('Check for expensive DOM operations');
            suggestions.push('Optimize rendering loops');
        }

        if (stats.fps > this.targetFPS + 2) {
            suggestions.push('FPS above 62 - frame rate limiting may be needed');
            suggestions.push('Consider adding frame rate cap');
        }

        if (stats.dropRate > this.frameDropThreshold) {
            suggestions.push('Reduce JavaScript execution time');
            suggestions.push('Use Web Workers for heavy computations');
            suggestions.push('Optimize state updates');
        }

        return suggestions;
    }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitor(); 