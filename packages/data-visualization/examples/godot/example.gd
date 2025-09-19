extends Node
class_name DataVisualizationExample

## Comprehensive example demonstrating data visualization integration in Godot
## Shows real-time performance monitoring, player statistics, and game analytics

@onready var visualization_bridge: DataVisualizationBridge = $DataVisualizationBridge

@export_group("Example Configuration")
@export var enable_performance_monitoring: bool = true
@export var enable_player_stats: bool = true
@export var enable_game_analytics: bool = true
@export var enable_economy_tracking: bool = true

@export_group("Update Intervals")
@export var performance_update_interval: float = 0.1
@export var player_stats_update_interval: float = 1.0
@export var analytics_update_interval: float = 5.0
@export var economy_update_interval: float = 2.0

@export_group("Simulated Game Data")
@export var current_player: PlayerData
@export var economy_data: EconomyData

# Performance tracking
var performance_tracker: PerformanceTracker
var last_performance_update: float = 0.0
var last_player_stats_update: float = 0.0
var last_analytics_update: float = 0.0
var last_economy_update: float = 0.0

# Game data
var leaderboard_data: Array[PlayerData] = []
var active_charts: Dictionary = {}

#region Data Classes

class PlayerData extends Resource:
    @export var player_name: String = "Player"
    @export var level: int = 1
    @export var health: float = 100.0
    @export var mana: float = 100.0
    @export var experience: float = 0.0
    @export var score: int = 0
    @export var playtime: float = 0.0
    @export var position: Vector3 = Vector3.ZERO
    @export var skills: Dictionary = {}
    @export var inventory: Dictionary = {}

class EconomyData extends Resource:
    @export var resources: Dictionary = {}
    @export var prices: Dictionary = {}
    @export var recent_transactions: Array[Transaction] = []
    @export var total_gold: float = 1000.0

class Transaction extends Resource:
    @export var item: String
    @export var quantity: int
    @export var price: float
    @export var timestamp: float
    @export var player_name: String

#endregion

#region Godot Lifecycle

func _ready():
    initialize_example()

func _process(delta):
    update_simulated_game_data(delta)
    update_visualizations_based_on_intervals()

func _exit_tree():
    cleanup_example()

#endregion

#region Initialization

func initialize_example():
    # Initialize bridge if not assigned
    if not visualization_bridge:
        visualization_bridge = $DataVisualizationBridge
        if not visualization_bridge:
            visualization_bridge = DataVisualizationBridge.new()
            add_child(visualization_bridge)

    # Initialize performance tracker
    performance_tracker = PerformanceTracker.new()

    # Initialize simulated data
    initialize_simulated_data()

    # Set up event handlers
    setup_event_handlers()

    # Create visualization components with delay
    await get_tree().create_timer(1.0).timeout
    initialize_visualizations()

func initialize_simulated_data():
    # Initialize current player
    current_player = PlayerData.new()
    current_player.player_name = "TestPlayer"
    current_player.level = 15
    current_player.health = 85.0
    current_player.mana = 60.0
    current_player.experience = 750.0
    current_player.score = 12500
    current_player.playtime = 3600.0  # 1 hour

    # Initialize skills
    current_player.skills = {
        "Combat": 85.0,
        "Magic": 62.0,
        "Crafting": 43.0,
        "Trade": 78.0,
        "Stealth": 35.0
    }

    # Initialize inventory
    current_player.inventory = {
        "Health Potions": 15,
        "Mana Potions": 8,
        "Iron Sword": 1,
        "Magic Staff": 1,
        "Gold Coins": 250
    }

    # Initialize leaderboard
    for i in range(10):
        var player = PlayerData.new()
        player.player_name = "Player" + str(i + 1)
        player.level = randi_range(10, 25)
        player.score = randi_range(5000, 20000)
        player.playtime = randf_range(1800, 7200)
        leaderboard_data.append(player)

    # Initialize economy data
    economy_data = EconomyData.new()
    economy_data.resources = {
        "Wood": 35.0,
        "Stone": 28.0,
        "Iron": 20.0,
        "Gold": 17.0
    }

    economy_data.prices = {
        "Wood": 2.5,
        "Stone": 3.2,
        "Iron": 8.7,
        "Gold": 25.4
    }

func setup_event_handlers():
    if visualization_bridge:
        visualization_bridge.threshold_crossed.connect(_on_threshold_crossed)
        visualization_bridge.data_point_added.connect(_on_data_point_added)
        visualization_bridge.chart_error.connect(_on_chart_error)

func initialize_visualizations():
    if enable_performance_monitoring:
        setup_performance_monitoring()

    if enable_player_stats:
        setup_player_statistics()

    if enable_game_analytics:
        setup_game_analytics()

    if enable_economy_tracking:
        setup_economy_tracking()

    # Apply custom theme
    apply_game_theme()

    print("DataVisualizationExample: All visualizations initialized")

#endregion

#region Performance Monitoring

func setup_performance_monitoring():
    # Real-time FPS monitor
    visualization_bridge.create_line_chart("fps_chart", {
        "title": "FPS Monitor",
        "max_data_points": 100,
        "real_time": true,
        "y_axis": {"min": 0, "max": 120},
        "datasets": [
            {"name": "FPS", "color": "#ff6b6b"}
        ]
    })

    # System performance multi-line chart
    visualization_bridge.create_line_chart("system_performance", {
        "title": "System Performance",
        "max_data_points": 200,
        "real_time": true,
        "datasets": [
            {"name": "FPS", "color": "#ff6b6b"},
            {"name": "Memory (MB)", "color": "#4ecdc4"},
            {"name": "CPU %", "color": "#45b7d1"}
        ]
    })

    # Performance gauge
    visualization_bridge.create_gauge("performance_gauge", {
        "title": "Overall Performance",
        "min": 0,
        "max": 100,
        "thresholds": [
            {"value": 30, "color": "#ff4444"},
            {"value": 60, "color": "#ffaa00"},
            {"value": 85, "color": "#44ff44"}
        ]
    })

    print("DataVisualizationExample: Performance monitoring setup complete")

func update_performance_monitoring():
    var perf_data = performance_tracker.get_current_metrics()

    # Update FPS chart
    visualization_bridge.update_chart("fps_chart", Time.get_unix_time_from_system(), perf_data.fps)

    # Update multi-line performance chart
    visualization_bridge.update_chart_multi_data("system_performance", {
        "timestamp": Time.get_unix_time_from_system(),
        "data": {
            "FPS": perf_data.fps,
            "Memory": perf_data.memory_usage_mb,
            "CPU": perf_data.cpu_usage_percent
        }
    })

    # Update performance gauge (composite score)
    var performance_score = calculate_performance_score(perf_data)
    visualization_bridge.update_chart("performance_gauge", Time.get_unix_time_from_system(), performance_score)

func calculate_performance_score(metrics: Dictionary) -> float:
    var fps_score = clamp(metrics.fps / 60.0, 0.0, 1.0) * 40.0
    var memory_score = clamp(1.0 - (metrics.memory_usage_mb / 2048.0), 0.0, 1.0) * 30.0
    var cpu_score = clamp(1.0 - (metrics.cpu_usage_percent / 100.0), 0.0, 1.0) * 30.0

    return fps_score + memory_score + cpu_score

#endregion

#region Player Statistics

func setup_player_statistics():
    # Player health/mana gauges
    visualization_bridge.create_gauge("health_gauge", {
        "title": "Health",
        "min": 0,
        "max": 100,
        "value": current_player.health,
        "color": "#ff4444"
    })

    visualization_bridge.create_gauge("mana_gauge", {
        "title": "Mana",
        "min": 0,
        "max": 100,
        "value": current_player.mana,
        "color": "#4444ff"
    })

    # Experience progress
    visualization_bridge.create_gauge("experience_gauge", {
        "title": "Experience",
        "min": 0,
        "max": 1000,
        "value": current_player.experience,
        "color": "#ffaa00"
    })

    # Skills chart
    visualization_bridge.create_bar_chart("skills_chart", {
        "title": "Player Skills",
        "horizontal": true,
        "data": skills_to_array()
    })

    # Inventory pie chart
    visualization_bridge.create_pie_chart("inventory_chart", {
        "title": "Inventory Distribution",
        "data": inventory_to_array()
    })

    print("DataVisualizationExample: Player statistics setup complete")

func update_player_statistics():
    # Simulate player data changes
    simulate_player_data_changes()

    # Update gauges
    visualization_bridge.update_chart("health_gauge", Time.get_unix_time_from_system(), current_player.health)
    visualization_bridge.update_chart("mana_gauge", Time.get_unix_time_from_system(), current_player.mana)
    visualization_bridge.update_chart("experience_gauge", Time.get_unix_time_from_system(), current_player.experience)

    # Update charts
    visualization_bridge.update_chart("skills_chart", skills_to_array())
    visualization_bridge.update_chart("inventory_chart", inventory_to_array())

func simulate_player_data_changes():
    # Simulate health/mana regeneration and usage
    if randf() < 0.3:
        current_player.health = clamp(current_player.health + randf_range(-5.0, 3.0), 0.0, 100.0)

    if randf() < 0.3:
        current_player.mana = clamp(current_player.mana + randf_range(-8.0, 5.0), 0.0, 100.0)

    # Simulate experience gain
    if randf() < 0.1:
        current_player.experience += randf_range(5.0, 25.0)
        if current_player.experience >= 1000.0:
            current_player.level += 1
            current_player.experience = 0.0

    # Simulate skill progression
    if randf() < 0.05:
        var skill_keys = current_player.skills.keys()
        if skill_keys.size() > 0:
            var random_skill = skill_keys[randi() % skill_keys.size()]
            current_player.skills[random_skill] = min(current_player.skills[random_skill] + randf_range(0.5, 2.0), 100.0)

func skills_to_array() -> Array:
    var result = []
    for skill in current_player.skills:
        result.append({"name": skill, "value": current_player.skills[skill]})
    return result

func inventory_to_array() -> Array:
    var result = []
    for item in current_player.inventory:
        result.append({"name": item, "value": current_player.inventory[item]})
    return result

#endregion

#region Game Analytics

func setup_game_analytics():
    # Leaderboard
    visualization_bridge.create_bar_chart("leaderboard", {
        "title": "Top Players",
        "horizontal": true,
        "max_entries": 10,
        "data": get_leaderboard_array()
    })

    # Player activity heatmap
    visualization_bridge.create_heatmap("activity_heatmap", {
        "title": "Player Activity Zones",
        "width": 20,
        "height": 20,
        "color_scale": ["#000033", "#0066cc", "#00ccff", "#ffff00", "#ff0000"]
    })

    # Session time distribution
    visualization_bridge.create_pie_chart("session_time_chart", {
        "title": "Session Time Distribution",
        "data": [
            {"name": "0-30 min", "value": 25},
            {"name": "30-60 min", "value": 35},
            {"name": "1-2 hours", "value": 25},
            {"name": "2+ hours", "value": 15}
        ]
    })

    print("DataVisualizationExample: Game analytics setup complete")

func update_game_analytics():
    # Update leaderboard with simulated changes
    simulate_leaderboard_changes()
    visualization_bridge.update_chart("leaderboard", get_leaderboard_array())

    # Update activity heatmap
    update_activity_heatmap()

func simulate_leaderboard_changes():
    # Randomly update some player scores
    for player in leaderboard_data:
        if randf() < 0.2:
            player.score += randi_range(50, 200)

func get_leaderboard_array() -> Array:
    # Sort by score descending
    var sorted_players = leaderboard_data.duplicate()
    sorted_players.sort_custom(func(a, b): return a.score > b.score)

    var result = []
    for i in range(min(10, sorted_players.size())):
        var player = sorted_players[i]
        result.append({"name": player.player_name, "value": player.score})
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

    visualization_bridge.update_chart("activity_heatmap", heatmap_data)

#endregion

#region Economy Tracking

func setup_economy_tracking():
    # Resource distribution
    visualization_bridge.create_pie_chart("resource_distribution", {
        "title": "Resource Distribution",
        "donut": true,
        "data": get_resource_array()
    })

    # Price history
    visualization_bridge.create_line_chart("price_history", {
        "title": "Market Prices",
        "datasets": get_price_datasets(),
        "real_time": true,
        "max_data_points": 50
    })

    # Transaction volume
    visualization_bridge.create_bar_chart("transaction_volume", {
        "title": "Transaction Volume",
        "data": get_volume_array()
    })

    print("DataVisualizationExample: Economy tracking setup complete")

func update_economy_tracking():
    # Simulate market fluctuations
    simulate_market_changes()

    # Update resource distribution
    visualization_bridge.update_chart("resource_distribution", get_resource_array())

    # Update price history
    visualization_bridge.update_chart_multi_data("price_history", {
        "timestamp": Time.get_unix_time_from_system(),
        "data": economy_data.prices
    })

    # Simulate new transaction
    if randf() < 0.3:
        simulate_transaction()

func simulate_market_changes():
    # Simulate price fluctuations
    for resource in economy_data.prices:
        var change = randf_range(-0.5, 0.5)
        economy_data.prices[resource] = max(0.1, economy_data.prices[resource] + change)

    # Simulate resource quantity changes
    for resource in economy_data.resources:
        var change = randf_range(-2.0, 3.0)
        economy_data.resources[resource] = max(0.0, economy_data.resources[resource] + change)

func simulate_transaction():
    var resource_keys = economy_data.resources.keys()
    if resource_keys.size() > 0:
        var random_resource = resource_keys[randi() % resource_keys.size()]
        var transaction = Transaction.new()
        transaction.item = random_resource
        transaction.quantity = randi_range(1, 10)
        transaction.price = economy_data.prices[random_resource]
        transaction.timestamp = Time.get_time_from_start()
        transaction.player_name = "Player" + str(randi_range(1, 100))

        economy_data.recent_transactions.append(transaction)

        # Keep only recent transactions
        if economy_data.recent_transactions.size() > 100:
            economy_data.recent_transactions.pop_front()

        print("New transaction: ", transaction.player_name, " bought ", transaction.quantity, " ", transaction.item, " for ", "%.2f" % transaction.price, " each")

func get_resource_array() -> Array:
    var result = []
    for resource in economy_data.resources:
        result.append({
            "name": resource,
            "value": economy_data.resources[resource],
            "color": get_resource_color(resource)
        })
    return result

func get_price_datasets() -> Array:
    var result = []
    for resource in economy_data.prices:
        result.append({
            "name": resource,
            "color": get_resource_color(resource)
        })
    return result

func get_volume_array() -> Array:
    var result = []
    for resource in economy_data.resources:
        result.append({
            "name": resource,
            "value": randi_range(5, 25)
        })
    return result

func get_resource_color(resource: String) -> String:
    match resource:
        "Wood":
            return "#8b4513"
        "Stone":
            return "#696969"
        "Iron":
            return "#708090"
        "Gold":
            return "#ffd700"
        _:
            return "#cccccc"

#endregion

#region Theme and Configuration

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

    visualization_bridge.set_theme(game_theme)
    print("DataVisualizationExample: Game theme applied")

#endregion

#region Update Logic

func update_simulated_game_data(delta: float):
    # Simulate player movement
    current_player.position += Vector3(
        randf_range(-0.1, 0.1),
        0,
        randf_range(-0.1, 0.1)
    )

    # Update playtime
    current_player.playtime += delta

    # Update performance tracker
    performance_tracker.update()

func update_visualizations_based_on_intervals():
    var current_time = Time.get_time_from_start()

    # Performance monitoring updates
    if enable_performance_monitoring and current_time - last_performance_update >= performance_update_interval:
        update_performance_monitoring()
        last_performance_update = current_time

    # Player statistics updates
    if enable_player_stats and current_time - last_player_stats_update >= player_stats_update_interval:
        update_player_statistics()
        last_player_stats_update = current_time

    # Game analytics updates
    if enable_game_analytics and current_time - last_analytics_update >= analytics_update_interval:
        update_game_analytics()
        last_analytics_update = current_time

    # Economy tracking updates
    if enable_economy_tracking and current_time - last_economy_update >= economy_update_interval:
        update_economy_tracking()
        last_economy_update = current_time

#endregion

#region Event Handlers

func _on_threshold_crossed(chart_id: String, threshold_data: Dictionary):
    print("Threshold crossed in chart '", chart_id, "': ", threshold_data)

    # Handle specific threshold events
    match chart_id:
        "fps_chart":
            handle_fps_threshold(threshold_data)
        "health_gauge":
            handle_health_threshold(threshold_data)
        "performance_gauge":
            handle_performance_threshold(threshold_data)

func _on_data_point_added(chart_id: String, data_point: Dictionary):
    # Log data point additions if needed (debug mode)
    if visualization_bridge.enable_debug_mode:
        print("Data point added to '", chart_id, "': ", data_point)

func _on_chart_error(chart_id: String, error_message: String):
    print("Chart error in '", chart_id, "': ", error_message)

func handle_fps_threshold(data: Dictionary):
    # Show performance warning
    print("FPS dropped below threshold!")

func handle_health_threshold(data: Dictionary):
    # Trigger health warning effects
    print("Player health is critically low!")

func handle_performance_threshold(data: Dictionary):
    # Adjust quality settings automatically
    print("Overall performance below threshold - consider reducing quality settings")

#endregion

#region Public Interface

@export_group("Debug")
@export var enable_debug_logging: bool = false

func toggle_performance_monitoring():
    enable_performance_monitoring = !enable_performance_monitoring
    print("Performance monitoring: ", "Enabled" if enable_performance_monitoring else "Disabled")

func toggle_player_stats():
    enable_player_stats = !enable_player_stats
    print("Player statistics: ", "Enabled" if enable_player_stats else "Disabled")

func toggle_game_analytics():
    enable_game_analytics = !enable_game_analytics
    print("Game analytics: ", "Enabled" if enable_game_analytics else "Disabled")

func toggle_economy_tracking():
    enable_economy_tracking = !enable_economy_tracking
    print("Economy tracking: ", "Enabled" if enable_economy_tracking else "Disabled")

func reset_all_charts():
    visualization_bridge.clear_all_charts()
    await get_tree().create_timer(1.0).timeout
    initialize_visualizations()

#endregion

#region Cleanup

func cleanup_example():
    if visualization_bridge:
        visualization_bridge.threshold_crossed.disconnect(_on_threshold_crossed)
        visualization_bridge.data_point_added.disconnect(_on_data_point_added)
        visualization_bridge.chart_error.disconnect(_on_chart_error)

        visualization_bridge.clear_all_charts()

    active_charts.clear()
    print("DataVisualizationExample: Cleanup complete")

#endregion

#region Performance Tracking Utility

class PerformanceTracker:
    var fps_history: Array[float] = []
    var memory_history: Array[float] = []
    var last_memory_check: float = 0.0
    const MAX_HISTORY_SIZE = 60  # 1 minute at 1fps tracking

    func update():
        # Track FPS
        var current_fps = Engine.get_frames_per_second()
        fps_history.append(current_fps)

        # Track memory (check every second to avoid performance impact)
        if Time.get_time_from_start() - last_memory_check >= 1.0:
            var memory_mb = OS.get_static_memory_usage_by_type().values().reduce(func(a, b): return a + b, 0) / 1024.0 / 1024.0
            memory_history.append(memory_mb)
            last_memory_check = Time.get_time_from_start()

        # Maintain history size
        if fps_history.size() > MAX_HISTORY_SIZE:
            fps_history.pop_front()

        if memory_history.size() > MAX_HISTORY_SIZE:
            memory_history.pop_front()

    func get_current_metrics() -> Dictionary:
        var current_fps = fps_history[-1] if fps_history.size() > 0 else 0.0
        var current_memory = memory_history[-1] if memory_history.size() > 0 else 0.0

        return {
            "fps": current_fps,
            "memory_usage_mb": current_memory,
            "cpu_usage_percent": get_cpu_usage(),
            "average_fps": fps_history.reduce(func(a, b): return a + b, 0.0) / fps_history.size() if fps_history.size() > 0 else 0.0,
            "min_fps": fps_history.min() if fps_history.size() > 0 else 0.0,
            "max_fps": fps_history.max() if fps_history.size() > 0 else 0.0
        }

    func get_cpu_usage() -> float:
        # This is a simplified CPU usage simulation
        # In a real implementation, you would use platform-specific APIs
        return randf_range(10.0, 80.0)

#endregion