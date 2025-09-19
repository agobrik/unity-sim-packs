# AI System Package

An advanced Unity C# artificial intelligence simulation system for the Unity Simulation Framework.

## Overview

The AI System provides comprehensive artificial intelligence simulation with agent management, neural network simulation, decision tracking, learning algorithms, and performance monitoring. Perfect for AI research, game development, and educational applications.

## Features

- **Agent Management**: Multi-agent system with configurable agent counts
- **Decision Tracking**: Monitor AI decision-making processes and outcomes
- **Learning Rate Control**: Adjustable machine learning parameters
- **Neural Network Simulation**: Basic neural network activity simulation
- **Accuracy Monitoring**: Track AI system performance and accuracy
- **Training Iterations**: Monitor learning progress and training cycles
- **System Health**: AI system operational status monitoring
- **Event System**: Subscribe to AI changes and data exports
- **JSON Export**: Complete AI data serialization
- **Unity Inspector Integration**: Easy configuration through Unity Editor

## Installation

1. Copy the `packages/ai` folder to your Unity project
2. Ensure Newtonsoft.Json is installed in your project
3. Add the AISystem component to a GameObject in your scene

## Quick Start

```csharp
using UnitySim.AI;

public class AIExample : MonoBehaviour
{
    public AISystem aiSystem;

    void Start()
    {
        // Subscribe to AI changes
        aiSystem.OnAIChanged += OnAIUpdate;

        // Configure update interval
        aiSystem.SetUpdateInterval(1.5f);
    }

    void OnAIUpdate(AIData data)
    {
        Debug.Log($"Agents: {data.ai.agentCount}");
        Debug.Log($"Decisions: {data.ai.decisionsMade}");
        Debug.Log($"Accuracy: {data.ai.accuracy:F1}%");
    }
}
```

## API Reference

### AISystem Class

**Public Properties:**
- `float updateInterval`: Update frequency in seconds (default: 1.0f)
- `bool enableLogging`: Enable debug logging (default: false)
- `bool enableEvents`: Enable event broadcasting (default: true)
- `bool enableOptimization`: Enable performance optimizations (default: true)

**Public Methods:**
- `string ExportState()`: Export current AI data as JSON
- `AIData GetData()`: Get current AI data object
- `void SetUpdateInterval(float interval)`: Set update frequency
- `void ResetData()`: Reset AI system to default state

**Events:**
- `System.Action<AIData> OnAIChanged`: Triggered when AI system updates
- `System.Action<string> OnDataExported`: Triggered when data is exported

### AIData Class

```csharp
public class AIData
{
    public long timestamp;        // Unix timestamp
    public long currentTime;      // Current system time
    public AIInfo ai;            // AI information object
}
```

### AIInfo Class

```csharp
public class AIInfo
{
    public int agentCount;               // Number of AI agents (default: 15)
    public int decisionsMade;            // Total decisions made (default: 0)
    public float learningRate;           // Learning rate (default: 0.01)
    public bool neuralNetworkActive;     // Neural network status (default: true)
    public float accuracy;               // AI accuracy % (default: 92.5%)
    public int trainingIterations;       // Training cycles (default: 1000)
    public string systemHealth;         // System status (default: "operational")
    public string framework;            // Framework identifier
}
```

## Configuration

The AI System can be configured through the Unity Inspector:

### AI Settings
- **Update Interval**: How often the AI system updates (seconds)
- **Enable Logging**: Show debug messages in console
- **Enable Events**: Broadcast AI change events

### Performance Settings
- **Enable Optimization**: Use performance optimizations
- **Max Updates Per Frame**: Limit concurrent updates

## Context Menu Actions

Right-click the AISystem component in the Inspector to access:
- **Export AI Data**: Print current AI data to console
- **Reset AI Data**: Reset to default AI state
- **Force Update**: Immediately update AI system

## AI Components

### Agent Management
- Tracks the number of active AI agents
- Each agent represents an independent AI entity
- Agents can make decisions and learn from outcomes

### Decision Making
- Monitors total decisions made by all agents
- Tracks decision frequency and patterns
- Useful for analyzing AI behavior

### Learning System
- Configurable learning rate for ML algorithms
- Training iteration tracking
- Accuracy measurement and improvement

### Neural Network Simulation
- Basic neural network activity simulation
- Network status monitoring
- Performance optimization controls

## Usage Examples

### AI Agent Controller
```csharp
void ManageAIAgents(AIData data)
{
    Debug.Log($"Managing {data.ai.agentCount} AI agents");

    if (data.ai.accuracy < 85.0f)
    {
        // Increase training if accuracy is low
        Debug.Log("Increasing AI training intensity");
    }
}
```

### Learning Progress Monitor
```csharp
void MonitorLearningProgress(AIData data)
{
    float progress = (float)data.ai.trainingIterations / 10000f;
    learningProgressBar.value = Mathf.Clamp01(progress);

    accuracyText.text = $"Accuracy: {data.ai.accuracy:F1}%";
}
```

### Decision Analytics
```csharp
void AnalyzeDecisions(AIData data)
{
    float decisionsPerSecond = data.ai.decisionsMade / Time.time;
    Debug.Log($"AI Decision Rate: {decisionsPerSecond:F2} decisions/sec");
}
```

### AI Performance Tuning
```csharp
void OptimizeAIPerformance(AIData data)
{
    // Adjust learning rate based on performance
    if (data.ai.accuracy > 95.0f)
    {
        // Reduce learning rate for stability
        data.ai.learningRate = 0.005f;
    }
    else if (data.ai.accuracy < 80.0f)
    {
        // Increase learning rate for faster improvement
        data.ai.learningRate = 0.02f;
    }
}
```

## Integration with Other Systems

The AI System integrates seamlessly with other Unity Simulation packages:
- **Decision Framework**: Advanced decision-making algorithms
- **Analytics System**: AI performance analytics
- **Data Visualization**: AI data visualization and charts
- **ML Integration**: Machine learning model integration

## AI Algorithms

The system simulates various AI concepts:
- **Agent-Based Modeling**: Multiple independent agents
- **Machine Learning**: Learning rate and accuracy tracking
- **Neural Networks**: Basic network simulation
- **Decision Trees**: Decision tracking and analysis

## Performance Considerations

- Lightweight AI simulation suitable for real-time applications
- Configurable update intervals for performance optimization
- Event-driven architecture reduces computational overhead
- Optimized for multiple agent scenarios

## Debugging and Monitoring

### AI System Health
- Monitor system operational status
- Track performance metrics
- Identify bottlenecks and issues

### Decision Analysis
- Track decision patterns
- Monitor decision frequency
- Analyze agent behavior

### Learning Progress
- Monitor training iterations
- Track accuracy improvements
- Analyze learning efficiency

## Troubleshooting

**AI not making decisions:**
- Check that agents are active
- Verify neuralNetworkActive is true
- Ensure system is updating regularly

**Low accuracy scores:**
- Increase training iterations
- Adjust learning rate
- Check agent configuration

**Performance issues:**
- Reduce agent count
- Increase update interval
- Enable optimization features

## Advanced Features

### Custom AI Behaviors
Extend the system by creating custom agent behaviors:
```csharp
public class CustomAIAgent : MonoBehaviour
{
    private AISystem aiSystem;

    void Start()
    {
        aiSystem = FindObjectOfType<AISystem>();
        aiSystem.OnAIChanged += HandleAIUpdate;
    }

    void HandleAIUpdate(AIData data)
    {
        // Custom AI logic here
        MakeDecision(data);
    }
}
```

## Version Information

- **Framework**: unity-sim-ai
- **Namespace**: UnitySim.AI
- **Unity Version**: 2020.3 LTS or higher
- **Dependencies**: Newtonsoft.Json

## License

Part of the Unity Simulation Framework. See main project license for details.