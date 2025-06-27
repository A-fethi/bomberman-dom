// Performance monitoring system for 60 FPS requirement
export class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.frameTimes = [];
        this.maxFrameTime = 16.67; // 60 FPS = 16.67ms per frame
        this.droppedFrames = 0;
        this.isMonitoring = false;
        
        // Performance metrics
        this.metrics = {
            averageFPS: 0,
            minFPS: 60,
            maxFPS: 0,
            frameDrops: 0,
            averageFrameTime: 0
        };
    }
    
    start() {
        this.isMonitoring = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.frameTimes = [];
        this.droppedFrames = 0;
        this.updateFPS();
    }
    
    stop() {
        this.isMonitoring = false;
    }
    
    updateFPS() {
        if (!this.isMonitoring) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Calculate FPS
        this.fps = 1000 / deltaTime;
        
        // Track frame times
        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Check for frame drops
        if (deltaTime > this.maxFrameTime) {
            this.droppedFrames++;
        }
        
        // Update metrics
        this.updateMetrics();
        
        // Continue monitoring
        requestAnimationFrame(() => this.updateFPS());
    }
    
    updateMetrics() {
        if (this.frameTimes.length === 0) return;
        
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const avgFPS = 1000 / avgFrameTime;
        const minFrameTime = Math.max(...this.frameTimes);
        const maxFrameTime = Math.min(...this.frameTimes);
        
        this.metrics = {
            averageFPS: Math.round(avgFPS),
            minFPS: Math.round(1000 / minFrameTime),
            maxFPS: Math.round(1000 / maxFrameTime),
            frameDrops: this.droppedFrames,
            averageFrameTime: Math.round(avgFrameTime * 100) / 100
        };
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    isPerformingWell() {
        return this.metrics.averageFPS >= 60 && this.metrics.frameDrops === 0;
    }
    
    getPerformanceReport() {
        const metrics = this.getMetrics();
        return {
            status: this.isPerformingWell() ? '✅ GOOD' : '⚠️ NEEDS OPTIMIZATION',
            fps: `${metrics.averageFPS} FPS`,
            frameTime: `${metrics.averageFrameTime}ms`,
            frameDrops: metrics.frameDrops,
            recommendation: this.getRecommendation()
        };
    }
    
    getRecommendation() {
        const metrics = this.getMetrics();
        if (metrics.averageFPS < 60) {
            return 'Optimize rendering or reduce complexity';
        }
        if (metrics.frameDrops > 0) {
            return 'Check for expensive operations in render loop';
        }
        return 'Performance is optimal';
    }
    
    // Utility function to measure execution time
    static measureTime(fn, name = 'Function') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        const duration = end - start;
        
        if (duration > 16) { // Warning if function takes longer than one frame
            console.warn(`⚠️ ${name} took ${duration.toFixed(2)}ms (should be < 16ms for 60 FPS)`);
        }
        
        return { result, duration };
    }
    
    // Utility function to throttle expensive operations
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    // Utility function to debounce frequent operations
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor(); 