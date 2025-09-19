# Complete AI Agent Example for Godot with Steam AI Package
# This script demonstrates a full implementation of an AI agent using behavior trees

extends CharacterBody3D
class_name AIAgentExample

@export_group("Agent Configuration")
@export var agent_id: String = ""
@export var agent_type: String = "guard"
@export var update_interval: float = 0.2
@export var movement_speed: float = 3.0
@export var detection_radius: float = 8.0

@export_group("Behavior Settings")
@export var patrol_points: Array[Vector3] = []
@export var enable_combat: bool = true
@export var enable_investigation: bool = true
@export var health: float = 100.0
@export var attack_damage: float = 25.0

@export_group("Debug Options")
@export var enable_debug_draw: bool = true
@export var enable_debug_logging: bool = false
@export var show_state_in_ui: bool = true

# Node references
@onready var navigation_agent: NavigationAgent3D = $NavigationAgent3D
@onready var detection_area: Area3D = $DetectionArea
@onready var detection_collision: CollisionShape3D = $DetectionArea/CollisionShape3D
@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var animation_player: AnimationPlayer = $AnimationPlayer
@onready var state_label: Label3D = $StateLabel3D

# AI System
var ai_bridge: AIBridge
var memory: Dictionary = {}
var behavior_trees: Dictionary = {}
var current_behavior_tree: String = "default"
var current_state: String = "initializing"
var last_update_time: float = 0.0
var is_initialized: bool = false

# Game state
var detected_enemies: Array = []
var current_target: Node3D = null
var investigation_point: Vector3 = Vector3.ZERO
var is_investigating: bool = false
var suspicion_level: float = 0.0
var last_known_enemy_position: Vector3 = Vector3.ZERO

# Signals
signal enemy_detected(enemy: Node3D)
signal enemy_lost(enemy: Node3D)
signal health_changed(new_health: float)
signal state_changed(new_state: String)
signal target_reached(target: Vector3)

func _ready():
    setup_agent()
    setup_navigation()
    setup_detection()
    initialize_ai()

func setup_agent():
    """Initialize basic agent properties"""
    if agent_id.is_empty():
        agent_id = "agent_" + str(get_instance_id())

    # Add to AI agents group
    add_to_group("ai_agents")

    # Set up visual feedback
    if mesh_instance and mesh_instance.get_surface_override_material_count() == 0:
        var material = StandardMaterial3D.new()
        material.albedo_color = Color.BLUE
        mesh_instance.set_surface_override_material(0, material)

    # Initialize state label
    if state_label:
        state_label.text = current_state
        state_label.visible = show_state_in_ui

func setup_navigation():
    """Configure navigation agent"""
    navigation_agent.target_desired_distance = 1.0
    navigation_agent.radius = 0.5
    navigation_agent.height = 1.8
    navigation_agent.max_speed = movement_speed
    navigation_agent.path_postprocessing = NavigationPathQueryParameters3D.PATH_POSTPROCESSING_EDGECENTERED

    # Connect navigation signals
    navigation_agent.velocity_computed.connect(_on_velocity_computed)
    navigation_agent.target_reached.connect(_on_target_reached)
    navigation_agent.navigation_finished.connect(_on_navigation_finished)

func setup_detection():
    """Configure detection area"""
    var sphere_shape = SphereShape3D.new()
    sphere_shape.radius = detection_radius
    detection_collision.shape = sphere_shape

    # Connect detection signals
    detection_area.body_entered.connect(_on_body_entered_detection)
    detection_area.body_exited.connect(_on_body_exited_detection)

func initialize_ai():
    """Initialize the AI system"""
    ai_bridge = AIBridge.new()
    ai_bridge.set_debug_logging(enable_debug_logging)
    ai_bridge.ready_signal.connect(_on_ai_bridge_ready)
    ai_bridge.error_signal.connect(_on_ai_bridge_error)
    ai_bridge.initialize()

func _on_ai_bridge_ready():
    """Called when AI bridge is ready"""
    try:
        create_agent_in_js()
        setup_memory()
        create_behavior_trees()
        register_actions_and_conditions()

        is_initialized = true
        change_state("idle")

        if enable_debug_logging:
            print("AI Agent ", agent_id, " initialized successfully")

    except Exception as e:
        print("Failed to initialize AI agent: ", e.message)

func _on_ai_bridge_error(message: String):
    """Handle AI bridge errors"""
    print("AI Bridge Error: ", message)

func _physics_process(delta):
    if not is_initialized:
        return

    # Update AI at specified intervals
    if Time.get_time_float() - last_update_time >= update_interval:
        update_ai()
        last_update_time = Time.get_time_float()

    # Handle movement
    handle_movement()

    # Update visual state
    update_visual_state()

func update_ai():
    """Main AI update loop"""
    try:
        update_agent_position()
        update_memory_from_environment()
        execute_current_behavior_tree()
        update_suspicion()

    except Exception as e:
        print("Error updating AI for agent ", agent_id, ": ", e.message)

func create_agent_in_js():
    """Create the agent in JavaScript environment"""
    var agent_config = {
        "id": agent_id,
        "position": {"x": global_position.x, "y": global_position.y, "z": global_position.z},
        "agentType": agent_type,
        "properties": {
            "health": health,
            "detectionRadius": detection_radius,
            "movementSpeed": movement_speed,
            "attackDamage": attack_damage
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

func setup_memory():
    """Initialize agent memory"""
    set_memory("health", health)
    set_memory("maxHealth", health)
    set_memory("energy", 100.0)
    set_memory("suspicion", 0.0)
    set_memory("detectionRadius", detection_radius)
    set_memory("movementSpeed", movement_speed)
    set_memory("state", current_state)

    if patrol_points.size() > 0:
        var points = []
        for point in patrol_points:
            points.append({"x": point.x, "y": point.y, "z": point.z})
        set_memory("patrolPoints", points)
        set_memory("currentPatrolIndex", 0)

func create_behavior_trees():
    """Create different behavior trees for different situations"""

    # Default behavior tree
    create_default_behavior_tree()

    # Combat behavior tree
    if enable_combat:
        create_combat_behavior_tree()

    # Investigation behavior tree
    if enable_investigation:
        create_investigation_behavior_tree()

func create_default_behavior_tree():
    """Create the default behavior tree"""
    var tree_config = {
        "id": "default_root",
        "type": "COMPOSITE",
        "parameters": {"compositeType": "selector"},
        "children": [
            {
                "id": "health_emergency",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "critical_health_check",
                        "type": "CONDITION",
                        "condition": "checkHealth",
                        "parameters": {"threshold": 20.0}
                    },
                    {
                        "id": "seek_help",
                        "type": "ACTION",
                        "action": "seekHelp"
                    }
                ]
            },
            {
                "id": "combat_check",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "enemy_detected",
                        "type": "CONDITION",
                        "condition": "hasEnemy"
                    },
                    {
                        "id": "switch_to_combat",
                        "type": "ACTION",
                        "action": "switchToCombat"
                    }
                ]
            },
            {
                "id": "investigation_check",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "suspicious_activity",
                        "type": "CONDITION",
                        "condition": "checkSuspicion",
                        "parameters": {"threshold": 30.0}
                    },
                    {
                        "id": "switch_to_investigation",
                        "type": "ACTION",
                        "action": "switchToInvestigation"
                    }
                ]
            },
            {
                "id": "patrol_behavior",
                "type": "ACTION",
                "action": "patrol"
            }
        ]
    }

    create_behavior_tree("default", tree_config)

func create_combat_behavior_tree():
    """Create combat-focused behavior tree"""
    var tree_config = {
        "id": "combat_root",
        "type": "COMPOSITE",
        "parameters": {"compositeType": "selector"},
        "children": [
            {
                "id": "flee_check",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "low_health",
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
                "id": "attack_sequence",
                "type": "COMPOSITE",
                "parameters": {"compositeType": "sequence"},
                "children": [
                    {
                        "id": "has_target",
                        "type": "CONDITION",
                        "condition": "hasTarget"
                    },
                    {
                        "id": "attack_selector",
                        "type": "COMPOSITE",
                        "parameters": {"compositeType": "selector"},
                        "children": [
                            {
                                "id": "melee_attack",
                                "type": "COMPOSITE",
                                "parameters": {"compositeType": "sequence"},
                                "children": [
                                    {
                                        "id": "in_range",
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
                                "action": "chaseTarget"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "search_enemy",
                "type": "ACTION",
                "action": "searchForEnemies"
            }
        ]
    }

    create_behavior_tree("combat", tree_config)

func create_investigation_behavior_tree():
    """Create investigation behavior tree"""
    var tree_config = {
        "id": "investigation_root",
        "type": "COMPOSITE",
        "parameters": {"compositeType": "sequence"},
        "children": [
            {
                "id": "move_to_investigation_point",
                "type": "ACTION",
                "action": "moveToInvestigation"
            },
            {
                "id": "investigate_area",
                "type": "ACTION",
                "action": "investigateArea"
            },
            {
                "id": "return_to_patrol",
                "type": "ACTION",
                "action": "returnToPatrol"
            }
        ]
    }

    create_behavior_tree("investigation", tree_config)

func create_behavior_tree(tree_id: String, tree_config: Dictionary):
    """Create a behavior tree in the JavaScript environment"""
    try:
        ai_bridge.execute_script("""
            if (typeof window.behaviorTreeEngine === 'undefined') {
                const { BehaviorTreeEngine } = require('@steam-sim/ai');
                window.behaviorTreeEngine = new BehaviorTreeEngine();
            }

            const treeConfig = %s;
            window.behaviorTreeEngine.createTree('%s_%s', treeConfig);
        """ % [JSON.stringify(tree_config), agent_id, tree_id])

        behavior_trees[tree_id] = tree_config

        if enable_debug_logging:
            print("Created behavior tree: ", tree_id)

    except Exception as e:
        print("Failed to create behavior tree ", tree_id, ": ", e.message)

func register_actions_and_conditions():
    """Register all actions and conditions with the AI bridge"""

    # Get the bridge's Godot bridge instance
    var godot_bridge = ai_bridge.js_bridge.get_global_object("GodotBridge")

    # Create action dictionary
    var actions = {
        "patrol": patrol_action,
        "chaseTarget": chase_target_action,
        "attack": attack_action,
        "flee": flee_action,
        "seekHelp": seek_help_action,
        "searchForEnemies": search_for_enemies_action,
        "moveToInvestigation": move_to_investigation_action,
        "investigateArea": investigate_area_action,
        "returnToPatrol": return_to_patrol_action,
        "switchToCombat": switch_to_combat_action,
        "switchToInvestigation": switch_to_investigation_action
    }

    # Create condition dictionary
    var conditions = {
        "checkHealth": check_health_condition,
        "hasEnemy": has_enemy_condition,
        "hasTarget": has_target_condition,
        "inAttackRange": in_attack_range_condition,
        "checkSuspicion": check_suspicion_condition,
        "atPatrolPoint": at_patrol_point_condition,
        "investigationComplete": investigation_complete_condition
    }

    # Register with the bridge
    godot_bridge.register_agent_callbacks(agent_id, actions, conditions)

func execute_current_behavior_tree():
    """Execute the current behavior tree"""
    if current_behavior_tree.is_empty():
        return

    try:
        var tree_name = agent_id + "_" + current_behavior_tree
        var result = ai_bridge.execute_function(
            "window.behaviorTreeEngine.executeTree",
            [tree_name, "window.agents['" + agent_id + "']"]
        )

        if enable_debug_logging:
            print("Tree executed: ", current_behavior_tree, " -> ", result)

    except Exception as e:
        print("Error executing behavior tree: ", e.message)

# Action Implementations

func patrol_action(agent_data, blackboard_data) -> bool:
    """Patrol between patrol points"""
    if patrol_points.is_empty():
        change_state("idle")
        return true

    var current_index = get_memory("currentPatrolIndex", 0)
    if current_index >= patrol_points.size():
        current_index = 0
        set_memory("currentPatrolIndex", 0)

    var target_point = patrol_points[current_index]
    navigation_agent.target_position = target_point

    var distance = global_position.distance_to(target_point)
    if distance < 1.5:
        var next_index = (current_index + 1) % patrol_points.size()
        set_memory("currentPatrolIndex", next_index)
        change_state("patrolling")
        return true

    change_state("moving_to_patrol")
    return false

func chase_target_action(agent_data, blackboard_data) -> bool:
    """Chase the current target"""
    if not current_target or not is_instance_valid(current_target):
        return false

    navigation_agent.target_position = current_target.global_position
    change_state("chasing")

    var distance = global_position.distance_to(current_target.global_position)
    return distance < 2.0  # Close enough to attack

func attack_action(agent_data, blackboard_data) -> bool:
    """Attack the current target"""
    if not current_target or not is_instance_valid(current_target):
        return false

    change_state("attacking")

    # Play attack animation
    if animation_player and animation_player.has_animation("attack"):
        animation_player.play("attack")

    # Deal damage to target
    if current_target.has_method("take_damage"):
        current_target.take_damage(attack_damage)

    # Increase suspicion in area
    increase_area_suspicion(global_position, 5.0, 25.0)

    if enable_debug_logging:
        print(agent_id, " attacking ", current_target.name)

    return true

func flee_action(agent_data, blackboard_data) -> bool:
    """Flee from threats"""
    if detected_enemies.is_empty():
        return true

    # Calculate average enemy position
    var enemy_center = Vector3.ZERO
    for enemy in detected_enemies:
        if is_instance_valid(enemy):
            enemy_center += enemy.global_position

    enemy_center /= detected_enemies.size()

    # Flee in opposite direction
    var flee_direction = (global_position - enemy_center).normalized()
    var flee_target = global_position + flee_direction * 15.0

    navigation_agent.target_position = flee_target
    change_state("fleeing")

    return false  # Keep fleeing

func seek_help_action(agent_data, blackboard_data) -> bool:
    """Seek help from other agents or safe locations"""
    # Find nearest ally
    var allies = get_tree().get_nodes_in_group("ai_agents")
    var nearest_ally = null
    var nearest_distance = INF

    for ally in allies:
        if ally != self and is_instance_valid(ally):
            var distance = global_position.distance_to(ally.global_position)
            if distance < nearest_distance:
                nearest_distance = distance
                nearest_ally = ally

    if nearest_ally:
        navigation_agent.target_position = nearest_ally.global_position
        change_state("seeking_help")
        return nearest_distance < 3.0

    return false

func search_for_enemies_action(agent_data, blackboard_data) -> bool:
    """Search for enemies in the area"""
    change_state("searching")

    # Look around for enemies
    var enemies = get_tree().get_nodes_in_group("enemies")
    for enemy in enemies:
        if is_instance_valid(enemy):
            var distance = global_position.distance_to(enemy.global_position)
            if distance <= detection_radius:
                current_target = enemy
                detected_enemies.append(enemy)
                enemy_detected.emit(enemy)
                return true

    return false

func move_to_investigation_action(agent_data, blackboard_data) -> bool:
    """Move to investigation point"""
    if investigation_point == Vector3.ZERO:
        return false

    navigation_agent.target_position = investigation_point
    change_state("investigating")

    var distance = global_position.distance_to(investigation_point)
    return distance < 2.0

func investigate_area_action(agent_data, blackboard_data) -> bool:
    """Investigate the current area"""
    change_state("investigating")

    # Simple investigation - look around, reduce suspicion over time
    suspicion_level = max(0.0, suspicion_level - 10.0)
    set_memory("suspicion", suspicion_level)

    # Play investigation animation
    if animation_player and animation_player.has_animation("investigate"):
        animation_player.play("investigate")

    return suspicion_level <= 5.0

func return_to_patrol_action(agent_data, blackboard_data) -> bool:
    """Return to patrol behavior"""
    is_investigating = false
    investigation_point = Vector3.ZERO
    suspicion_level = 0.0
    set_memory("suspicion", 0.0)

    current_behavior_tree = "default"
    change_state("returning_to_patrol")
    return true

func switch_to_combat_action(agent_data, blackboard_data) -> bool:
    """Switch to combat behavior tree"""
    current_behavior_tree = "combat"
    change_state("combat_mode")
    return true

func switch_to_investigation_action(agent_data, blackboard_data) -> bool:
    """Switch to investigation behavior tree"""
    current_behavior_tree = "investigation"
    is_investigating = true
    if investigation_point == Vector3.ZERO:
        investigation_point = last_known_enemy_position
    change_state("investigation_mode")
    return true

# Condition Implementations

func check_health_condition(agent_data, blackboard_data) -> bool:
    """Check if health is above threshold"""
    var threshold = blackboard_data.get("parameters", {}).get("threshold", 50.0)
    return health > threshold

func has_enemy_condition(agent_data, blackboard_data) -> bool:
    """Check if there are detected enemies"""
    return not detected_enemies.is_empty()

func has_target_condition(agent_data, blackboard_data) -> bool:
    """Check if there is a current target"""
    return current_target != null and is_instance_valid(current_target)

func in_attack_range_condition(agent_data, blackboard_data) -> bool:
    """Check if target is in attack range"""
    if not current_target or not is_instance_valid(current_target):
        return false

    var distance = global_position.distance_to(current_target.global_position)
    return distance <= 2.5  # Attack range

func check_suspicion_condition(agent_data, blackboard_data) -> bool:
    """Check if suspicion level is above threshold"""
    var threshold = blackboard_data.get("parameters", {}).get("threshold", 30.0)
    return suspicion_level > threshold

func at_patrol_point_condition(agent_data, blackboard_data) -> bool:
    """Check if at current patrol point"""
    if patrol_points.is_empty():
        return true

    var current_index = get_memory("currentPatrolIndex", 0)
    if current_index >= patrol_points.size():
        return false

    var target_point = patrol_points[current_index]
    var distance = global_position.distance_to(target_point)
    return distance < 1.5

func investigation_complete_condition(agent_data, blackboard_data) -> bool:
    """Check if investigation is complete"""
    return suspicion_level <= 5.0

# Utility Functions

func set_memory(key: String, value):
    """Set memory value both locally and in JavaScript"""
    memory[key] = value

    if is_initialized:
        ai_bridge.execute_script("""
            if (window.agents && window.agents['%s']) {
                window.agentManager.updateAgentMemory('%s', '%s', %s);
            }
        """ % [agent_id, agent_id, key, JSON.stringify(value)])

func get_memory(key: String, default_value = null):
    """Get memory value"""
    return memory.get(key, default_value)

func update_agent_position():
    """Update agent position in JavaScript environment"""
    ai_bridge.execute_script("""
        if (window.agents && window.agents['%s']) {
            window.agents['%s'].position = {
                x: %f,
                y: %f,
                z: %f
            };
        }
    """ % [agent_id, agent_id, global_position.x, global_position.y, global_position.z])

func update_memory_from_environment():
    """Update memory based on current environment"""
    set_memory("position", {"x": global_position.x, "y": global_position.y, "z": global_position.z})
    set_memory("health", health)
    set_memory("suspicion", suspicion_level)
    set_memory("hasTarget", current_target != null)
    set_memory("enemyCount", detected_enemies.size())

func change_state(new_state: String):
    """Change the agent's current state"""
    if current_state != new_state:
        current_state = new_state
        set_memory("state", current_state)
        state_changed.emit(new_state)

        if state_label:
            state_label.text = new_state

        if enable_debug_logging:
            print(agent_id, " state changed to: ", new_state)

func update_suspicion():
    """Update suspicion level over time"""
    if not is_investigating:
        # Gradually decrease suspicion when not investigating
        suspicion_level = max(0.0, suspicion_level - 0.5)
    else:
        # Increase suspicion when actively investigating
        suspicion_level = min(100.0, suspicion_level + 1.0)

    set_memory("suspicion", suspicion_level)

func increase_area_suspicion(center: Vector3, radius: float, amount: float):
    """Increase suspicion for agents in an area"""
    var agents = get_tree().get_nodes_in_group("ai_agents")
    for agent in agents:
        if agent != self and is_instance_valid(agent):
            var distance = center.distance_to(agent.global_position)
            if distance <= radius:
                if agent.has_method("add_suspicion"):
                    agent.add_suspicion(amount * (1.0 - distance / radius))

func add_suspicion(amount: float):
    """Add suspicion to this agent"""
    suspicion_level = min(100.0, suspicion_level + amount)
    set_memory("suspicion", suspicion_level)

    if suspicion_level > 30.0 and not is_investigating:
        investigation_point = last_known_enemy_position
        if investigation_point == Vector3.ZERO:
            investigation_point = global_position + Vector3(randf_range(-5, 5), 0, randf_range(-5, 5))

func handle_movement():
    """Handle agent movement"""
    if not navigation_agent.is_navigation_finished():
        var next_path_position = navigation_agent.get_next_path_position()
        var direction = (next_path_position - global_position).normalized()

        # Apply movement speed based on current state
        var speed_multiplier = 1.0
        match current_state:
            "fleeing":
                speed_multiplier = 1.5
            "chasing":
                speed_multiplier = 1.3
            "investigating":
                speed_multiplier = 0.7

        velocity = direction * movement_speed * speed_multiplier
        move_and_slide()

        # Face movement direction
        if velocity.length() > 0.1:
            look_at(global_position + velocity.normalized(), Vector3.UP)

func update_visual_state():
    """Update visual representation based on current state"""
    if not mesh_instance:
        return

    var material = mesh_instance.get_surface_override_material(0)
    if not material:
        material = StandardMaterial3D.new()
        mesh_instance.set_surface_override_material(0, material)

    # Change color based on state
    match current_state:
        "combat_mode", "attacking", "chasing":
            material.albedo_color = Color.RED
        "fleeing", "seeking_help":
            material.albedo_color = Color.YELLOW
        "investigating", "investigation_mode":
            material.albedo_color = Color.ORANGE
        "idle", "patrolling":
            material.albedo_color = Color.BLUE
        _:
            material.albedo_color = Color.GREEN

# Signal Handlers

func _on_body_entered_detection(body):
    """Handle body entering detection area"""
    if body.is_in_group("enemies") and body not in detected_enemies:
        detected_enemies.append(body)
        current_target = body
        last_known_enemy_position = body.global_position
        enemy_detected.emit(body)

        if enable_debug_logging:
            print(agent_id, " detected enemy: ", body.name)

func _on_body_exited_detection(body):
    """Handle body exiting detection area"""
    if body in detected_enemies:
        detected_enemies.erase(body)
        enemy_lost.emit(body)

        if current_target == body:
            current_target = null

        if enable_debug_logging:
            print(agent_id, " lost enemy: ", body.name)

func _on_velocity_computed(safe_velocity: Vector3):
    """Handle computed safe velocity from navigation"""
    velocity = safe_velocity

func _on_target_reached():
    """Handle reaching navigation target"""
    target_reached.emit(navigation_agent.target_position)

func _on_navigation_finished():
    """Handle navigation completion"""
    if current_state == "moving_to_patrol":
        change_state("patrolling")

# Public API

func take_damage(damage: float):
    """Take damage and update health"""
    health = max(0.0, health - damage)
    set_memory("health", health)
    health_changed.emit(health)

    # Increase suspicion when taking damage
    add_suspicion(50.0)

    if health <= 0.0:
        die()

func heal(amount: float):
    """Heal the agent"""
    var max_health = get_memory("maxHealth", 100.0)
    health = min(max_health, health + amount)
    set_memory("health", health)
    health_changed.emit(health)

func die():
    """Handle agent death"""
    change_state("dead")
    set_physics_process(false)

    if animation_player and animation_player.has_animation("death"):
        animation_player.play("death")

    # Notify other agents
    increase_area_suspicion(global_position, 10.0, 75.0)

func set_patrol_points(points: Array[Vector3]):
    """Set new patrol points"""
    patrol_points = points
    setup_memory()

func force_behavior_tree(tree_name: String):
    """Force switch to a specific behavior tree"""
    if tree_name in behavior_trees:
        current_behavior_tree = tree_name

# Debug and Visualization

func _draw():
    """Draw debug information"""
    if not enable_debug_draw:
        return

    # This would be handled by Godot's debug drawing system
    # or custom debug overlay

func get_debug_info() -> Dictionary:
    """Get debug information about the agent"""
    return {
        "agent_id": agent_id,
        "state": current_state,
        "behavior_tree": current_behavior_tree,
        "health": health,
        "suspicion": suspicion_level,
        "has_target": current_target != null,
        "enemies_detected": detected_enemies.size(),
        "position": global_position,
        "is_investigating": is_investigating
    }

# Cleanup

func _exit_tree():
    """Clean up when agent is removed"""
    if ai_bridge and is_initialized:
        try:
            # Clean up JavaScript objects
            ai_bridge.execute_script("""
                if (window.agentManager && window.agents && window.agents['%s']) {
                    window.agentManager.removeAgent('%s');
                    delete window.agents['%s'];
                }
            """ % [agent_id, agent_id, agent_id])

            # Clean up bridge callbacks
            var godot_bridge = ai_bridge.js_bridge.get_global_object("GodotBridge")
            if godot_bridge:
                godot_bridge.cleanup_agent(agent_id)

        except Exception as e:
            print("Error cleaning up agent: ", e.message)

    if enable_debug_logging:
        print("Agent ", agent_id, " cleaned up")