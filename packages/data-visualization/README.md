# Data Visualization Package

A comprehensive data visualization library designed specifically for game development, providing real-time charts, dashboards, and analytics visualization for Unity, Godot, and Unreal Engine.

## Features

- **Real-time Charting**: Line charts, bar charts, pie charts, scatter plots, and heatmaps
- **Game Analytics Dashboard**: Player statistics, performance metrics, and economy tracking
- **Performance Monitoring**: FPS tracking, memory usage, and system performance visualization
- **Customizable Themes**: Game UI integration with custom styling and themes
- **Cross-Platform**: Works on Windows, macOS, Linux, iOS, Android, and console platforms
- **Optimized for Games**: Low-overhead rendering suitable for real-time game environments

## Installation

```bash
npm install @steamproject/data-visualization
```

## Quick Start

### Basic Chart Creation

```javascript
import { ChartManager, LineChart, BarChart } from '@steamproject/data-visualization';

// Initialize the chart manager
const chartManager = new ChartManager({
  canvas: document.getElementById('chart-canvas'),
  theme: 'dark-game-ui'
});

// Create a real-time FPS monitor
const fpsChart = new LineChart({
  title: 'FPS Monitor',
  maxDataPoints: 100,
  realTime: true,
  yAxis: { min: 0, max: 120 }
});

// Add data points
setInterval(() => {
  fpsChart.addData(Date.now(), getCurrentFPS());
}, 100);
```

### Player Statistics Dashboard

```javascript
import { Dashboard, ProgressRing, BarChart } from '@steamproject/data-visualization';

const playerDashboard = new Dashboard({
  container: 'player-stats',
  layout: 'grid',
  columns: 3
});

// Player level progress
const levelProgress = new ProgressRing({
  title: 'Level Progress',
  value: 75,
  max: 100,
  color: '#00ff88'
});

// Skills breakdown
const skillsChart = new BarChart({
  title: 'Player Skills',
  data: [
    { name: 'Combat', value: 85 },
    { name: 'Magic', value: 62 },
    { name: 'Crafting', value: 43 },
    { name: 'Trade', value: 78 }
  ]
});

playerDashboard.addWidget(levelProgress);
playerDashboard.addWidget(skillsChart);
```

## Game Engine Integration

This package provides seamless integration with major game engines through JavaScript bridge implementations:

- **Unity**: Uses ClearScript V8 or Jint for JavaScript execution
- **Godot**: Uses built-in JavaScript/V8 integration
- **Unreal Engine**: Uses V8 JavaScript engine embedding

## Examples

### Unity Integration
See [Unity Examples](./examples/unity/README.md) for comprehensive Unity integration guide.

### Godot Integration
See [Godot Examples](./examples/godot/README.md) for comprehensive Godot integration guide.

### Unreal Engine Integration
See [Unreal Examples](./examples/unreal/README.md) for comprehensive Unreal Engine integration guide.

## Chart Types

### Line Charts
Perfect for real-time data like FPS, player health, or economic trends.

```javascript
const performanceChart = new LineChart({
  title: 'System Performance',
  datasets: [
    { name: 'FPS', color: '#ff6b6b' },
    { name: 'Memory (MB)', color: '#4ecdc4' },
    { name: 'CPU %', color: '#45b7d1' }
  ],
  realTime: true,
  maxDataPoints: 200
});
```

### Bar Charts
Ideal for comparing player statistics, inventory items, or leaderboards.

```javascript
const leaderboardChart = new BarChart({
  title: 'Top Players',
  data: [
    { name: 'PlayerOne', value: 1250, color: '#ffd93d' },
    { name: 'GamerPro', value: 1180, color: '#ff6b6b' },
    { name: 'SkillMaster', value: 1050, color: '#4ecdc4' }
  ],
  horizontal: true
});
```

### Pie Charts
Great for resource distribution, time spent analysis, or category breakdowns.

```javascript
const resourceChart = new PieChart({
  title: 'Resource Distribution',
  data: [
    { name: 'Wood', value: 35, color: '#8b4513' },
    { name: 'Stone', value: 28, color: '#696969' },
    { name: 'Iron', value: 20, color: '#708090' },
    { name: 'Gold', value: 17, color: '#ffd700' }
  ]
});
```

### Heatmaps
Perfect for visualizing player activity zones, difficulty maps, or performance hotspots.

```javascript
const activityHeatmap = new Heatmap({
  title: 'Player Activity Zones',
  width: 100,
  height: 100,
  colorScale: ['#000033', '#0066cc', '#00ccff', '#ffff00', '#ff0000']
});
```

## Performance Optimization

### Memory Management
```javascript
// Automatic cleanup for real-time charts
const chart = new LineChart({
  maxDataPoints: 100, // Automatically removes old data points
  memoryLimit: 50 * 1024 * 1024, // 50MB limit
  autoCleanup: true
});
```

### Rendering Optimization
```javascript
// Reduced update frequency for better performance
const chartManager = new ChartManager({
  targetFPS: 30, // Limit chart updates to 30 FPS
  useWebGL: true, // Hardware acceleration
  batchUpdates: true // Batch multiple updates
});
```

## Theming

### Game UI Integration
```javascript
const gameTheme = {
  colors: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    background: '#1a1a2e',
    text: '#eee'
  },
  fonts: {
    title: 'Orbitron',
    body: 'Roboto Mono'
  },
  borders: {
    radius: 8,
    glow: true
  }
};

chartManager.setTheme(gameTheme);
```

### Pre-built Themes
- `dark-game-ui`: Dark theme optimized for game interfaces
- `sci-fi`: Futuristic sci-fi game theme
- `fantasy`: Medieval/fantasy game theme
- `neon`: Cyberpunk neon theme
- `minimal`: Clean, minimal theme

## Event System

### Chart Events
```javascript
chart.on('dataPointAdded', (data) => {
  console.log('New data point:', data);
});

chart.on('thresholdCrossed', (threshold) => {
  // Trigger game events when metrics cross thresholds
  if (threshold.metric === 'fps' && threshold.value < 30) {
    gameEngine.showPerformanceWarning();
  }
});
```

### Game Engine Integration
```javascript
// Unity C# to JavaScript bridge
chart.on('playerStatsUpdated', (stats) => {
  // This will be called from Unity
  playerStatsChart.updateData(stats);
});
```

## Real-time Data Streaming

### WebSocket Integration
```javascript
const wsManager = new WebSocketManager('ws://localhost:8080/game-data');

wsManager.on('playerStats', (data) => {
  playerDashboard.updateStats(data);
});

wsManager.on('performanceMetrics', (data) => {
  performanceChart.addDataPoint(data);
});
```

### Game Loop Integration
```javascript
// Unity Update() method integration
function updateCharts() {
  const gameData = {
    fps: Time.deltaTime > 0 ? 1.0 / Time.deltaTime : 0,
    playerHealth: player.health,
    playerMana: player.mana,
    enemyCount: enemies.length
  };

  chartManager.updateGameData(gameData);
}
```

## Advanced Features

### Data Aggregation
```javascript
const aggregator = new DataAggregator({
  window: '5m', // 5-minute rolling window
  functions: ['avg', 'min', 'max', 'sum']
});

aggregator.addData('fps', currentFPS);
const stats = aggregator.getStats('fps'); // { avg: 58.2, min: 45, max: 60 }
```

### Alert System
```javascript
const alertManager = new AlertManager();

alertManager.addRule({
  metric: 'fps',
  condition: 'below',
  threshold: 30,
  duration: '10s',
  action: (data) => {
    gameUI.showAlert('Performance Warning: Low FPS detected');
  }
});
```

### Export and Sharing
```javascript
// Export chart as image for sharing
const imageData = chart.exportAsImage('png', { width: 1920, height: 1080 });

// Export data for analysis
const csvData = chart.exportAsCSV();
const jsonData = chart.exportAsJSON();
```

## Troubleshooting

### Common Issues

#### Performance Issues
- **Problem**: Charts causing FPS drops
- **Solution**: Reduce update frequency, limit data points, use WebGL rendering

#### Memory Leaks
- **Problem**: Memory usage increasing over time
- **Solution**: Enable auto-cleanup, set memory limits, dispose charts properly

#### Integration Issues
- **Problem**: JavaScript bridge not working
- **Solution**: Check engine-specific setup guides, verify JavaScript engine configuration

### Debug Mode
```javascript
const chartManager = new ChartManager({
  debug: true, // Enable debug logging
  showStats: true, // Show performance stats
  logLevel: 'verbose'
});
```

## API Reference

### ChartManager
Main manager class for handling multiple charts and global settings.

### Chart Types
- `LineChart`: Real-time line charts
- `BarChart`: Bar and column charts
- `PieChart`: Pie and donut charts
- `Heatmap`: 2D heatmap visualization
- `Gauge`: Circular gauge charts
- `ProgressRing`: Progress indicators

### Utilities
- `DataAggregator`: Data processing and aggregation
- `ThemeManager`: Theme management and customization
- `EventManager`: Event handling and dispatching
- `WebSocketManager`: Real-time data streaming

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Support

- **Documentation**: [Full API Documentation](./docs/)
- **Examples**: [Game Engine Examples](./examples/)
- **Issues**: [GitHub Issues](https://github.com/steamproject/issues)
- **Discord**: [Join our Discord](https://discord.gg/steamproject)