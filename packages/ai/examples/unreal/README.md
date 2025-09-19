# Unreal Engine Integration Guide - Steam AI Package

This guide shows how to integrate the Steam AI package with Unreal Engine using V8 JavaScript engine or Blueprint integration.

## Prerequisites

- Unreal Engine 5.0 or newer (recommended)
- Visual Studio 2019 or newer
- Basic knowledge of C++ and Blueprints
- Node.js and npm for building the Steam AI package

## Installation Options

### Option 1: V8 JavaScript Engine (Recommended)

1. Add V8 module to your project's `Build.cs` file:
```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore", "V8"
});
```

2. Enable the V8 plugin in your project settings or add to your `.uproject` file:
```json
{
    "Plugins": [
        {
            "Name": "V8",
            "Enabled": true
        }
    ]
}
```

### Option 2: Blueprint-Only Integration (Alternative)

Use Unreal's built-in Blueprint system with C++ bridge functions for simpler setup.

## Project Setup

### 1. Directory Structure

Create the following structure in your Unreal project:

```
Source/
├── [ProjectName]/
│   ├── AI/
│   │   ├── SteamAIBridge.h
│   │   ├── SteamAIBridge.cpp
│   │   ├── SteamAIAgent.h
│   │   ├── SteamAIAgent.cpp
│   │   └── SteamAISubsystem.h
│   │   └── SteamAISubsystem.cpp
Content/
├── JavaScript/
│   └── steam-ai.js
├── AI/
│   ├── Blueprints/
│   │   ├── BP_AIAgent.uasset
│   │   └── BP_AIManager.uasset
│   └── BehaviorTrees/
```

### 2. Steam AI Package Preparation

1. Build the Steam AI package:
```bash
cd path/to/@steam-sim/ai
npm run build
```

2. Copy the built `dist/index.js` file to `Content/JavaScript/steam-ai.js`

## Implementation

### C++ Bridge Class

The `SteamAIBridge` class provides the interface between Unreal Engine and the JavaScript AI system:

```cpp
// SteamAIBridge.h
#pragma once

#include "CoreMinimal.h"
#include "Engine/Engine.h"
#include "UObject/NoExportTypes.h"
#include "Components/ActorComponent.h"
#include "SteamAIBridge.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnTreeExecuted, const FString&, TreeId, const FString&, Status);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnNodeExecuted, const FString&, NodeId, const FString&, Status);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAIError, const FString&, ErrorMessage);

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class YOURPROJECT_API USteamAIBridge : public UActorComponent
{
    GENERATED_BODY()

public:
    USteamAIBridge();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:
    // Blueprint callable functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool InitializeAI();

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool ExecuteScript(const FString& Script);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    FString ExecuteFunction(const FString& FunctionName, const TArray<FString>& Parameters);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool CreateAgent(const FString& AgentId, const FString& AgentConfig);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool CreateBehaviorTree(const FString& TreeId, const FString& TreeConfig);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    FString ExecuteBehaviorTree(const FString& TreeId, const FString& AgentId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool SetAgentMemory(const FString& AgentId, const FString& Key, const FString& Value);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    FString GetAgentMemory(const FString& AgentId, const FString& Key);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    void ForceGarbageCollection();

    // Events
    UPROPERTY(BlueprintAssignable, Category = "Steam AI")
    FOnTreeExecuted OnTreeExecuted;

    UPROPERTY(BlueprintAssignable, Category = "Steam AI")
    FOnNodeExecuted OnNodeExecuted;

    UPROPERTY(BlueprintAssignable, Category = "Steam AI")
    FOnAIError OnAIError;

    // Configuration
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bEnableDebugLogging = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    FString JavaScriptFilePath = TEXT("/Game/JavaScript/steam-ai.js");

private:
    bool bIsInitialized = false;
    void* V8Engine = nullptr; // Platform-specific V8 engine instance

    void SetupV8Environment();
    void LoadSteamAIPackage();
    void SetupUnrealBindings();
    void CleanupV8();

    // Static callback functions for V8
    static void V8Log(const FString& Message);
    static void V8Warn(const FString& Message);
    static void V8Error(const FString& Message);
};
```

### AI Agent Component

The `SteamAIAgent` provides a high-level interface for AI behavior:

```cpp
// SteamAIAgent.h
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/Engine.h"
#include "SteamAIBridge.h"
#include "SteamAIAgent.generated.h"

USTRUCT(BlueprintType)
struct FAgentMemory
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Health = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Energy = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Suspicion = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector TargetLocation = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bHasTarget = false;
};

USTRUCT(BlueprintType)
struct FPatrolPoint
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector Location = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float WaitTime = 2.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString ActionAtPoint = TEXT("idle");
};

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class YOURPROJECT_API USteamAIAgent : public UActorComponent
{
    GENERATED_BODY()

public:
    USteamAIAgent();

protected:
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:
    // Configuration
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Agent Configuration")
    FString AgentId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Agent Configuration")
    FString AgentType = TEXT("basic");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Agent Configuration")
    float UpdateInterval = 0.2f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Agent Configuration")
    float MovementSpeed = 300.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Agent Configuration")
    float DetectionRadius = 1000.0f;

    // Behavior Configuration
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
    TArray<FPatrolPoint> PatrolPoints;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
    FString DefaultBehaviorTree = TEXT("default");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
    bool bEnablePatrolling = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
    bool bEnableCombat = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Behavior")
    bool bEnableInvestigation = true;

    // Debug
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Debug")
    bool bEnableDebugDraw = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Debug")
    bool bShowStateText = true;

    // Current State
    UPROPERTY(BlueprintReadOnly, Category = "State")
    FAgentMemory Memory;

    UPROPERTY(BlueprintReadOnly, Category = "State")
    FString CurrentState = TEXT("initializing");

    UPROPERTY(BlueprintReadOnly, Category = "State")
    FString CurrentBehaviorTree = TEXT("default");

    // Blueprint Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool InitializeAgent();

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    void UpdateAI();

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    bool SetMemory(const FString& Key, const FString& Value);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    FString GetMemory(const FString& Key);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    void SwitchBehaviorTree(const FString& TreeName);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    void AddPatrolPoint(const FVector& Location, float WaitTime = 2.0f);

    UFUNCTION(BlueprintCallable, Category = "Steam AI")
    void ClearPatrolPoints();

    // Blueprint Events
    UFUNCTION(BlueprintImplementableEvent, Category = "Steam AI")
    void OnStateChanged(const FString& NewState);

    UFUNCTION(BlueprintImplementableEvent, Category = "Steam AI")
    void OnTargetDetected(AActor* Target);

    UFUNCTION(BlueprintImplementableEvent, Category = "Steam AI")
    void OnTargetLost(AActor* Target);

    UFUNCTION(BlueprintImplementableEvent, Category = "Steam AI")
    void OnHealthChanged(float NewHealth);

    // Action Functions (called from JavaScript)
    UFUNCTION()
    bool PatrolAction();

    UFUNCTION()
    bool MoveToTargetAction();

    UFUNCTION()
    bool AttackAction();

    UFUNCTION()
    bool FleeAction();

    UFUNCTION()
    bool InvestigateAction();

    // Condition Functions (called from JavaScript)
    UFUNCTION()
    bool CheckHealthCondition(float Threshold);

    UFUNCTION()
    bool HasTargetCondition();

    UFUNCTION()
    bool InAttackRangeCondition();

    UFUNCTION()
    bool DetectEnemyCondition();

private:
    UPROPERTY()
    USteamAIBridge* AIBridge;

    bool bIsInitialized = false;
    float LastUpdateTime = 0.0f;
    int32 CurrentPatrolIndex = 0;
    AActor* CurrentTarget = nullptr;

    void SetupDefaultMemory();
    void CreateDefaultBehaviorTrees();
    void RegisterActionsAndConditions();
    void UpdateAgentPosition();
    void UpdateMemoryFromEnvironment();

    // Helper functions
    FString VectorToJson(const FVector& Vector);
    FString AgentConfigToJson();
    FString BehaviorTreeToJson(const FString& TreeType);
};
```

### Blueprint Integration

Create Blueprint classes that inherit from the C++ components:

#### BP_AIAgent Blueprint Setup

1. Create a new Blueprint based on Character or Pawn
2. Add the `SteamAIAgent` component
3. Add collision components for detection
4. Set up movement components (Character Movement, AI Controller)

#### Example Blueprint Behavior Tree Configuration

```cpp
// In Blueprint Graph or C++
FString DefaultBehaviorTreeJson = TEXT(R"({
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
            "id": "patrol_action",
            "type": "ACTION",
            "action": "patrol"
        }
    ]
})");
```

## Usage Examples

### Basic AI Setup in Blueprint

1. **Create AI Controller**:
   - Create a new Blueprint inheriting from `AIController`
   - Add logic for movement and decision-making
   - Reference the `SteamAIAgent` component

2. **Configure Behavior in Blueprint**:
   ```cpp
   // In Blueprint Construction Script or BeginPlay
   void AMyAICharacter::BeginPlay()
   {
       Super::BeginPlay();

       if (SteamAIComponent)
       {
           SteamAIComponent->InitializeAgent();

           // Set up patrol points
           SteamAIComponent->AddPatrolPoint(FVector(0, 0, 0));
           SteamAIComponent->AddPatrolPoint(FVector(1000, 0, 0));
           SteamAIComponent->AddPatrolPoint(FVector(1000, 1000, 0));
           SteamAIComponent->AddPatrolPoint(FVector(0, 1000, 0));
       }
   }
   ```

3. **Custom Actions in Blueprint**:
   - Override the action functions in your Blueprint
   - Implement custom logic for movement, combat, etc.
   - Use Unreal's navigation system for pathfinding

### Advanced Behavior Tree Setup

```cpp
void USteamAIAgent::CreateAdvancedCombatTree()
{
    FString CombatTreeJson = TEXT(R"({
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
                "id": "search_target",
                "type": "ACTION",
                "action": "searchForTarget"
            }
        ]
    })");

    if (AIBridge)
    {
        AIBridge->CreateBehaviorTree(AgentId + "_combat", CombatTreeJson);
    }
}
```

## Performance Optimization

### 1. Update Batching

```cpp
// In your AI Subsystem
void USteamAISubsystem::TickSubsystem(float DeltaTime)
{
    static int32 CurrentBatch = 0;
    static float LastBatchTime = 0.0f;

    if (GetWorld()->GetTimeSeconds() - LastBatchTime >= BatchUpdateInterval)
    {
        int32 BatchSize = FMath::Min(AgentsPerBatch, RegisteredAgents.Num());

        for (int32 i = 0; i < BatchSize; i++)
        {
            int32 AgentIndex = (CurrentBatch * AgentsPerBatch + i) % RegisteredAgents.Num();
            if (RegisteredAgents.IsValidIndex(AgentIndex))
            {
                RegisteredAgents[AgentIndex]->UpdateAI();
            }
        }

        CurrentBatch = (CurrentBatch + 1) % FMath::CeilToInt(float(RegisteredAgents.Num()) / AgentsPerBatch);
        LastBatchTime = GetWorld()->GetTimeSeconds();
    }
}
```

### 2. Memory Management

```cpp
void USteamAIBridge::PerformPeriodicCleanup()
{
    static float LastCleanupTime = 0.0f;
    float CurrentTime = GetWorld()->GetTimeSeconds();

    if (CurrentTime - LastCleanupTime >= CleanupInterval)
    {
        ForceGarbageCollection();
        LastCleanupTime = CurrentTime;
    }
}
```

### 3. Level-of-Detail AI

```cpp
void USteamAIAgent::UpdateLOD()
{
    if (APawn* OwnerPawn = Cast<APawn>(GetOwner()))
    {
        float DistanceToPlayer = FVector::Dist(
            OwnerPawn->GetActorLocation(),
            GetWorld()->GetFirstPlayerController()->GetPawn()->GetActorLocation()
        );

        if (DistanceToPlayer > HighDetailDistance)
        {
            UpdateInterval = 1.0f; // Low detail
        }
        else if (DistanceToPlayer > MediumDetailDistance)
        {
            UpdateInterval = 0.5f; // Medium detail
        }
        else
        {
            UpdateInterval = 0.1f; // High detail
        }
    }
}
```

## Debugging and Visualization

### 1. Visual Debugging

```cpp
void USteamAIAgent::DrawDebugInfo()
{
    if (!bEnableDebugDraw) return;

    UWorld* World = GetWorld();
    if (!World) return;

    FVector ActorLocation = GetOwner()->GetActorLocation();

    // Draw detection radius
    DrawDebugSphere(World, ActorLocation, DetectionRadius, 32, FColor::Yellow, false, 0.1f);

    // Draw patrol points
    for (int32 i = 0; i < PatrolPoints.Num(); i++)
    {
        FVector PointLocation = PatrolPoints[i].Location;
        DrawDebugSphere(World, PointLocation, 50.0f, 16, FColor::Blue, false, 0.1f);

        if (i < PatrolPoints.Num() - 1)
        {
            DrawDebugLine(World, PointLocation, PatrolPoints[i + 1].Location, FColor::Blue, false, 0.1f);
        }
    }

    // Draw current target
    if (CurrentTarget)
    {
        DrawDebugLine(World, ActorLocation, CurrentTarget->GetActorLocation(), FColor::Red, false, 0.1f);
    }

    // Draw state text
    if (bShowStateText)
    {
        DrawDebugString(World, ActorLocation + FVector(0, 0, 200), CurrentState, nullptr, FColor::White, 0.1f);
    }
}
```

### 2. Blueprint Debugging Events

Create Blueprint events to monitor AI behavior:

```cpp
// Call these from your AI actions to trigger Blueprint events
void USteamAIAgent::NotifyStateChange(const FString& NewState)
{
    CurrentState = NewState;
    OnStateChanged(NewState);
}

void USteamAIAgent::NotifyTargetDetected(AActor* Target)
{
    CurrentTarget = Target;
    OnTargetDetected(Target);
}
```

## Troubleshooting

### Common Issues

1. **V8 Engine Not Found**: Ensure V8 plugin is enabled and properly configured
2. **JavaScript Execution Errors**: Check console output and validate JavaScript syntax
3. **Performance Issues**: Implement update batching and LOD systems
4. **Memory Leaks**: Regular garbage collection and proper cleanup of JavaScript objects

### Error Handling

```cpp
bool USteamAIBridge::SafeExecuteScript(const FString& Script)
{
    try
    {
        return ExecuteScript(Script);
    }
    catch (const std::exception& e)
    {
        FString ErrorMsg = FString::Printf(TEXT("JavaScript Error: %s"), UTF8_TO_TCHAR(e.what()));
        OnAIError.Broadcast(ErrorMsg);
        UE_LOG(LogTemp, Error, TEXT("%s"), *ErrorMsg);
        return false;
    }
}
```

## Blueprint Examples

The `examples` folder contains several Blueprint examples:

- **BP_BasicAIAgent**: Simple patrol and combat AI
- **BP_GuardAI**: Advanced guard with investigation behavior
- **BP_AIManager**: Manages multiple AI agents with performance optimization
- **BP_DebugAI**: Debug visualization and monitoring tools

For complete implementation details, see the Bridge.h, Bridge.cpp, and Example.cpp files in this directory.