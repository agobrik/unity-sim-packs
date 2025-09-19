# Godot Integration Guide - Steam AI Package

This guide shows how to integrate the Steam AI package with Godot using JavaScript/V8 integration.

## Prerequisites

- Godot 4.0 or newer (recommended)
- Node.js and npm for building the Steam AI package
- Basic knowledge of GDScript and Godot's scene system

## Installation

### 1. Enable JavaScript Support

Godot 4.x has built-in V8 JavaScript engine support. To enable it:

1. Open your project settings
2. Go to "Application" → "Run"
3. Enable "Enable JavaScript" if available, or use the JavaScriptBridge singleton

### 2. Steam AI Package Setup

1. Build the Steam AI package:
```bash
cd path/to/@steam-sim/ai
npm run build
```

2. Copy the built JavaScript file to your Godot project:
```
res://
├── scripts/
│   ├── ai/
│   │   ├── bridge.gd
│   │   ├── ai_agent.gd
│   │   └── ai_manager.gd
├── javascript/
│   └── steam-ai.js
```

## Usage Examples

### Basic AI Agent Scene Setup

1. Create a new scene with a CharacterBody3D node
2. Add the following child nodes:
   - MeshInstance3D (with a capsule mesh)
   - CollisionShape3D (with a capsule shape)
   - Area3D (for detection)
   - NavigationAgent3D (for pathfinding)

3. Attach the `ai_agent.gd` script to the CharacterBody3D

### AI Agent Configuration

```gdscript
# ai_agent.gd
extends CharacterBody3D
class_name AIAgent

@export var agent_id: String = ""
@export var agent_type: String = "basic"
@export var update_interval: float = 0.1
@export var detection_radius: float = 10.0
@export var movement_speed: float = 5.0
@export var enable_debug_draw: bool = true

@export_group("Patrol Settings")
@export var patrol_points: Array[Vector3] = []
@export var patrol_mode: bool = true

# Components
@onready var navigation_agent: NavigationAgent3D = $NavigationAgent3D
@onready var detection_area: Area3D = $DetectionArea
@onready var detection_collision: CollisionShape3D = $DetectionArea/CollisionShape3D

# AI Bridge
var ai_bridge: AIBridge
var memory: Dictionary = {}
var custom_actions: Dictionary = {}
var custom_conditions: Dictionary = {}
var current_behavior_tree_id: String = ""
var last_update_time: float = 0.0
var is_initialized: bool = false

# Signals
signal tree_executed(tree_id: String, status: String)
signal node_executed(node_id: String, status: String)
signal state_changed(new_state: String)

func _ready():
    if agent_id.is_empty():
        agent_id = "agent_" + str(get_instance_id())

    # Setup navigation
    navigation_agent.velocity_computed.connect(_on_velocity_computed)
    navigation_agent.target_desired_distance = 1.0
    navigation_agent.radius = 0.5

    # Setup detection area
    setup_detection_area()

    # Initialize AI
    ai_bridge = AIBridge.new()
    ai_bridge.initialize()
    ai_bridge.ready_signal.connect(_on_ai_bridge_ready)

func _on_ai_bridge_ready():
    initialize_agent()

func setup_detection_area():
    # Configure detection area
    var sphere_shape = SphereShape3D.new()
    sphere_shape.radius = detection_radius
    detection_collision.shape = sphere_shape

    # Connect signals
    detection_area.body_entered.connect(_on_body_entered_detection)
    detection_area.body_exited.connect(_on_body_exited_detection)

func _physics_process(delta):
    if not is_initialized:
        return

    if Time.get_time_float() - last_update_time >= update_interval:
        update_ai()
        last_update_time = Time.get_time_float()

    # Handle movement
    if not navigation_agent.is_navigation_finished():
        var next_path_position = navigation_agent.get_next_path_position()
        var direction = (next_path_position - global_position).normalized()
        velocity = direction * movement_speed
        move_and_slide()

func initialize_agent():
    try:
        create_agent()
        setup_default_memory()
        register_default_actions()
        register_default_conditions()
        create_default_behavior_tree()

        is_initialized = true
        print("AI Agent ", agent_id, " initialized successfully")
    except Exception as e:
        print("Failed to setup AI agent: ", e.message)

func create_agent():
    var agent_config = {
        "id": agent_id,
        "position": {"x": global_position.x, "y": global_position.y, "z": global_position.z},
        "agentType": agent_type,
        "properties": {
            "detectionRadius": detection_radius,
            "movementSpeed": movement_speed,
            "maxHealth": 100.0
        }
    }

    ai_bridge.execute_script("""
        if (typeof window.agentManager === 'undefined') {
            const { AgentManager } = require('@steam-sim/ai');
            window.agentManager = new AgentManager();
        }

        const agent = window.agentManager.createAgent('%s', %s);
        window.agents = window.agents || {};
        window.agents['%s'] = agent;
    """ % [agent_id, JSON.stringify(agent_config), agent_id])

func setup_default_memory():
    set_memory("health", 100.0)
    set_memory("energy", 100.0)
    set_memory("detectionRadius", detection_radius)
    set_memory("movementSpeed", movement_speed)

    if patrol_points.size() > 0:
        var points = []
        for point in patrol_points:
            points.append({"x": point.x, "y": point.y, "z": point.z})
        set_memory("patrolPoints", points)
        set_memory("currentPatrolIndex", 0)

func register_default_actions():
    register_action("moveToTarget", move_to_target)
    register_action("patrol", patrol_action)
    register_action("lookForTarget", look_for_target)
    register_action("attack", attack_action)
    register_action("flee", flee_action)
    register_action("idle", idle_action)

func register_default_conditions():
    register_condition("checkHealth", check_health)
    register_condition("detectEnemy", detect_enemy)
    register_condition("inAttackRange", in_attack_range)
    register_condition("hasTarget", has_target)
    register_condition("atPatrolPoint", at_patrol_point)

func create_default_behavior_tree():
    var tree_config = {
        "id": "default_root",
        "type": "COMPOSITE",
        "parameters": {"compositeType": "selector"},
        "children": [
            {
                "id": "combat_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "detect_enemy",
                        "type": "CONDITION",
                        "condition": "detectEnemy"
                    },
                    {
                        "id": "attack_enemy",
                        "type": "ACTION",
                        "action": "attack"
                    }
                ]
            },
            {
                "id": "patrol_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "patrol_action",
                        "type": "ACTION",
                        "action": "patrol"
                    }
                ]
            },
            {
                "id": "idle_action",
                "type": "ACTION",
                "action": "idle"
            }
        ]
    }

    create_behavior_tree("default_behavior", tree_config)

func update_ai():
    try:
        update_agent_position()
        execute_behavior_tree()
    except Exception as e:
        print("Error updating AI for agent ", agent_id, ": ", e.message)

func update_agent_position():
    ai_bridge.execute_script("""
        if (window.agents && window.agents['%s']) {
            window.agents['%s'].position = {
                x: %f,
                y: %f,
                z: %f
            };
        }
    """ % [agent_id, agent_id, global_position.x, global_position.y, global_position.z])

func execute_behavior_tree():
    if current_behavior_tree_id.is_empty():
        return

    try:
        var result = ai_bridge.execute_function(
            "window.behaviorTreeEngine.executeTree",
            [current_behavior_tree_id, "window.agents['%s']" % agent_id]
        )

        tree_executed.emit(current_behavior_tree_id, str(result))
    except Exception as e:
        print("Error executing behavior tree: ", e.message)

func create_behavior_tree(tree_id: String, tree_config: Dictionary):
    try:
        ai_bridge.execute_script("""
            if (typeof window.behaviorTreeEngine === 'undefined') {
                const { BehaviorTreeEngine } = require('@steam-sim/ai');
                window.behaviorTreeEngine = new BehaviorTreeEngine();

                window.godotActions = {};
                window.godotConditions = {};
            }

            const treeConfig = %s;
            window.behaviorTreeEngine.createTree('%s', treeConfig);
        """ % [JSON.stringify(tree_config), tree_id])

        current_behavior_tree_id = tree_id
        print("Behavior tree '", tree_id, "' created for agent ", agent_id)
    except Exception as e:
        print("Failed to create behavior tree: ", e.message)

func register_action(action_name: String, action_callable: Callable):
    custom_actions[action_name] = action_callable

    ai_bridge.execute_script("""
        window.godotActions['%s'] = function(agent, blackboard) {
            return window.GodotCallAction('%s', '%s', agent, blackboard);
        };
    """ % [action_name, agent_id, action_name])

func register_condition(condition_name: String, condition_callable: Callable):
    custom_conditions[condition_name] = condition_callable

    ai_bridge.execute_script("""
        window.godotConditions['%s'] = function(agent, blackboard) {
            return window.GodotCallCondition('%s', '%s', agent, blackboard);
        };
    """ % [condition_name, agent_id, condition_name])

func set_memory(key: String, value):
    memory[key] = value

    ai_bridge.execute_script("""
        if (window.agents && window.agents['%s']) {
            window.agentManager.updateAgentMemory('%s', '%s', %s);
        }
    """ % [agent_id, agent_id, key, JSON.stringify(value)])

func get_memory(key: String, default_value = null):
    return memory.get(key, default_value)

# Action Implementations

func move_to_target(agent, blackboard) -> bool:
    var target = blackboard.get("data", {}).get("target")
    if not target:
        return false

    var target_pos = Vector3(target.x, target.y, target.z)
    navigation_agent.target_position = target_pos

    var distance = global_position.distance_to(target_pos)
    return distance < 1.0

func patrol_action(agent, blackboard) -> bool:
    if patrol_points.is_empty():
        return true

    var current_index = get_memory("currentPatrolIndex", 0)
    if current_index >= patrol_points.size():
        current_index = 0

    var target_point = patrol_points[current_index]
    navigation_agent.target_position = target_point

    var distance = global_position.distance_to(target_point)
    if distance < 1.0:
        var next_index = (current_index + 1) % patrol_points.size()
        set_memory("currentPatrolIndex", next_index)
        return true

    return false

func look_for_target(agent, blackboard) -> bool:
    var enemies = get_tree().get_nodes_in_group("enemies")

    for enemy in enemies:
        if enemy is Node3D:
            var distance = global_position.distance_to(enemy.global_position)
            if distance <= detection_radius:
                set_memory("target", {
                    "x": enemy.global_position.x,
                    "y": enemy.global_position.y,
                    "z": enemy.global_position.z
                })
                return true

    return false

func attack_action(agent, blackboard) -> bool:
    var target = blackboard.get("data", {}).get("target")
    if not target:
        return false

    print(agent_id, " attacking target!")

    # Reset target after attack
    set_memory("target", null)
    return true

func flee_action(agent, blackboard) -> bool:
    var threat = blackboard.get("data", {}).get("threat")
    if not threat:
        return true

    var threat_pos = Vector3(threat.x, threat.y, threat.z)
    var flee_direction = (global_position - threat_pos).normalized()
    var flee_target = global_position + flee_direction * 10.0

    navigation_agent.target_position = flee_target
    return false  # Keep fleeing

func idle_action(agent, blackboard) -> bool:
    # Simple idle behavior
    return true

# Condition Implementations

func check_health(agent, blackboard) -> bool:
    var threshold = blackboard.get("parameters", {}).get("threshold", 50.0)
    var health = get_memory("health", 100.0)
    return health > threshold

func detect_enemy(agent, blackboard) -> bool:
    var enemies = get_tree().get_nodes_in_group("enemies")

    for enemy in enemies:
        if enemy is Node3D:
            var distance = global_position.distance_to(enemy.global_position)
            if distance <= detection_radius:
                set_memory("target", {
                    "x": enemy.global_position.x,
                    "y": enemy.global_position.y,
                    "z": enemy.global_position.z
                })
                return true

    return false

func in_attack_range(agent, blackboard) -> bool:
    var target = blackboard.get("data", {}).get("target")
    if not target:
        return false

    var target_pos = Vector3(target.x, target.y, target.z)
    var distance = global_position.distance_to(target_pos)
    return distance <= 2.0  # Attack range

func has_target(agent, blackboard) -> bool:
    var target = blackboard.get("data", {}).get("target")
    return target != null

func at_patrol_point(agent, blackboard) -> bool:
    if patrol_points.is_empty():
        return true

    var current_index = get_memory("currentPatrolIndex", 0)
    if current_index >= patrol_points.size():
        return false

    var target_point = patrol_points[current_index]
    var distance = global_position.distance_to(target_point)
    return distance < 1.0

# Event Handlers

func _on_body_entered_detection(body):
    if body.is_in_group("enemies"):
        print("Enemy detected: ", body.name)
        # You could trigger investigation behavior here

func _on_body_exited_detection(body):
    if body.is_in_group("enemies"):
        print("Enemy lost: ", body.name)

func _on_velocity_computed(safe_velocity: Vector3):
    velocity = safe_velocity

# Debug Drawing

func _draw_debug():
    if not enable_debug_draw:
        return

    # Draw detection radius
    DebugDraw3D.draw_sphere(global_position, detection_radius, Color.YELLOW)

    # Draw patrol points
    for i in range(patrol_points.size()):
        DebugDraw3D.draw_sphere(patrol_points[i], 0.5, Color.BLUE)

        # Draw lines between patrol points
        if i < patrol_points.size() - 1:
            DebugDraw3D.draw_line(patrol_points[i], patrol_points[i + 1], Color.BLUE)
        elif patrol_points.size() > 1:
            DebugDraw3D.draw_line(patrol_points[i], patrol_points[0], Color.BLUE)

    # Draw current target
    var target = memory.get("target")
    if target:
        var target_pos = Vector3(target.x, target.y, target.z)
        DebugDraw3D.draw_line(global_position, target_pos, Color.RED)
        DebugDraw3D.draw_sphere(target_pos, 1.0, Color.RED)

# Cleanup

func _exit_tree():
    if ai_bridge and is_initialized:
        try:
            ai_bridge.execute_script("""
                if (window.agentManager && window.agents && window.agents['%s']) {
                    window.agentManager.removeAgent('%s');
                    delete window.agents['%s'];
                }
            """ % [agent_id, agent_id, agent_id])
        except Exception as e:
            print("Error cleaning up agent: ", e.message)
```

### Advanced Behavior Tree Example

Create more complex behavior trees for different AI types:

```gdscript
# Create a more sophisticated guard AI
func create_guard_behavior_tree():
    var tree_config = {
        "id": "guard_root",
        "type": "COMPOSITE",
        "parameters": {"compositeType": "selector"},
        "children": [
            {
                "id": "emergency_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "low_health_check",
                        "type": "CONDITION",
                        "condition": "checkHealth",
                        "parameters": {"threshold": 25.0}
                    },
                    {
                        "id": "flee_action",
                        "type": "ACTION",
                        "action": "flee"
                    }
                ]
            },
            {
                "id": "combat_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "detect_enemy",
                        "type": "CONDITION",
                        "condition": "detectEnemy"
                    },
                    {
                        "id": "combat_selector",
                        "type": "COMPOSITE",
                        "parameters": {"compositeType": "selector"},
                        "children": [
                            {
                                "id": "attack_sequence",
                                "type": "COMPOSITE",
                                "parameters": {"compositeType": "sequence"},
                                "children": [
                                    {
                                        "id": "in_range_check",
                                        "type": "CONDITION",
                                        "condition": "inAttackRange"
                                    },
                                    {
                                        "id": "attack",
                                        "type": "ACTION",
                                        "action": "attack"
                                    }
                                ]
                            },
                            {
                                "id": "chase_target",
                                "type": "ACTION",
                                "action": "moveToTarget"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "investigation_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "suspicion_check",
                        "type": "CONDITION",
                        "condition": "checkSuspicion"
                    },
                    {
                        "id": "investigate",
                        "type": "ACTION",
                        "action": "investigate"
                    }
                ]
            },
            {
                "id": "patrol_fallback",
                "type": "ACTION",
                "action": "patrol"
            }
        ]
    }

    create_behavior_tree("guard_behavior", tree_config)
```

## Performance Tips

### 1. Update Scheduling

Use Godot's groups and signals to coordinate AI updates:

```gdscript
# In your main scene or AI manager
func _ready():
    get_tree().create_timer(0.1).timeout.connect(_update_ai_batch)

func _update_ai_batch():
    var ai_agents = get_tree().get_nodes_in_group("ai_agents")
    var batch_size = 5

    for i in range(min(batch_size, ai_agents.size())):
        var agent = ai_agents[ai_update_index]
        if agent and agent.has_method("force_update_ai"):
            agent.force_update_ai()

        ai_update_index = (ai_update_index + 1) % ai_agents.size()

    get_tree().create_timer(0.1).timeout.connect(_update_ai_batch)
```

### 2. Memory Management

Implement periodic cleanup:

```gdscript
func _ready():
    get_tree().create_timer(30.0).timeout.connect(_cleanup_memory)

func _cleanup_memory():
    if ai_bridge:
        ai_bridge.force_garbage_collection()
    get_tree().create_timer(30.0).timeout.connect(_cleanup_memory)
```

## Debugging

### Visual Debug Tools

Godot provides excellent debugging tools. Use them to visualize AI behavior:

```gdscript
func _ready():
    # Enable debug drawing
    get_viewport().debug_draw = Viewport.DEBUG_DRAW_DISABLED  # Or other debug modes

    # Connect to debug signals
    tree_executed.connect(_on_tree_executed_debug)
    node_executed.connect(_on_node_executed_debug)

func _on_tree_executed_debug(tree_id: String, status: String):
    if enable_debug_draw:
        print("Tree executed: %s -> %s" % [tree_id, status])

func _on_node_executed_debug(node_id: String, status: String):
    if enable_debug_draw:
        print("Node executed: %s -> %s" % [node_id, status])
```

### Inspector Tools

Use Godot's inspector to monitor AI state:

```gdscript
# Add debug information to the inspector
@export_group("Debug Info")
@export var current_tree_status: String = ""
@export var current_target: Vector3
@export var current_health: float = 100.0
@export var current_state: String = "idle"

func _process(delta):
    if Engine.is_editor_hint() or enable_debug_draw:
        update_debug_info()

func update_debug_info():
    current_health = get_memory("health", 100.0)
    var target = get_memory("target")
    if target:
        current_target = Vector3(target.x, target.y, target.z)
    else:
        current_target = Vector3.ZERO
```

## Troubleshooting

### Common Issues

1. **JavaScript execution errors**: Check console output and ensure Steam AI package is properly built
2. **Navigation issues**: Verify NavigationAgent3D is properly configured and navigation mesh exists
3. **Performance problems**: Implement update batching and reduce AI update frequency
4. **Memory leaks**: Regular cleanup and proper signal disconnection

### Error Handling

```gdscript
func safe_execute_ai():
    try:
        execute_behavior_tree()
    except Exception as e:
        print("AI execution error: ", e.message)
        # Fallback to simple behavior
        execute_fallback_behavior()

func execute_fallback_behavior():
    # Simple movement towards patrol points or idle
    if patrol_points.size() > 0:
        var target = patrol_points[0]
        navigation_agent.target_position = target
```

For complete working examples, see the `example.gd` and `bridge.gd` files in this directory.