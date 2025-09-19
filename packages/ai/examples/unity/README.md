# Unity Integration Guide - Steam AI Package

This guide shows how to integrate the Steam AI package with Unity using JavaScript engine bridges.

## Prerequisites

- Unity 2021.3 LTS or newer
- .NET Framework 4.7.1 or newer
- One of the following JavaScript engines:
  - **ClearScript V8** (Recommended) - High performance V8 engine for .NET
  - **Jint** - Pure .NET JavaScript engine (easier setup, lower performance)

## Installation

### Option 1: ClearScript V8 (Recommended)

1. Install ClearScript V8 via NuGet Package Manager:
```
Install-Package Microsoft.ClearScript.V8
```

2. Add the Steam AI package to your project's package.json or download the built JavaScript files.

### Option 2: Jint (Alternative)

1. Install Jint via NuGet Package Manager:
```
Install-Package Jint
```

2. Add the Steam AI package to your project.

## Setup

### 1. JavaScript Engine Setup

Place the `Bridge.cs` file in your Unity project's Scripts folder. This provides the JavaScript execution environment.

### 2. Steam AI Package Integration

1. Build the Steam AI package:
```bash
cd path/to/@steam-sim/ai
npm run build
```

2. Copy the built JavaScript files (`dist/index.js`) to your Unity project's `StreamingAssets/JavaScript/` folder.

### 3. Unity Configuration

Create a folder structure in your Unity project:
```
Assets/
├── Scripts/
│   ├── AI/
│   │   ├── Bridge.cs
│   │   ├── AIManager.cs
│   │   └── AIAgent.cs
└── StreamingAssets/
    └── JavaScript/
        └── steam-ai.js
```

## Usage Examples

### Basic AI Agent Setup

1. Create an empty GameObject in your scene
2. Attach the `AIAgent` component
3. Configure the agent properties in the inspector
4. The agent will automatically create and execute behavior trees

### Behavior Tree Configuration

```csharp
using UnityEngine;

public class GuardAI : MonoBehaviour
{
    [Header("AI Configuration")]
    public Transform[] patrolPoints;
    public float detectionRadius = 10f;
    public float attackRange = 2f;

    private AIAgent aiAgent;

    void Start()
    {
        aiAgent = GetComponent<AIAgent>();

        // Configure the behavior tree
        aiAgent.CreateBehaviorTree("guard_behavior", CreateGuardBehavior());

        // Set up memory
        aiAgent.SetMemory("health", 100f);
        aiAgent.SetMemory("patrolPoints", patrolPoints);
        aiAgent.SetMemory("detectionRadius", detectionRadius);
    }

    private string CreateGuardBehavior()
    {
        return @"
        {
            'id': 'guard_root',
            'type': 'COMPOSITE',
            'children': [
                {
                    'id': 'health_check',
                    'type': 'CONDITION',
                    'condition': 'checkHealth',
                    'parameters': { 'threshold': 30 }
                },
                {
                    'id': 'main_sequence',
                    'type': 'COMPOSITE',
                    'parameters': { 'compositeType': 'selector' },
                    'children': [
                        {
                            'id': 'combat_behavior',
                            'type': 'COMPOSITE',
                            'parameters': { 'compositeType': 'sequence' },
                            'children': [
                                {
                                    'id': 'find_enemy',
                                    'type': 'CONDITION',
                                    'condition': 'detectEnemy'
                                },
                                {
                                    'id': 'attack_enemy',
                                    'type': 'ACTION',
                                    'action': 'attackTarget'
                                }
                            ]
                        },
                        {
                            'id': 'patrol_behavior',
                            'type': 'ACTION',
                            'action': 'patrol'
                        }
                    ]
                }
            ],
            'parameters': { 'compositeType': 'sequence' }
        }";
    }
}
```

### Custom Actions and Conditions

You can register custom actions and conditions that will be available to the behavior trees:

```csharp
public class CustomAIActions : MonoBehaviour
{
    private AIAgent aiAgent;

    void Start()
    {
        aiAgent = GetComponent<AIAgent>();

        // Register custom actions
        aiAgent.RegisterAction("moveToPlayer", MoveToPlayer);
        aiAgent.RegisterAction("playAnimation", PlayAnimation);

        // Register custom conditions
        aiAgent.RegisterCondition("playerInRange", IsPlayerInRange);
        aiAgent.RegisterCondition("hasAmmo", HasAmmo);
    }

    private bool MoveToPlayer(dynamic agent, dynamic blackboard)
    {
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null) return false;

        Vector3 direction = (player.transform.position - transform.position).normalized;
        transform.position += direction * Time.deltaTime * 5f;

        float distance = Vector3.Distance(transform.position, player.transform.position);
        return distance < 1f; // Return true when close enough
    }

    private bool PlayAnimation(dynamic agent, dynamic blackboard)
    {
        Animator animator = GetComponent<Animator>();
        string animationName = blackboard.data.Get("animationName") ?? "Idle";
        animator.SetTrigger(animationName);
        return true;
    }

    private bool IsPlayerInRange(dynamic agent, dynamic blackboard)
    {
        GameObject player = GameObject.FindGameObjectWithTag("Player");
        if (player == null) return false;

        float detectionRadius = aiAgent.GetMemory<float>("detectionRadius");
        float distance = Vector3.Distance(transform.position, player.transform.position);
        return distance <= detectionRadius;
    }

    private bool HasAmmo(dynamic agent, dynamic blackboard)
    {
        int ammo = aiAgent.GetMemory<int>("ammo");
        return ammo > 0;
    }
}
```

## Performance Tips

### 1. Execution Scheduling

Don't execute all AI agents every frame:

```csharp
public class AIManager : MonoBehaviour
{
    private List<AIAgent> agents = new List<AIAgent>();
    private int currentAgentIndex = 0;
    private float updateInterval = 0.1f; // Update every 100ms
    private float lastUpdate = 0f;

    void Update()
    {
        if (Time.time - lastUpdate >= updateInterval)
        {
            UpdateNextAgent();
            lastUpdate = Time.time;
        }
    }

    private void UpdateNextAgent()
    {
        if (agents.Count == 0) return;

        agents[currentAgentIndex].ExecuteBehaviorTree();
        currentAgentIndex = (currentAgentIndex + 1) % agents.Count;
    }
}
```

### 2. Memory Management

Clean up JavaScript engine periodically:

```csharp
void LateUpdate()
{
    if (Time.frameCount % 300 == 0) // Every 300 frames
    {
        JavaScriptBridge.Instance.ForceGarbageCollection();
    }
}
```

### 3. Batch Operations

Batch memory updates and tree executions when possible:

```csharp
public void BatchUpdateAgents(List<AIAgent> agents)
{
    JavaScriptBridge.Instance.BeginBatch();

    foreach (var agent in agents)
    {
        agent.UpdateMemoryBatch();
        agent.ExecuteBehaviorTreeBatch();
    }

    JavaScriptBridge.Instance.EndBatch();
}
```

## Debugging

### 1. Enable Debug Logging

```csharp
void Start()
{
    JavaScriptBridge.Instance.EnableDebugLogging = true;

    // Subscribe to AI events
    aiAgent.OnTreeExecuted += (treeId, status) => {
        Debug.Log($"Tree {treeId} executed with status: {status}");
    };

    aiAgent.OnNodeExecuted += (nodeId, status) => {
        Debug.Log($"Node {nodeId} executed with status: {status}");
    };
}
```

### 2. Visual Debugging

Use Unity's Gizmos to visualize AI behavior:

```csharp
void OnDrawGizmos()
{
    if (aiAgent == null) return;

    // Draw detection radius
    Gizmos.color = Color.yellow;
    Gizmos.DrawWireSphere(transform.position, detectionRadius);

    // Draw patrol points
    Transform[] patrolPoints = aiAgent.GetMemory<Transform[]>("patrolPoints");
    if (patrolPoints != null)
    {
        Gizmos.color = Color.blue;
        foreach (var point in patrolPoints)
        {
            Gizmos.DrawWireSphere(point.position, 0.5f);
        }
    }

    // Draw current target
    Vector3? target = aiAgent.GetMemory<Vector3?>("currentTarget");
    if (target.HasValue)
    {
        Gizmos.color = Color.red;
        Gizmos.DrawLine(transform.position, target.Value);
    }
}
```

## Troubleshooting

### Common Issues

1. **JavaScript files not found**: Ensure JavaScript files are in the `StreamingAssets` folder
2. **Performance issues**: Implement frame-spreading for behavior tree execution
3. **Memory leaks**: Regular garbage collection and proper disposal of JavaScript objects
4. **Cross-platform compatibility**: Test on target platforms as JavaScript engines may behave differently

### Error Handling

```csharp
try
{
    aiAgent.ExecuteBehaviorTree();
}
catch (JavaScriptException ex)
{
    Debug.LogError($"JavaScript execution error: {ex.Message}");
    // Fallback to simple AI behavior
    ExecuteFallbackBehavior();
}
```

## Example Scene Setup

1. Create a new scene
2. Add a Plane for the ground
3. Create a Capsule for the AI agent
4. Attach the `AIAgent` and `CustomAIActions` scripts
5. Create empty GameObjects for patrol points
6. Configure the component properties in the inspector
7. Play the scene to see the AI in action

For complete working examples, see the `Example.cs` file in this directory.