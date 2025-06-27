# Performance Guidelines - 60 FPS Requirement

## 🎯 **Core Performance Requirements**

### 1. **60 FPS Minimum**
- **Target**: 60 FPS at all times
- **Frame Budget**: 16.67ms per frame maximum
- **No Frame Drops**: Zero tolerance for frame drops
- **Smooth Animation**: All animations must be smooth

### 2. **Performance Monitoring**
- ✅ **Real-time FPS tracking** via PerformanceMonitor
- ✅ **Frame drop detection** and warnings
- ✅ **Performance metrics** logging
- ✅ **Automatic optimization suggestions**

## 🚀 **Performance Best Practices**

### **Rendering Optimization**
```javascript
// ✅ GOOD: Use requestAnimationFrame for animations
function gameLoop(timestamp) {
    // Game logic here
    requestAnimationFrame(gameLoop);
}

// ❌ BAD: Don't use setInterval for animations
setInterval(() => {
    // This can cause frame drops
}, 16);
```

### **State Management**
```javascript
// ✅ GOOD: Batch state updates
batch(() => {
    setState1(newValue1);
    setState2(newValue2);
    setState3(newValue3);
});

// ❌ BAD: Multiple separate updates
setState1(newValue1);
setState2(newValue2);
setState3(newValue3);
```

### **Event Handling**
```javascript
// ✅ GOOD: Debounce frequent events
const debouncedHandler = performanceMonitor.debounce((value) => {
    setState(value);
}, 16);

// ✅ GOOD: Throttle expensive operations
const throttledHandler = performanceMonitor.throttle(() => {
    expensiveOperation();
}, 100);
```

### **DOM Operations**
```javascript
// ✅ GOOD: Batch DOM updates
const updates = [];
for (let i = 0; i < 1000; i++) {
    updates.push(createElement(i));
}
container.append(...updates);

// ❌ BAD: Individual DOM updates
for (let i = 0; i < 1000; i++) {
    container.appendChild(createElement(i));
}
```

## 📊 **Performance Monitoring**

### **Automatic Monitoring**
- **FPS Tracking**: Real-time FPS measurement
- **Frame Drops**: Detection of frames taking > 16.67ms
- **Performance Warnings**: Visual indicators when performance drops
- **Console Logging**: Detailed performance reports

### **Manual Performance Testing**
```javascript
// Measure function performance
const { result, duration } = performanceMonitor.measureTime(() => {
    // Your function here
}, 'Function Name');

// Check if performance is acceptable
if (duration > 16) {
    console.warn('⚠️ Function took too long:', duration + 'ms');
}
```

## 🎮 **Game-Specific Optimizations**

### **Game Loop**
```javascript
class GameEngine {
    constructor() {
        this.lastFrameTime = performance.now();
        this.gameRunning = true;
        this.startGameLoop();
    }
    
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.gameRunning) return;
            
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;
            
            // Ensure we don't exceed frame budget
            if (deltaTime < 16.67) {
                this.update(deltaTime);
            }
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
}
```

### **Player Movement**
```javascript
// ✅ GOOD: Smooth movement with delta time
handleMovement(deltaTime) {
    const moveSpeed = 5; // pixels per second
    const moveDistance = (moveSpeed * deltaTime) / 1000;
    
    if (this.keys.has('ArrowUp')) {
        this.y -= moveDistance;
    }
}

// ❌ BAD: Fixed movement per frame
handleMovement() {
    if (this.keys.has('ArrowUp')) {
        this.y -= 5; // Fixed pixels per frame
    }
}
```

### **Collision Detection**
```javascript
// ✅ GOOD: Spatial partitioning for large maps
class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }
    
    getNearbyObjects(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return this.grid.get(`${cellX},${cellY}`) || [];
    }
}
```

## 🔧 **Optimization Techniques**

### **1. Object Pooling**
```javascript
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    get() {
        return this.pool.pop() || this.createFn();
    }
    
    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }
}
```

### **2. Efficient Rendering**
```javascript
// ✅ GOOD: Only render visible objects
render() {
    const visibleObjects = this.getVisibleObjects();
    visibleObjects.forEach(obj => obj.render());
}

// ✅ GOOD: Use object culling
getVisibleObjects() {
    return this.objects.filter(obj => 
        obj.x >= this.camera.x - 100 &&
        obj.x <= this.camera.x + this.camera.width + 100 &&
        obj.y >= this.camera.y - 100 &&
        obj.y <= this.camera.y + this.camera.height + 100
    );
}
```

### **3. Memory Management**
```javascript
// ✅ GOOD: Clean up event listeners
class Component {
    constructor() {
        this.handlers = [];
    }
    
    addHandler(element, event, handler) {
        element.addEventListener(event, handler);
        this.handlers.push({ element, event, handler });
    }
    
    destroy() {
        this.handlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.handlers = [];
    }
}
```

## 📈 **Performance Checklist**

### **Before Each Commit**
- [ ] **FPS stays above 60** during all interactions
- [ ] **No frame drops** detected by PerformanceMonitor
- [ ] **Console warnings** addressed
- [ ] **Memory usage** is stable (no leaks)
- [ ] **Event listeners** are properly cleaned up

### **During Development**
- [ ] **Monitor FPS** continuously while developing
- [ ] **Test on slower devices** if possible
- [ ] **Profile expensive operations** using browser dev tools
- [ ] **Optimize before adding new features**

### **Performance Testing**
- [ ] **Multiple players** connected simultaneously
- [ ] **Large game maps** with many objects
- [ ] **Rapid user input** (keyboard/mouse)
- [ ] **Long gaming sessions** (memory leaks)

## 🚨 **Performance Red Flags**

### **Immediate Issues**
- FPS drops below 60
- Frame drops detected
- Memory usage growing over time
- UI becomes unresponsive

### **Warning Signs**
- Functions taking > 16ms to execute
- Frequent DOM manipulations
- Unbounded loops or recursion
- Large object creation in render loops

## 🎯 **Success Metrics**

- ✅ **60 FPS minimum** in all scenarios
- ✅ **Zero frame drops** during normal gameplay
- ✅ **Responsive UI** with < 100ms input lag
- ✅ **Stable memory usage** over long sessions
- ✅ **Smooth animations** for all game elements

Remember: **Performance is not an afterthought - it's a requirement from day one!** 🚀 