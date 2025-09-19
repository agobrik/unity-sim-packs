extends Node
class_name DataVisualizationBridge

## Godot bridge for the Data Visualization JavaScript package
## Provides seamless integration between Godot GDScript and JavaScript charting library

signal threshold_crossed(chart_id: String, threshold_data: Dictionary)
signal data_point_added(chart_id: String, data_point: Dictionary)
signal chart_error(chart_id: String, error_message: String)

@export var enable_debug_mode: bool = false
@export var package_path: String = "javascript/node_modules/@steamproject/data-visualization"
@export var memory_limit: int = 50 * 1024 * 1024  # 50MB
@export var auto_cleanup: bool = true

@export_group("Performance")
@export var enable_batch_updates: bool = true
@export var batch_interval: float = 0.1  # 100ms
@export var max_data_points_per_chart: int = 1000

# JavaScript Engine Integration
var js_bridge: JavaScriptBridge
var is_initialized: bool = false

# Chart Management
var charts: Dictionary = {}
var dashboards: Dictionary = {}

# Batch Update System
var pending_updates: Array = []
var last_batch_time: float = 0.0

# Performance Tracking
var performance_stats: Dictionary = {}

func _ready():
    initialize_javascript_bridge()

func _process(delta):
    if enable_batch_updates and Time.get_time_from_start() - last_batch_time >= batch_interval:
        process_batched_updates()
        last_batch_time = Time.get_time_from_start()

func _exit_tree():
    dispose()

#region Initialization

func initialize_javascript_bridge():
    try:
        if OS.has_feature("web"):
            # Web platform - use Godot's built-in JavaScript bridge
            js_bridge = JavaScriptBridge
            initialize_web_environment()
        else:
            # Native platform - use JavaScript engine
            initialize_native_environment()

        is_initialized = true
        print("DataVisualizationBridge: JavaScript bridge initialized successfully")

    except error:
        print("DataVisualizationBridge: Failed to initialize JavaScript bridge: ", error)
        is_initialized = false

func initialize_web_environment():
    # Initialize for web/HTML5 export
    var init_code = """
        window.GodotDataVisualization = {
            charts: {},
            dashboards: {},

            // Initialize the visualization manager
            init: function() {
                if (typeof DataVisualizationManager !== 'undefined') {
                    this.manager = new DataVisualizationManager({
                        debug: %s,
                        autoCleanup: %s,
                        memoryLimit: %d,
                        maxDataPointsPerChart: %d
                    });

                    // Set up event handlers
                    this.manager.on('thresholdCrossed', function(data) {
                        godot.emit_signal('threshold_crossed', data.chartId, data);
                    });

                    this.manager.on('dataPointAdded', function(data) {
                        godot.emit_signal('data_point_added', data.chartId, data);
                    });

                    this.manager.on('error', function(error) {
                        godot.emit_signal('chart_error', error.chartId, error.message);
                    });

                    console.log('GodotDataVisualization initialized');
                } else {
                    console.error('DataVisualizationManager not found');
                }
            },

            // Utility functions
            log: function(message) { console.log('[Godot] ' + message); },
            warn: function(message) { console.warn('[Godot] ' + message); },
            error: function(message) { console.error('[Godot] ' + message); }
        };

        // Initialize when ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                window.GodotDataVisualization.init();
            });
        } else {
            window.GodotDataVisualization.init();
        }
    """ % [str(enable_debug_mode).to_lower(), str(auto_cleanup).to_lower(), memory_limit, max_data_points_per_chart]

    JavaScriptBridge.eval(init_code)

func initialize_native_environment():
    # Initialize for native platforms using V8 or similar
    var package_full_path = ProjectSettings.globalize_path("res://" + package_path)
    var main_file = package_full_path + "/dist/index.js"

    if not FileAccess.file_exists(main_file):
        print("DataVisualizationBridge: Package not found at ", main_file)
        return

    # Load the main package file
    var file = FileAccess.open(main_file, FileAccess.READ)
    if file:
        var package_code = file.get_as_text()
        file.close()

        # Execute JavaScript code in native environment
        execute_javascript(package_code)

        # Initialize the visualization manager
        var init_script = """
            global.vizManager = new DataVisualizationManager({
                debug: %s,
                autoCleanup: %s,
                memoryLimit: %d,
                maxDataPointsPerChart: %d
            });

            // Set up event handlers
            global.vizManager.on('thresholdCrossed', function(data) {
                Godot.emitSignal('threshold_crossed', data.chartId, JSON.stringify(data));
            });

            global.vizManager.on('dataPointAdded', function(data) {
                Godot.emitSignal('data_point_added', data.chartId, JSON.stringify(data));
            });

            global.vizManager.on('error', function(error) {
                Godot.emitSignal('chart_error', error.chartId, error.message);
            });
        """ % [str(enable_debug_mode).to_lower(), str(auto_cleanup).to_lower(), memory_limit, max_data_points_per_chart]

        execute_javascript(init_script)

func execute_javascript(code: String):
    if OS.has_feature("web"):
        JavaScriptBridge.eval(code)
    else:
        # For native platforms, we'd need a JavaScript engine integration
        # This would require a custom JavaScript engine plugin for Godot
        print("Native JavaScript execution not implemented - use web export for full functionality")

#endregion

#region Chart Management

func create_line_chart(chart_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createLineChart('%s', %s);" % [chart_id, config_json]

        execute_javascript(script)
        charts[chart_id] = config

        print("DataVisualizationBridge: Created line chart '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create line chart '", chart_id, "': ", error)

func create_bar_chart(chart_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createBarChart('%s', %s);" % [chart_id, config_json]

        execute_javascript(script)
        charts[chart_id] = config

        print("DataVisualizationBridge: Created bar chart '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create bar chart '", chart_id, "': ", error)

func create_pie_chart(chart_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createPieChart('%s', %s);" % [chart_id, config_json]

        execute_javascript(script)
        charts[chart_id] = config

        print("DataVisualizationBridge: Created pie chart '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create pie chart '", chart_id, "': ", error)

func create_heatmap(chart_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createHeatmap('%s', %s);" % [chart_id, config_json]

        execute_javascript(script)
        charts[chart_id] = config

        print("DataVisualizationBridge: Created heatmap '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create heatmap '", chart_id, "': ", error)

func create_gauge(chart_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createGauge('%s', %s);" % [chart_id, config_json]

        execute_javascript(script)
        charts[chart_id] = config

        print("DataVisualizationBridge: Created gauge '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create gauge '", chart_id, "': ", error)

func create_dashboard(dashboard_id: String, config: Dictionary):
    if not is_initialized:
        return

    try:
        var config_json = JSON.stringify(config)
        var script = "window.GodotDataVisualization.manager.createDashboard('%s', %s);" % [dashboard_id, config_json]

        execute_javascript(script)
        dashboards[dashboard_id] = config

        print("DataVisualizationBridge: Created dashboard '", dashboard_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to create dashboard '", dashboard_id, "': ", error)

#endregion

#region Data Updates

func update_chart(chart_id: String, timestamp_or_data, value = null):
    if not is_initialized:
        return

    if enable_batch_updates:
        if value != null:
            # Single data point update
            pending_updates.append({
                "chart_id": chart_id,
                "method": "update_single_data",
                "data": {"timestamp": timestamp_or_data, "value": value},
                "timestamp": Time.get_time_from_start()
            })
        else:
            # Array data update
            pending_updates.append({
                "chart_id": chart_id,
                "method": "update_array_data",
                "data": timestamp_or_data,
                "timestamp": Time.get_time_from_start()
            })
    else:
        if value != null:
            update_chart_immediate(chart_id, timestamp_or_data, value)
        else:
            update_chart_array_data_immediate(chart_id, timestamp_or_data)

func update_chart_multi_data(chart_id: String, data: Dictionary):
    if not is_initialized:
        return

    if enable_batch_updates:
        pending_updates.append({
            "chart_id": chart_id,
            "method": "update_multi_data",
            "data": data,
            "timestamp": Time.get_time_from_start()
        })
    else:
        update_chart_multi_data_immediate(chart_id, data)

func update_dashboard(dashboard_id: String, data: Dictionary):
    if not is_initialized:
        return

    try:
        var data_json = JSON.stringify(data)
        var script = "window.GodotDataVisualization.manager.updateDashboard('%s', %s);" % [dashboard_id, data_json]

        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to update dashboard '", dashboard_id, "': ", error)

func update_chart_immediate(chart_id: String, timestamp, value):
    try:
        var value_json = JSON.stringify(value)
        var script = "window.GodotDataVisualization.manager.updateChart('%s', %s, %s);" % [chart_id, str(timestamp), value_json]

        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to update chart '", chart_id, "': ", error)

func update_chart_multi_data_immediate(chart_id: String, data: Dictionary):
    try:
        var data_json = JSON.stringify(data)
        var script = "window.GodotDataVisualization.manager.updateChartMultiData('%s', %s);" % [chart_id, data_json]

        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to update chart multi-data '", chart_id, "': ", error)

func update_chart_array_data_immediate(chart_id: String, data):
    try:
        var data_json = JSON.stringify(data)
        var script = "window.GodotDataVisualization.manager.updateChartArrayData('%s', %s);" % [chart_id, data_json]

        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to update chart array data '", chart_id, "': ", error)

#endregion

#region Batch Updates

func process_batched_updates():
    if pending_updates.size() == 0:
        return

    try:
        # Group updates by chart ID for efficiency
        var grouped_updates = {}

        for update in pending_updates:
            var chart_id = update.chart_id
            if not grouped_updates.has(chart_id):
                grouped_updates[chart_id] = []
            grouped_updates[chart_id].append(update)

        # Process updates for each chart
        for chart_id in grouped_updates:
            var updates = grouped_updates[chart_id]

            # Build batch update script
            var batch_script = "window.GodotDataVisualization.manager.startBatch('%s');" % chart_id

            for update in updates:
                var data_json = JSON.stringify(update.data)

                match update.method:
                    "update_single_data":
                        batch_script += "window.GodotDataVisualization.manager.batchUpdateSingle('%s', %s);" % [chart_id, data_json]
                    "update_multi_data":
                        batch_script += "window.GodotDataVisualization.manager.batchUpdateMulti('%s', %s);" % [chart_id, data_json]
                    "update_array_data":
                        batch_script += "window.GodotDataVisualization.manager.batchUpdateArray('%s', %s);" % [chart_id, data_json]

            batch_script += "window.GodotDataVisualization.manager.commitBatch('%s');" % chart_id

            execute_javascript(batch_script)

        pending_updates.clear()
    except error:
        print("DataVisualizationBridge: Failed to process batched updates: ", error)
        pending_updates.clear()  # Clear to prevent accumulation

func apply_batched_updates(updates: Array):
    pending_updates.append_array(updates)
    process_batched_updates()

#endregion

#region Configuration

func set_theme(theme: Dictionary):
    if not is_initialized:
        return

    try:
        var theme_json = JSON.stringify(theme)
        var script = "window.GodotDataVisualization.manager.setTheme(%s);" % theme_json

        execute_javascript(script)
        print("DataVisualizationBridge: Theme applied successfully")
    except error:
        print("DataVisualizationBridge: Failed to set theme: ", error)

func set_debug_mode(enabled: bool):
    enable_debug_mode = enabled

    if is_initialized:
        try:
            var script = "window.GodotDataVisualization.manager.setDebugMode(%s);" % str(enabled).to_lower()
            execute_javascript(script)
        except error:
            print("DataVisualizationBridge: Failed to set debug mode: ", error)

func set_log_level(level: String):
    if not is_initialized:
        return

    try:
        var script = "window.GodotDataVisualization.manager.setLogLevel('%s');" % level
        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to set log level: ", error)

func show_performance_stats(show: bool):
    if not is_initialized:
        return

    try:
        var script = "window.GodotDataVisualization.manager.showPerformanceStats(%s);" % str(show).to_lower()
        execute_javascript(script)
    except error:
        print("DataVisualizationBridge: Failed to toggle performance stats: ", error)

func set_memory_limit(limit_bytes: int):
    memory_limit = limit_bytes

    if is_initialized:
        try:
            var script = "window.GodotDataVisualization.manager.setMemoryLimit(%d);" % limit_bytes
            execute_javascript(script)
        except error:
            print("DataVisualizationBridge: Failed to set memory limit: ", error)

func enable_auto_cleanup(enabled: bool):
    auto_cleanup = enabled

    if is_initialized:
        try:
            var script = "window.GodotDataVisualization.manager.enableAutoCleanup(%s);" % str(enabled).to_lower()
            execute_javascript(script)
        except error:
            print("DataVisualizationBridge: Failed to set auto cleanup: ", error)

func enable_batch_updates(enabled: bool):
    enable_batch_updates = enabled

func set_batch_interval(interval: float):
    batch_interval = interval

func set_max_data_points_per_chart(max_points: int):
    max_data_points_per_chart = max_points

#endregion

#region Chart Management

func remove_chart(chart_id: String):
    if not is_initialized:
        return

    try:
        var script = "window.GodotDataVisualization.manager.removeChart('%s');" % chart_id
        execute_javascript(script)

        charts.erase(chart_id)
        print("DataVisualizationBridge: Removed chart '", chart_id, "'")
    except error:
        print("DataVisualizationBridge: Failed to remove chart '", chart_id, "': ", error)

func clear_all_charts():
    if not is_initialized:
        return

    try:
        var script = "window.GodotDataVisualization.manager.clearAllCharts();"
        execute_javascript(script)

        charts.clear()
        dashboards.clear()
        print("DataVisualizationBridge: Cleared all charts")
    except error:
        print("DataVisualizationBridge: Failed to clear all charts: ", error)

#endregion

#region Utilities

func get_chart_data(chart_id: String) -> Dictionary:
    if not charts.has(chart_id):
        return {}

    try:
        var script = "JSON.stringify(window.GodotDataVisualization.manager.getChartData('%s'));" % chart_id
        var result = execute_javascript(script)

        if result is String:
            var json = JSON.new()
            var parse_result = json.parse(result)
            if parse_result == OK:
                return json.data

        return {}
    except error:
        print("DataVisualizationBridge: Failed to get chart data for '", chart_id, "': ", error)
        return {}

func export_chart_as_image(chart_id: String, format: String = "png", options: Dictionary = {}) -> String:
    if not is_initialized:
        return ""

    try:
        var options_json = JSON.stringify(options)
        var script = "window.GodotDataVisualization.manager.exportAsImage('%s', '%s', %s);" % [chart_id, format, options_json]
        var result = execute_javascript(script)
        return result if result is String else ""
    except error:
        print("DataVisualizationBridge: Failed to export chart as image: ", error)
        return ""

func export_chart_as_data(chart_id: String, format: String = "json") -> String:
    if not is_initialized:
        return ""

    try:
        var script = "window.GodotDataVisualization.manager.exportAsData('%s', '%s');" % [chart_id, format]
        var result = execute_javascript(script)
        return result if result is String else ""
    except error:
        print("DataVisualizationBridge: Failed to export chart data: ", error)
        return ""

func get_performance_stats() -> Dictionary:
    if not is_initialized:
        return {}

    try:
        var script = "JSON.stringify(window.GodotDataVisualization.manager.getPerformanceStats());"
        var result = execute_javascript(script)

        if result is String:
            var json = JSON.new()
            var parse_result = json.parse(result)
            if parse_result == OK:
                return json.data

        return {}
    except error:
        print("DataVisualizationBridge: Failed to get performance stats: ", error)
        return {}

#endregion

#region Event Handlers (for JavaScript callbacks)

func _on_threshold_crossed(chart_id: String, data_string: String):
    var json = JSON.new()
    var parse_result = json.parse(data_string)

    if parse_result == OK:
        threshold_crossed.emit(chart_id, json.data)
    else:
        threshold_crossed.emit(chart_id, {"raw": data_string})

func _on_data_point_added(chart_id: String, data_string: String):
    var json = JSON.new()
    var parse_result = json.parse(data_string)

    if parse_result == OK:
        data_point_added.emit(chart_id, json.data)
    else:
        data_point_added.emit(chart_id, {"raw": data_string})

func _on_chart_error(chart_id: String, error_message: String):
    chart_error.emit(chart_id, error_message)

#endregion

#region Cleanup

func dispose():
    try:
        if is_initialized:
            clear_all_charts()

            if OS.has_feature("web"):
                var script = "if (window.GodotDataVisualization && window.GodotDataVisualization.manager) { window.GodotDataVisualization.manager.dispose(); }"
                execute_javascript(script)

        charts.clear()
        dashboards.clear()
        pending_updates.clear()

        is_initialized = false
        print("DataVisualizationBridge: Disposed successfully")
    except error:
        print("DataVisualizationBridge: Error during disposal: ", error)

#endregion

#region Helper Functions

func try(callable: Callable):
    # Simple try-catch simulation for GDScript
    var result = callable.call()
    return result

func except(error):
    # Error handling helper
    print("Error occurred: ", error)

#endregion