# Godot Integration Guide - Data Visualization

This guide shows how to integrate the Data Visualization package into Godot projects for real-time game analytics, performance monitoring, and player statistics visualization.

## Requirements

- Godot 4.0+ (4.1+ recommended for better JavaScript support)
- JavaScript/V8 engine integration (built into Godot)
- HTTP/WebSocket capabilities for data streaming

## Installation

### 1. Enable JavaScript in Godot

Godot 4.x has built-in JavaScript support through V8 integration. No additional setup required for the engine itself.

### 2. Add Package to Godot Project

1. Create a `javascript` folder in your project root
2. Install the npm package:

```bash
# In your Godot project root
mkdir javascript
cd javascript
npm install @steamproject/data-visualization
```

### 3. Setup Plugin

1. Copy the plugin files to your project:
   - `bridge.gd` → `addons/data_visualization/bridge.gd`
   - `example.gd` → `addons/data_visualization/example.gd`
   - `plugin.cfg` → `addons/data_visualization/plugin.cfg`

2. Enable the plugin in Project Settings > Plugins

## Quick Start

### 1. Basic Setup

Add the `DataVisualizationBridge` node to your scene:

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge

func _ready():
    setup_charts()

func setup_charts():
    # Create FPS monitor
    viz_bridge.create_line_chart("fps_chart", {
        "title": "FPS Monitor",
        "max_data_points": 100,
        "real_time": true,
        "y_axis": {"min": 0, "max": 120}
    })

    # Create player stats dashboard
    viz_bridge.create_dashboard("player_dashboard", {
        "container": "player-stats",
        "layout": "grid",
        "columns": 3
    })

func _process(_delta):
    # Update FPS chart
    var fps = Engine.get_frames_per_second()
    viz_bridge.update_chart("fps_chart", Time.get_unix_time_from_system(), fps)

    # Update player stats every second
    if fmod(Time.get_time_from_start(), 1.0) < get_process_delta_time():
        update_player_stats()

func update_player_stats():
    var player_data = {
        "health": get_player_health(),
        "mana": get_player_mana(),
        "experience": get_player_experience(),
        "level": get_player_level()
    }

    viz_bridge.update_dashboard("player_dashboard", player_data)
```

### 2. Performance Monitoring

```gdscript
extends Node
class_name PerformanceMonitor

@onready var viz_bridge = $DataVisualizationBridge
var update_interval = 0.5
var last_update = 0.0

func _ready():
    setup_performance_charts()

func setup_performance_charts():
    # Multi-line performance chart
    viz_bridge.create_line_chart("performance_chart", {
        "title": "System Performance",
        "datasets": [
            {"name": "FPS", "color": "#ff6b6b"},
            {"name": "Memory (MB)", "color": "#4ecdc4"},
            {"name": "CPU %", "color": "#45b7d1"}
        ],
        "real_time": true,
        "max_data_points": 200
    })

    # Memory usage heatmap
    viz_bridge.create_heatmap("memory_heatmap", {
        "title": "Memory Usage Zones",
        "width": 50,
        "height": 50,
        "color_scale": ["#000033", "#0066cc", "#00ccff", "#ffff00", "#ff0000"]
    })

func _process(_delta):
    if Time.get_time_from_start() - last_update >= update_interval:
        update_performance_metrics()
        last_update = Time.get_time_from_start()

func update_performance_metrics():
    var fps = Engine.get_frames_per_second()
    var memory_mb = OS.get_static_memory_usage_by_type().values().reduce(func(a, b): return a + b, 0) / 1024.0 / 1024.0
    var cpu_usage = get_cpu_usage()  # Custom implementation

    var timestamp = Time.get_unix_time_from_system()

    viz_bridge.update_chart_multi_data("performance_chart", {
        "timestamp": timestamp,
        "data": {
            "FPS": fps,
            "Memory": memory_mb,
            "CPU": cpu_usage
        }
    })

func get_cpu_usage() -> float:
    # Platform-specific CPU monitoring
    # This is a simplified example
    return randf_range(10.0, 80.0)
```

### 3. Player Statistics Dashboard

```gdscript
extends Node
class_name PlayerStatistics

@onready var viz_bridge = $DataVisualizationBridge

var player_data = {
    "name": "Player",
    "level": 1,
    "health": 100.0,
    "mana": 100.0,
    "experience": 0.0,
    "score": 0,
    "skills": {},
    "inventory": {}
}

func _ready():
    initialize_player_data()
    setup_player_charts()

func initialize_player_data():
    player_data.skills = {
        "Combat": 85.0,
        "Magic": 62.0,
        "Crafting": 43.0,
        "Trade": 78.0,
        "Stealth": 35.0
    }

    player_data.inventory = {
        "Health Potions": 15,
        "Mana Potions": 8,
        "Iron Sword": 1,
        "Magic Staff": 1,
        "Gold Coins": 250
    }

func setup_player_charts():
    # Health gauge
    viz_bridge.create_gauge("health_gauge", {
        "title": "Health",
        "min": 0,
        "max": 100,
        "value": player_data.health,
        "color": "#ff4444"
    })

    # Mana gauge
    viz_bridge.create_gauge("mana_gauge", {
        "title": "Mana",
        "min": 0,
        "max": 100,
        "value": player_data.mana,
        "color": "#4444ff"
    })

    # Experience progress
    viz_bridge.create_gauge("experience_gauge", {
        "title": "Experience",
        "min": 0,
        "max": 1000,
        "value": player_data.experience,
        "color": "#ffaa00"
    })

    # Skills chart
    viz_bridge.create_bar_chart("skills_chart", {
        "title": "Player Skills",
        "horizontal": true,
        "data": skills_to_array()
    })

    # Inventory pie chart
    viz_bridge.create_pie_chart("inventory_chart", {
        "title": "Inventory Distribution",
        "data": inventory_to_array()
    })

func update_player_statistics():
    # Simulate player data changes
    simulate_player_changes()

    # Update gauges
    viz_bridge.update_chart("health_gauge", Time.get_unix_time_from_system(), player_data.health)
    viz_bridge.update_chart("mana_gauge", Time.get_unix_time_from_system(), player_data.mana)
    viz_bridge.update_chart("experience_gauge", Time.get_unix_time_from_system(), player_data.experience)

    # Update charts
    viz_bridge.update_chart("skills_chart", skills_to_array())
    viz_bridge.update_chart("inventory_chart", inventory_to_array())

func simulate_player_changes():
    # Health/mana changes
    if randf() < 0.3:
        player_data.health = clamp(player_data.health + randf_range(-5.0, 3.0), 0.0, 100.0)

    if randf() < 0.3:
        player_data.mana = clamp(player_data.mana + randf_range(-8.0, 5.0), 0.0, 100.0)

    # Experience gain
    if randf() < 0.1:
        player_data.experience += randf_range(5.0, 25.0)
        if player_data.experience >= 1000.0:
            player_data.level += 1
            player_data.experience = 0.0

func skills_to_array() -> Array:
    var result = []
    for skill in player_data.skills:
        result.append({"name": skill, "value": player_data.skills[skill]})
    return result

func inventory_to_array() -> Array:
    var result = []
    for item in player_data.inventory:
        result.append({"name": item, "value": player_data.inventory[item]})
    return result
```

### 4. Game Analytics

```gdscript
extends Node
class_name GameAnalytics

@onready var viz_bridge = $DataVisualizationBridge

var leaderboard_data = []
var activity_data = []

func _ready():
    initialize_analytics_data()
    setup_analytics_charts()

func setup_analytics_charts():
    # Leaderboard
    viz_bridge.create_bar_chart("leaderboard", {
        "title": "Top Players",
        "horizontal": true,
        "max_entries": 10,
        "data": get_leaderboard_array()
    })

    # Activity heatmap
    viz_bridge.create_heatmap("activity_heatmap", {
        "title": "Player Activity Zones",
        "width": 20,
        "height": 20,
        "color_scale": ["#000033", "#0066cc", "#00ccff", "#ffff00", "#ff0000"]
    })

    # Session time distribution
    viz_bridge.create_pie_chart("session_time_chart", {
        "title": "Session Time Distribution",
        "data": [
            {"name": "0-30 min", "value": 25},
            {"name": "30-60 min", "value": 35},
            {"name": "1-2 hours", "value": 25},
            {"name": "2+ hours", "value": 15}
        ]
    })

func initialize_analytics_data():
    # Create sample leaderboard data
    for i in range(10):
        leaderboard_data.append({
            "name": "Player" + str(i + 1),
            "score": randi_range(5000, 20000),
            "level": randi_range(10, 25)
        })

func update_analytics():
    # Update leaderboard
    update_leaderboard()
    viz_bridge.update_chart("leaderboard", get_leaderboard_array())

    # Update activity heatmap
    update_activity_heatmap()

func update_leaderboard():
    # Simulate score changes
    for player in leaderboard_data:
        if randf() < 0.2:
            player.score += randi_range(50, 200)

func get_leaderboard_array() -> Array:
    leaderboard_data.sort_custom(func(a, b): return a.score > b.score)
    var result = []
    for i in range(min(10, leaderboard_data.size())):
        var player = leaderboard_data[i]
        result.append({"name": player.name, "value": player.score})
    return result

func update_activity_heatmap():
    # Generate simulated activity data
    var heatmap_data = []

    for x in range(20):
        for y in range(20):
            var distance1 = Vector2(x, y).distance_to(Vector2(10, 10))
            var distance2 = Vector2(x, y).distance_to(Vector2(5, 15))

            var intensity = max(0, 1.0 - (distance1 / 10.0)) + max(0, 1.0 - (distance2 / 8.0))
            intensity += randf_range(0.0, 0.2)
            intensity = clamp(intensity, 0.0, 1.0)

            heatmap_data.append(intensity)

    viz_bridge.update_chart("activity_heatmap", heatmap_data)
```

## Advanced Features

### Event System Integration

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge

func _ready():
    # Connect to bridge signals
    viz_bridge.threshold_crossed.connect(_on_threshold_crossed)
    viz_bridge.data_point_added.connect(_on_data_point_added)
    viz_bridge.chart_error.connect(_on_chart_error)

func _on_threshold_crossed(chart_id: String, threshold_data: Dictionary):
    match chart_id:
        "fps_chart":
            if threshold_data.get("value", 0) < 30:
                show_performance_warning()
        "health_gauge":
            if threshold_data.get("value", 0) < 20:
                show_health_warning()

func _on_data_point_added(chart_id: String, data_point: Dictionary):
    # React to new data points
    print("New data added to ", chart_id, ": ", data_point)

func _on_chart_error(chart_id: String, error_message: String):
    print("Chart error in ", chart_id, ": ", error_message)

func show_performance_warning():
    print("Performance warning: FPS too low!")

func show_health_warning():
    print("Health warning: Player health critical!")
```

### Custom Themes

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge

func _ready():
    apply_game_theme()

func apply_game_theme():
    var game_theme = {
        "colors": {
            "primary": "#ff6b6b",
            "secondary": "#4ecdc4",
            "background": "#1a1a2e",
            "text": "#eee",
            "accent": "#ffd93d"
        },
        "fonts": {
            "title": "Orbitron",
            "body": "Roboto Mono"
        },
        "borders": {
            "radius": 8,
            "glow": true,
            "color": "#333"
        },
        "animations": {
            "enabled": true,
            "duration": 300
        }
    }

    viz_bridge.set_theme(game_theme)
```

### WebSocket Data Streaming

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge
var websocket = WebSocketPeer.new()

func _ready():
    connect_to_data_stream()

func connect_to_data_stream():
    websocket.connect_to_url("ws://localhost:8080/game-data")

func _process(_delta):
    websocket.poll()

    var state = websocket.get_ready_state()
    if state == WebSocketPeer.STATE_OPEN:
        while websocket.get_available_packet_count():
            var packet = websocket.get_packet()
            var json_string = packet.get_string_from_utf8()
            var json = JSON.new()
            var parse_result = json.parse(json_string)

            if parse_result == OK:
                var data = json.data
                handle_websocket_data(data)

func handle_websocket_data(data: Dictionary):
    match data.get("type", ""):
        "player_stats":
            viz_bridge.update_dashboard("player_dashboard", data.get("payload", {}))
        "performance_metrics":
            viz_bridge.update_chart_multi_data("performance_chart", data.get("payload", {}))
        "leaderboard_update":
            viz_bridge.update_chart("leaderboard", data.get("payload", []))
```

## Performance Optimization

### Memory Management

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge

func _ready():
    # Configure memory limits
    viz_bridge.set_memory_limit(50 * 1024 * 1024)  # 50MB
    viz_bridge.enable_auto_cleanup(true)
    viz_bridge.set_max_data_points_per_chart(1000)

func _exit_tree():
    # Proper cleanup
    if viz_bridge:
        viz_bridge.clear_all_charts()
        viz_bridge.dispose()
```

### Batch Updates

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge
var pending_updates = []
var batch_interval = 0.1
var last_batch_time = 0.0

func _ready():
    viz_bridge.enable_batch_updates(true)
    viz_bridge.set_batch_interval(batch_interval)

func _process(_delta):
    if Time.get_time_from_start() - last_batch_time >= batch_interval:
        process_batched_updates()
        last_batch_time = Time.get_time_from_start()

func add_chart_update(chart_id: String, data):
    pending_updates.append({
        "chart_id": chart_id,
        "data": data,
        "timestamp": Time.get_time_from_start()
    })

func process_batched_updates():
    if pending_updates.size() > 0:
        viz_bridge.apply_batched_updates(pending_updates)
        pending_updates.clear()
```

## HTML5/Web Export Considerations

When exporting to HTML5, use Godot's built-in JavaScript integration:

```gdscript
extends Node

func _ready():
    if OS.has_feature("web"):
        initialize_web_charts()
    else:
        initialize_native_charts()

func initialize_web_charts():
    # Use JavaScriptBridge for web exports
    var js_code = """
        window.initializeDataVisualization = function() {
            // Initialize charts using web-specific methods
        };
        window.initializeDataVisualization();
    """
    JavaScriptBridge.eval(js_code)

func initialize_native_charts():
    # Use full bridge functionality for native platforms
    var viz_bridge = $DataVisualizationBridge
    viz_bridge.initialize()
```

## Troubleshooting

### Common Issues

1. **JavaScript Engine Not Available**
   - Ensure Godot 4.0+ is being used
   - Check that JavaScript features are enabled in export settings

2. **Performance Issues**
   - Reduce chart update frequency
   - Limit the number of data points
   - Use batch updates for multiple charts

3. **Export Errors**
   - Ensure all JavaScript files are in the correct directories
   - Check platform-specific export settings
   - Verify that required features are enabled

### Debug Mode

```gdscript
extends Node

@onready var viz_bridge = $DataVisualizationBridge

func _ready():
    viz_bridge.set_debug_mode(true)
    viz_bridge.set_log_level("verbose")
    viz_bridge.show_performance_stats(true)
```

## Best Practices

1. **Update Frequency**: Don't update charts every frame unless necessary
2. **Data Management**: Use appropriate data point limits for real-time charts
3. **Memory Cleanup**: Always dispose of charts when no longer needed
4. **Performance Monitoring**: Use the built-in performance stats during development
5. **Thread Safety**: All chart updates should happen on the main thread

## Example Scenes

The plugin includes several example scenes demonstrating:
- Real-time performance monitoring
- Player statistics dashboard
- Game analytics visualization
- Economy tracking
- Multiplayer leaderboards

Import the plugin to access these examples and start building your own data visualization solutions!