# Physics System Package

A comprehensive Unity C# physics simulation monitoring system for the Unity Simulation Framework.

## Overview

The Physics System provides real-time physics monitoring and simulation management with rigid body tracking, collision detection, constraint monitoring, and physics performance optimization. Ideal for physics-based games, simulations, and educational applications.

## Features

- **Rigid Body Tracking**: Monitor all Rigidbody components in the scene
- **Collision Detection**: Track collision events and frequency
- **Constraint Monitoring**: Monitor physics constraints and joints
- **Gravity Control**: Configurable gravity settings
- **Physics Iterations**: Track and configure physics solver iterations
- **Time Step Management**: Control physics simulation time steps
- **Performance Monitoring**: Physics system performance tracking
- **Event System**: Subscribe to physics changes and data exports
- **JSON Export**: Complete physics data serialization
- **Unity Inspector Integration**: Easy configuration through Unity Editor

## Installation

1. Copy the `packages/physics` folder to your Unity project
2. Ensure Newtonsoft.Json is installed in your project
3. Add the PhysicsSystem component to a GameObject in your scene

## Quick Start

```csharp
using UnitySim.Physics;

public class PhysicsExample : MonoBehaviour
{
    public PhysicsSystem physicsSystem;

    void Start()
    {
        // Subscribe to physics changes
        physicsSystem.OnPhysicsChanged += OnPhysicsUpdate;

        // Configure update interval
        physicsSystem.SetUpdateInterval(0.5f);
    }

    void OnPhysicsUpdate(PhysicsData data)
    {
        Debug.Log($"Rigid Bodies: {data.physics.rigidBodies}");
        Debug.Log($"Collisions: {data.physics.collisions}");
        Debug.Log($"Constraints: {data.physics.constraints}");
    }
}
```

## API Reference

### PhysicsSystem Class

**Public Properties:**
- `float updateInterval`: Update frequency in seconds (default: 1.0f)
- `bool enableLogging`: Enable debug logging (default: false)
- `bool enableEvents`: Enable event broadcasting (default: true)
- `bool enableOptimization`: Enable performance optimizations (default: true)

**Public Methods:**
- `string ExportState()`: Export current physics data as JSON
- `PhysicsData GetData()`: Get current physics data object
- `void SetUpdateInterval(float interval)`: Set update frequency
- `void ResetData()`: Reset physics system to default state

**Events:**
- `System.Action<PhysicsData> OnPhysicsChanged`: Triggered when physics updates
- `System.Action<string> OnDataExported`: Triggered when data is exported

### PhysicsData Class

```csharp
public class PhysicsData
{
    public long timestamp;        // Unix timestamp
    public long currentTime;      // Current system time
    public PhysicsInfo physics;   // Physics information object
}
```

### PhysicsInfo Class

```csharp
public class PhysicsInfo
{
    public float gravity;              // Gravity force (default: -9.81)
    public int rigidBodies;            // Number of rigid bodies (default: 0)
    public int constraints;            // Number of constraints (default: 0)
    public int collisions;             // Collision count (default: 0)
    public float timeStep;             // Physics time step (default: 0.02)
    public int physicsIterations;      // Solver iterations (default: 6)
    public string systemHealth;       // System status (default: "operational")
    public string framework;          // Framework identifier
}
```

## Configuration

The Physics System can be configured through the Unity Inspector:

### Physics Settings
- **Update Interval**: How often the physics system updates (seconds)
- **Enable Logging**: Show debug messages in console
- **Enable Events**: Broadcast physics change events

### Performance Settings
- **Enable Optimization**: Use performance optimizations
- **Max Updates Per Frame**: Limit concurrent updates

## Context Menu Actions

Right-click the PhysicsSystem component in the Inspector to access:
- **Export Physics Data**: Print current physics data to console
- **Reset Physics Data**: Reset to default physics state
- **Force Update**: Immediately update physics system

## Physics Monitoring

### Rigid Body Tracking
- Automatically counts all Rigidbody components in the scene
- Updates in real-time as objects are added/removed
- Useful for performance monitoring and optimization

### Collision Detection
- Tracks collision events throughout the simulation
- Accumulates collision count over time
- Helps identify physics bottlenecks

### Constraint Monitoring
- Monitors physics constraints and joints
- Correlates with rigid body count for complexity analysis
- Useful for physics performance profiling

### Performance Metrics
- Time step monitoring for consistent physics
- Iteration count for solver quality
- Gravity settings for environmental control

## Usage Examples

### Physics Performance Monitor
```csharp
void MonitorPhysicsPerformance(PhysicsData data)
{
    Debug.Log($"Physics Load: {data.physics.rigidBodies} bodies, {data.physics.constraints} constraints");

    if (data.physics.rigidBodies > 100)
    {
        Debug.LogWarning("High physics load detected!");
        OptimizePhysicsSettings();
    }
}
```

### Collision Analytics
```csharp
private int lastCollisionCount = 0;

void AnalyzeCollisions(PhysicsData data)
{
    int newCollisions = data.physics.collisions - lastCollisionCount;
    lastCollisionCount = data.physics.collisions;

    if (newCollisions > 10)
    {
        Debug.Log($"High collision activity: {newCollisions} new collisions");
    }
}
```

### Physics Optimization
```csharp
void OptimizePhysicsSettings()
{
    // Reduce physics iterations for better performance
    UnityEngine.Physics.defaultSolverIterations = 4;

    // Increase fixed timestep for less frequent updates
    Time.fixedDeltaTime = 0.03f;

    Debug.Log("Physics settings optimized for performance");
}
```

### Physics State Management
```csharp
void SavePhysicsState()
{
    string physicsJson = physicsSystem.ExportState();
    PlayerPrefs.SetString("PhysicsState", physicsJson);
    Debug.Log("Physics state saved");
}
```

## Integration with Other Systems

The Physics System integrates with other Unity Simulation packages:
- **Performance System**: Physics performance analytics
- **Procedural System**: Procedural physics object generation
- **Manufacturing System**: Industrial physics simulation
- **Disaster Management**: Physics-based disaster simulation

## Physics Optimization

### Performance Tips
- Monitor rigid body count for performance impact
- Use collision layers to reduce unnecessary collision checks
- Optimize constraint usage for better performance
- Adjust physics iterations based on quality needs

### Memory Management
- Physics system uses minimal memory overhead
- Real-time monitoring has negligible performance impact
- Event system prevents memory leaks

## Physics Settings

### Gravity Configuration
- Default gravity set to realistic -9.81 m/s²
- Can be modified for different environments (space, underwater, etc.)
- Affects all rigid bodies in the simulation

### Time Step Management
- Default time step of 0.02 seconds (50 Hz)
- Higher frequency for more accurate simulation
- Lower frequency for better performance

### Solver Iterations
- Default 6 iterations for good quality/performance balance
- Higher values for more accurate constraints
- Lower values for better performance

## Debugging Physics Issues

### Common Issues
- **High rigid body count**: Use object pooling and LOD systems
- **Excessive collisions**: Optimize collision layers and triggers
- **Constraint instability**: Increase solver iterations
- **Performance drops**: Monitor and optimize physics load

### Debug Visualization
```csharp
void VisualizePhysicsData(PhysicsData data)
{
    // Display physics metrics on UI
    rigidBodyText.text = $"Bodies: {data.physics.rigidBodies}";
    collisionText.text = $"Collisions: {data.physics.collisions}";
    performanceBar.value = Mathf.Clamp01(data.physics.rigidBodies / 100f);
}
```

## Troubleshooting

**Physics data not updating:**
- Ensure GameObject is active
- Check that physics objects exist in scene
- Verify update interval is greater than 0

**Collision count not increasing:**
- Check collision layers and matrix
- Ensure colliders are properly configured
- Verify physics materials are set up

**Performance issues:**
- Reduce rigid body count
- Optimize collision detection
- Increase update interval

## Advanced Features

### Custom Physics Events
```csharp
public class CustomPhysicsMonitor : MonoBehaviour
{
    private PhysicsSystem physicsSystem;

    void Start()
    {
        physicsSystem = FindObjectOfType<PhysicsSystem>();
        physicsSystem.OnPhysicsChanged += HandlePhysicsUpdate;
    }

    void HandlePhysicsUpdate(PhysicsData data)
    {
        // Custom physics monitoring logic
        AnalyzePhysicsComplexity(data);
    }
}
```

## Version Information

- **Framework**: unity-sim-physics
- **Namespace**: UnitySim.Physics
- **Unity Version**: 2020.3 LTS or higher
- **Dependencies**: Newtonsoft.Json

## License

Part of the Unity Simulation Framework. See main project license for details.