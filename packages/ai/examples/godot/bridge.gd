# Steam AI Bridge for Godot
# Provides JavaScript execution environment for Steam AI package integration

extends RefCounted
class_name AIBridge

signal ready_signal
signal error_signal(message: String)

var is_initialized: bool = false
var enable_debug_logging: bool = false
var js_bridge: JavaScriptBridge
var steam_ai_code: String = ""

func _init():
    js_bridge = JavaScriptBridge.create()

func initialize() -> void:
    """Initialize the JavaScript bridge and load Steam AI package"""
    try:
        setup_javascript_environment()
        load_steam_ai_package()
        setup_godot_bindings()
        is_initialized = true
        ready_signal.emit()

        if enable_debug_logging:
            print("AI Bridge initialized successfully")
    except Exception as e:
        print("Failed to initialize AI Bridge: ", e.message)
        error_signal.emit(e.message)

func setup_javascript_environment() -> void:
    """Set up the basic JavaScript execution environment"""

    # Create global objects and utilities
    var init_script = """
        // Global object setup
        window = globalThis;
        global = globalThis;

        // Console implementation for debugging
        window.console = {
            log: function(...args) {
                window.GodotDebug.log(args.map(String).join(' '));
            },
            warn: function(...args) {
                window.GodotDebug.warn(args.map(String).join(' '));
            },
            error: function(...args) {
                window.GodotDebug.error(args.map(String).join(' '));
            },
            info: function(...args) {
                window.GodotDebug.log('[INFO] ' + args.map(String).join(' '));
            }
        };

        // Date and time utilities
        window.Date = Date;
        window.Math = Math;
        window.JSON = JSON;

        // Godot-specific utilities
        window.Godot = {
            time: function() {
                return window.GodotTime.get_time();
            },
            deltaTime: function() {
                return window.GodotTime.get_delta();
            },
            createVector3: function(x, y, z) {
                return { x: x || 0, y: y || 0, z: z || 0 };
            },
            distance: function(a, b) {
                if (!a || !b) return 0;
                const dx = (a.x || 0) - (b.x || 0);
                const dy = (a.y || 0) - (b.y || 0);
                const dz = (a.z || 0) - (b.z || 0);
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            },
            normalize: function(v) {
                if (!v) return { x: 0, y: 0, z: 0 };
                const mag = Math.sqrt((v.x || 0) * (v.x || 0) + (v.y || 0) * (v.y || 0) + (v.z || 0) * (v.z || 0));
                if (mag === 0) return { x: 0, y: 0, z: 0 };
                return { x: (v.x || 0) / mag, y: (v.y || 0) / mag, z: (v.z || 0) / mag };
            }
        };

        // Simple require function for module loading
        window.require = function(moduleName) {
            if (moduleName === '@steam-sim/ai') {
                return window.SteamAI;
            }
            throw new Error('Module not found: ' + moduleName);
        };

        // Module system
        window.module = { exports: {} };
        window.exports = window.module.exports;

        // Global storage for AI objects
        window.agents = {};
        window.behaviorTrees = {};
        window.stateMachines = {};

        // Callback system for Godot integration
        window.GodotCallAction = function(agentId, actionName, agent, blackboard) {
            try {
                return window.GodotBridge.call_action(agentId, actionName, JSON.stringify(agent), JSON.stringify(blackboard));
            } catch (e) {
                window.console.error('Action callback error:', e.message);
                return false;
            }
        };

        window.GodotCallCondition = function(agentId, conditionName, agent, blackboard) {
            try {
                return window.GodotBridge.call_condition(agentId, conditionName, JSON.stringify(agent), JSON.stringify(blackboard));
            } catch (e) {
                window.console.error('Condition callback error:', e.message);
                return false;
            }
        };

        // Event system
        window.AIEvents = {
            listeners: {},
            emit: function(eventName, data) {
                if (this.listeners[eventName]) {
                    this.listeners[eventName].forEach(function(callback) {
                        try {
                            callback(data);
                        } catch (e) {
                            window.console.error('Event listener error:', e.message);
                        }
                    });
                }
            },
            on: function(eventName, callback) {
                if (!this.listeners[eventName]) {
                    this.listeners[eventName] = [];
                }
                this.listeners[eventName].push(callback);
            },
            off: function(eventName, callback) {
                if (this.listeners[eventName]) {
                    const index = this.listeners[eventName].indexOf(callback);
                    if (index > -1) {
                        this.listeners[eventName].splice(index, 1);
                    }
                }
            }
        };

        console.log('JavaScript environment initialized');
    """

    execute_script(init_script)

func load_steam_ai_package() -> void:
    """Load the Steam AI package JavaScript code"""

    var ai_file_path = "res://javascript/steam-ai.js"

    if not FileAccess.file_exists(ai_file_path):
        # Try alternative locations
        var alt_paths = [
            "res://scripts/javascript/steam-ai.js",
            "res://addons/steam-ai/steam-ai.js",
            "res://steam-ai.js"
        ]

        var found = false
        for path in alt_paths:
            if FileAccess.file_exists(path):
                ai_file_path = path
                found = true
                break

        if not found:
            push_error("Steam AI package not found. Please ensure steam-ai.js is in res://javascript/ or another accessible location.")
            return

    var file = FileAccess.open(ai_file_path, FileAccess.READ)
    if file == null:
        push_error("Could not open Steam AI package file: " + ai_file_path)
        return

    steam_ai_code = file.get_as_text()
    file.close()

    # Execute the Steam AI package code
    var wrapped_code = """
        (function() {
            %s

            // Export the Steam AI modules to global scope
            if (typeof module !== 'undefined' && module.exports) {
                window.SteamAI = module.exports;
            }

            console.log('Steam AI package loaded');
        })();
    """ % steam_ai_code

    execute_script(wrapped_code)

    if enable_debug_logging:
        print("Steam AI package loaded successfully")

func setup_godot_bindings() -> void:
    """Set up Godot-specific bindings for JavaScript environment"""

    # Create bridge objects
    var godot_bridge = GodotBridge.new()
    var godot_debug = GodotDebug.new()
    var godot_time = GodotTime.new()

    # Register with JavaScript bridge
    js_bridge.bind_global_object("GodotBridge", godot_bridge)
    js_bridge.bind_global_object("GodotDebug", godot_debug)
    js_bridge.bind_global_object("GodotTime", godot_time)

    if enable_debug_logging:
        print("Godot bindings set up successfully")

func execute_script(script: String) -> Variant:
    """Execute JavaScript code and return the result"""
    if not is_initialized and not script.begins_with("(function()"):
        push_warning("Attempting to execute script before bridge is fully initialized")

    try:
        var result = js_bridge.eval(script)
        return result
    except Exception as e:
        var error_msg = "JavaScript execution error: " + e.message
        if enable_debug_logging:
            print(error_msg)
        error_signal.emit(error_msg)
        push_error(error_msg)
        return null

func execute_function(function_name: String, args: Array = []) -> Variant:
    """Execute a JavaScript function with arguments"""
    if not is_initialized:
        push_error("Bridge not initialized")
        return null

    try:
        var script = function_name
        if args.size() > 0:
            var arg_strings = []
            for arg in args:
                if arg is String:
                    arg_strings.append("'" + arg.replace("'", "\\'") + "'")
                else:
                    arg_strings.append(str(arg))
            script += "(" + ",".join(arg_strings) + ")"
        else:
            script += "()"

        return execute_script(script)
    except Exception as e:
        var error_msg = "JavaScript function execution error: " + e.message
        if enable_debug_logging:
            print(error_msg)
        error_signal.emit(error_msg)
        return null

func add_global_object(name: String, object: Object) -> void:
    """Add a global object to the JavaScript environment"""
    if js_bridge:
        js_bridge.bind_global_object(name, object)

func remove_global_object(name: String) -> void:
    """Remove a global object from the JavaScript environment"""
    execute_script("delete window." + name + ";")

func force_garbage_collection() -> void:
    """Force garbage collection in the JavaScript engine"""
    execute_script("if (typeof gc !== 'undefined') { gc(); }")

# Helper classes for Godot-JavaScript integration

class GodotBridge extends RefCounted:
    """Main bridge class for communication between Godot and JavaScript"""

    var agent_callbacks: Dictionary = {}
    var action_callbacks: Dictionary = {}
    var condition_callbacks: Dictionary = {}

    func register_agent_callbacks(agent_id: String, actions: Dictionary, conditions: Dictionary):
        action_callbacks[agent_id] = actions
        condition_callbacks[agent_id] = conditions

    func call_action(agent_id: String, action_name: String, agent_json: String, blackboard_json: String) -> bool:
        if not action_callbacks.has(agent_id):
            push_warning("No action callbacks registered for agent: " + agent_id)
            return false

        var actions = action_callbacks[agent_id]
        if not actions.has(action_name):
            push_warning("Action not found: " + action_name + " for agent: " + agent_id)
            return false

        var agent_data = JSON.parse_string(agent_json)
        var blackboard_data = JSON.parse_string(blackboard_json)

        var callable = actions[action_name]
        if callable is Callable:
            return callable.call(agent_data, blackboard_data)
        else:
            push_warning("Action callback is not callable: " + action_name)
            return false

    func call_condition(agent_id: String, condition_name: String, agent_json: String, blackboard_json: String) -> bool:
        if not condition_callbacks.has(agent_id):
            push_warning("No condition callbacks registered for agent: " + agent_id)
            return false

        var conditions = condition_callbacks[agent_id]
        if not conditions.has(condition_name):
            push_warning("Condition not found: " + condition_name + " for agent: " + agent_id)
            return false

        var agent_data = JSON.parse_string(agent_json)
        var blackboard_data = JSON.parse_string(blackboard_json)

        var callable = conditions[condition_name]
        if callable is Callable:
            return callable.call(agent_data, blackboard_data)
        else:
            push_warning("Condition callback is not callable: " + condition_name)
            return false

    func cleanup_agent(agent_id: String):
        action_callbacks.erase(agent_id)
        condition_callbacks.erase(agent_id)

class GodotDebug extends RefCounted:
    """Debug logging bridge for JavaScript console output"""

    func log(message: String):
        print("[JS] " + message)

    func warn(message: String):
        print_rich("[color=yellow][JS WARNING][/color] " + message)

    func error(message: String):
        print_rich("[color=red][JS ERROR][/color] " + message)

class GodotTime extends RefCounted:
    """Time utilities bridge for JavaScript"""

    func get_time() -> float:
        return Time.get_time_float()

    func get_delta() -> float:
        # Note: This would need to be passed from the calling context
        return get_process_delta_time()

    func get_unix_time() -> float:
        return Time.get_unix_time_from_system()

    func get_ticks() -> int:
        return Time.get_ticks_msec()

# Utility functions

func set_debug_logging(enabled: bool):
    enable_debug_logging = enabled
    if is_initialized:
        execute_script("window.debugLogging = " + str(enabled).to_lower() + ";")

func get_steam_ai_version() -> String:
    if not is_initialized:
        return "Unknown"

    var result = execute_script("window.SteamAI ? window.SteamAI.VERSION || '1.0.0' : 'Unknown'")
    return str(result) if result else "Unknown"

func test_javascript_execution() -> bool:
    """Test if JavaScript execution is working properly"""
    var result = execute_script("1 + 1")
    return result == 2

func cleanup():
    """Clean up the bridge and JavaScript environment"""
    if js_bridge:
        # Clear global objects
        execute_script("""
            delete window.agents;
            delete window.behaviorTrees;
            delete window.stateMachines;
            delete window.agentManager;
            delete window.behaviorTreeEngine;
            delete window.stateMachineEngine;
        """)

        js_bridge = null

    is_initialized = false

    if enable_debug_logging:
        print("AI Bridge cleaned up")