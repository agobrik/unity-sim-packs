// Steam AI Agent Example Implementation for Unreal Engine

#include "SteamAIAgent.h"
#include "SteamAIBridge.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SphereComponent.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "AIController.h"
#include "NavigationSystem.h"
#include "NavigationPath.h"
#include "DrawDebugHelpers.h"
#include "Kismet/GameplayStatics.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

DEFINE_LOG_CATEGORY(LogSteamAIAgent);

// USteamAIAgent Implementation

USteamAIAgent::USteamAIAgent()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickInterval = 0.2f; // Default update interval
}

void USteamAIAgent::BeginPlay()
{
    Super::BeginPlay();

    // Generate agent ID if not set
    if (AgentId.IsEmpty())
    {
        AgentId = FString::Printf(TEXT("Agent_%d"), GetUniqueID());
    }

    // Find or create AI Bridge
    if (!AIBridge)
    {
        AIBridge = GetOwner()->FindComponentByClass<USteamAIBridge>();
        if (!AIBridge)
        {
            // Try to find AI Bridge in the world or create a global one
            if (USteamAISubsystem* AISubsystem = GetWorld()->GetSubsystem<USteamAISubsystem>())
            {
                AIBridge = AISubsystem->GetAIBridge();
            }
        }
    }

    if (AIBridge)
    {
        if (AIBridge->IsInitialized())
        {
            InitializeAgent();
        }
        else
        {
            // Wait for AI Bridge to initialize
            AIBridge->OnAIInitialized.AddDynamic(this, &USteamAIAgent::OnAIBridgeInitialized);
        }
    }
    else
    {
        UE_LOG(LogSteamAIAgent, Error, TEXT("No Steam AI Bridge found for agent %s"), *AgentId);
    }

    // Register with subsystem
    if (USteamAISubsystem* AISubsystem = GetWorld()->GetSubsystem<USteamAISubsystem>())
    {
        AISubsystem->RegisterAIAgent(this);
    }
}

void USteamAIAgent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (bIsInitialized && GetWorld()->GetTimeSeconds() - LastUpdateTime >= UpdateInterval)
    {
        UpdateAI();
        LastUpdateTime = GetWorld()->GetTimeSeconds();
    }

    // Update visual debugging
    if (bEnableDebugDraw)
    {
        DrawDebugInfo();
    }
}

void USteamAIAgent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    // Unregister from subsystem
    if (USteamAISubsystem* AISubsystem = GetWorld()->GetSubsystem<USteamAISubsystem>())
    {
        AISubsystem->UnregisterAIAgent(this);
    }

    // Cleanup agent in JavaScript
    if (AIBridge && bIsInitialized)
    {
        AIBridge->RemoveAgent(AgentId);

        // Unregister callbacks
        if (RegisteredActions.Contains(AgentId))
        {
            RegisteredActions[AgentId].Empty();
        }
        if (RegisteredConditions.Contains(AgentId))
        {
            RegisteredConditions[AgentId].Empty();
        }
    }

    Super::EndPlay(EndPlayReason);
}

void USteamAIAgent::OnAIBridgeInitialized(bool bSuccess)
{
    if (bSuccess)
    {
        InitializeAgent();
    }
    else
    {
        UE_LOG(LogSteamAIAgent, Error, TEXT("AI Bridge initialization failed for agent %s"), *AgentId);
    }
}

bool USteamAIAgent::InitializeAgent()
{
    if (!AIBridge || !AIBridge->IsInitialized())
    {
        return false;
    }

    UE_LOG(LogSteamAIAgent, Log, TEXT("Initializing AI agent %s"), *AgentId);

    try
    {
        // Create agent in JavaScript
        FString AgentConfig = CreateAgentConfig();
        if (!AIBridge->CreateAgent(AgentId, AgentConfig))
        {
            UE_LOG(LogSteamAIAgent, Error, TEXT("Failed to create agent %s in JavaScript"), *AgentId);
            return false;
        }

        // Setup default memory
        SetupDefaultMemory();

        // Create behavior trees
        CreateDefaultBehaviorTrees();

        // Register actions and conditions
        RegisterActionsAndConditions();

        bIsInitialized = true;
        CurrentState = TEXT("idle");

        UE_LOG(LogSteamAIAgent, Log, TEXT("AI agent %s initialized successfully"), *AgentId);

        // Broadcast state change
        OnStateChanged(CurrentState);

        return true;
    }
    catch (...)
    {
        UE_LOG(LogSteamAIAgent, Error, TEXT("Exception during agent initialization: %s"), *AgentId);
        return false;
    }
}

void USteamAIAgent::UpdateAI()
{
    if (!bIsInitialized || !AIBridge)
        return;

    try
    {
        // Update agent position in JavaScript
        UpdateAgentPosition();

        // Update memory from environment
        UpdateMemoryFromEnvironment();

        // Execute current behavior tree
        FString TreeId = AgentId + TEXT("_") + CurrentBehaviorTree;
        FString Status = AIBridge->ExecuteBehaviorTree(TreeId, AgentId);

        // Handle state transitions based on AI output
        HandleAIOutput(Status);
    }
    catch (...)
    {
        UE_LOG(LogSteamAIAgent, Error, TEXT("Error updating AI for agent %s"), *AgentId);
    }
}

FString USteamAIAgent::CreateAgentConfig()
{
    TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);

    JsonObject->SetStringField(TEXT("id"), AgentId);
    JsonObject->SetStringField(TEXT("agentType"), AgentType);

    // Position
    FVector Position = GetOwner()->GetActorLocation();
    TSharedPtr<FJsonObject> PositionObj = MakeShareable(new FJsonObject);
    PositionObj->SetNumberField(TEXT("x"), Position.X);
    PositionObj->SetNumberField(TEXT("y"), Position.Y);
    PositionObj->SetNumberField(TEXT("z"), Position.Z);
    JsonObject->SetObjectField(TEXT("position"), PositionObj);

    // Properties
    TSharedPtr<FJsonObject> PropertiesObj = MakeShareable(new FJsonObject);
    PropertiesObj->SetNumberField(TEXT("health"), Memory.Health);
    PropertiesObj->SetNumberField(TEXT("energy"), Memory.Energy);
    PropertiesObj->SetNumberField(TEXT("detectionRadius"), DetectionRadius);
    PropertiesObj->SetNumberField(TEXT("movementSpeed"), MovementSpeed);
    JsonObject->SetObjectField(TEXT("properties"), PropertiesObj);

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
    return OutputString;
}

void USteamAIAgent::SetupDefaultMemory()
{
    SetMemory(TEXT("health"), FString::Printf(TEXT("%.1f"), Memory.Health));
    SetMemory(TEXT("energy"), FString::Printf(TEXT("%.1f"), Memory.Energy));
    SetMemory(TEXT("suspicion"), FString::Printf(TEXT("%.1f"), Memory.Suspicion));
    SetMemory(TEXT("detectionRadius"), FString::Printf(TEXT("%.1f"), DetectionRadius));
    SetMemory(TEXT("movementSpeed"), FString::Printf(TEXT("%.1f"), MovementSpeed));
    SetMemory(TEXT("hasTarget"), Memory.bHasTarget ? TEXT("true") : TEXT("false"));

    // Set patrol points if available
    if (PatrolPoints.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> PointsArray;
        for (const FPatrolPoint& Point : PatrolPoints)
        {
            TSharedPtr<FJsonObject> PointObj = MakeShareable(new FJsonObject);
            PointObj->SetNumberField(TEXT("x"), Point.Location.X);
            PointObj->SetNumberField(TEXT("y"), Point.Location.Y);
            PointObj->SetNumberField(TEXT("z"), Point.Location.Z);
            PointObj->SetNumberField(TEXT("waitTime"), Point.WaitTime);
            PointObj->SetStringField(TEXT("action"), Point.ActionAtPoint);

            PointsArray.Add(MakeShareable(new FJsonValueObject(PointObj)));
        }

        FString PointsJson;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&PointsJson);
        FJsonSerializer::Serialize(PointsArray, Writer);
        SetMemory(TEXT("patrolPoints"), PointsJson);
        SetMemory(TEXT("currentPatrolIndex"), TEXT("0"));
    }
}

void USteamAIAgent::CreateDefaultBehaviorTrees()
{
    // Create default behavior tree
    CreateDefaultBehaviorTree();

    // Create combat behavior tree if enabled
    if (bEnableCombat)
    {
        CreateCombatBehaviorTree();
    }

    // Create investigation behavior tree if enabled
    if (bEnableInvestigation)
    {
        CreateInvestigationBehaviorTree();
    }
}

void USteamAIAgent::CreateDefaultBehaviorTree()
{
    FString TreeConfig = TEXT(R"({
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
                        "id": "seek_help_action",
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
                        "condition": "detectEnemy"
                    },
                    {
                        "id": "switch_to_combat",
                        "type": "ACTION",
                        "action": "switchToCombat"
                    }
                ]
            },
            {
                "id": "patrol_fallback",
                "type": "ACTION",
                "action": "patrol"
            }
        ]
    })");

    FString TreeId = AgentId + TEXT("_default");
    AIBridge->CreateBehaviorTree(TreeId, TreeConfig);
}

void USteamAIAgent::CreateCombatBehaviorTree()
{
    FString TreeConfig = TEXT(R"({
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
                                "action": "moveToTarget"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "search_enemy",
                "type": "ACTION",
                "action": "searchForTarget"
            }
        ]
    })");

    FString TreeId = AgentId + TEXT("_combat");
    AIBridge->CreateBehaviorTree(TreeId, TreeConfig);
}

void USteamAIAgent::RegisterActionsAndConditions()
{
    // Register actions
    FActionDelegate PatrolDelegate;
    PatrolDelegate.BindUFunction(this, FName("PatrolAction"));
    AIBridge->RegisterAction(AgentId, TEXT("patrol"), PatrolDelegate);

    FActionDelegate MoveToTargetDelegate;
    MoveToTargetDelegate.BindUFunction(this, FName("MoveToTargetAction"));
    AIBridge->RegisterAction(AgentId, TEXT("moveToTarget"), MoveToTargetDelegate);

    FActionDelegate AttackDelegate;
    AttackDelegate.BindUFunction(this, FName("AttackAction"));
    AIBridge->RegisterAction(AgentId, TEXT("attack"), AttackDelegate);

    FActionDelegate FleeDelegate;
    FleeDelegate.BindUFunction(this, FName("FleeAction"));
    AIBridge->RegisterAction(AgentId, TEXT("flee"), FleeDelegate);

    // Register conditions
    FConditionDelegate HealthCheckDelegate;
    HealthCheckDelegate.BindUFunction(this, FName("CheckHealthCondition"));
    AIBridge->RegisterCondition(AgentId, TEXT("checkHealth"), HealthCheckDelegate);

    FConditionDelegate HasTargetDelegate;
    HasTargetDelegate.BindUFunction(this, FName("HasTargetCondition"));
    AIBridge->RegisterCondition(AgentId, TEXT("hasTarget"), HasTargetDelegate);

    FConditionDelegate InAttackRangeDelegate;
    InAttackRangeDelegate.BindUFunction(this, FName("InAttackRangeCondition"));
    AIBridge->RegisterCondition(AgentId, TEXT("inAttackRange"), InAttackRangeDelegate);

    FConditionDelegate DetectEnemyDelegate;
    DetectEnemyDelegate.BindUFunction(this, FName("DetectEnemyCondition"));
    AIBridge->RegisterCondition(AgentId, TEXT("detectEnemy"), DetectEnemyDelegate);
}

void USteamAIAgent::UpdateAgentPosition()
{
    if (!AIBridge || !bIsInitialized)
        return;

    FVector Position = GetOwner()->GetActorLocation();
    AIBridge->UpdateAgentPosition(AgentId, Position);
}

void USteamAIAgent::UpdateMemoryFromEnvironment()
{
    // Update health
    SetMemory(TEXT("health"), FString::Printf(TEXT("%.1f"), Memory.Health));

    // Update position
    FVector Position = GetOwner()->GetActorLocation();
    FString PositionJson = FString::Printf(TEXT("{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f}"),
                                          Position.X, Position.Y, Position.Z);
    SetMemory(TEXT("position"), PositionJson);

    // Update target information
    SetMemory(TEXT("hasTarget"), Memory.bHasTarget ? TEXT("true") : TEXT("false"));
    if (Memory.bHasTarget)
    {
        FString TargetJson = FString::Printf(TEXT("{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f}"),
                                           Memory.TargetLocation.X, Memory.TargetLocation.Y, Memory.TargetLocation.Z);
        SetMemory(TEXT("targetLocation"), TargetJson);
    }

    // Update suspicion level
    SetMemory(TEXT("suspicion"), FString::Printf(TEXT("%.1f"), Memory.Suspicion));
}

void USteamAIAgent::HandleAIOutput(const FString& Status)
{
    // Handle behavior tree execution results
    if (Status == TEXT("SUCCESS"))
    {
        // Behavior completed successfully
    }
    else if (Status == TEXT("FAILURE"))
    {
        // Behavior failed, might need to switch strategies
    }
    else if (Status == TEXT("RUNNING"))
    {
        // Behavior is still executing
    }

    // Update current state based on memory and behavior
    UpdateCurrentState();
}

void USteamAIAgent::UpdateCurrentState()
{
    FString NewState = CurrentState;

    // Determine state based on current conditions
    if (Memory.Health <= 20.0f)
    {
        NewState = TEXT("emergency");
    }
    else if (Memory.bHasTarget && CurrentBehaviorTree == TEXT("combat"))
    {
        NewState = TEXT("combat");
    }
    else if (Memory.Suspicion > 30.0f)
    {
        NewState = TEXT("investigating");
    }
    else if (bEnablePatrolling && PatrolPoints.Num() > 0)
    {
        NewState = TEXT("patrolling");
    }
    else
    {
        NewState = TEXT("idle");
    }

    if (NewState != CurrentState)
    {
        FString OldState = CurrentState;
        CurrentState = NewState;
        OnStateChanged(CurrentState);

        UE_LOG(LogSteamAIAgent, Log, TEXT("Agent %s state changed from %s to %s"),
               *AgentId, *OldState, *CurrentState);
    }
}

// Action Implementations

bool USteamAIAgent::PatrolAction()
{
    if (PatrolPoints.Num() == 0)
    {
        return true; // Nothing to patrol
    }

    if (CurrentPatrolIndex >= PatrolPoints.Num())
    {
        CurrentPatrolIndex = 0;
    }

    FVector TargetLocation = PatrolPoints[CurrentPatrolIndex].Location;
    FVector CurrentLocation = GetOwner()->GetActorLocation();

    // Move towards patrol point
    if (AAIController* AIController = Cast<AAIController>(GetOwner()->GetInstigatorController()))
    {
        AIController->MoveToLocation(TargetLocation, 100.0f); // 100cm acceptance radius
    }

    // Check if we've reached the patrol point
    float Distance = FVector::Dist(CurrentLocation, TargetLocation);
    if (Distance < 150.0f) // 1.5m threshold
    {
        CurrentPatrolIndex = (CurrentPatrolIndex + 1) % PatrolPoints.Num();
        SetMemory(TEXT("currentPatrolIndex"), FString::Printf(TEXT("%d"), CurrentPatrolIndex));
        return true; // Patrol point reached
    }

    return false; // Still moving to patrol point
}

bool USteamAIAgent::MoveToTargetAction()
{
    if (!Memory.bHasTarget)
    {
        return false;
    }

    FVector CurrentLocation = GetOwner()->GetActorLocation();
    float Distance = FVector::Dist(CurrentLocation, Memory.TargetLocation);

    if (Distance < 200.0f) // Close enough
    {
        return true;
    }

    // Move towards target
    if (AAIController* AIController = Cast<AAIController>(GetOwner()->GetInstigatorController()))
    {
        AIController->MoveToLocation(Memory.TargetLocation, 100.0f);
    }

    return false; // Still moving
}

bool USteamAIAgent::AttackAction()
{
    if (!Memory.bHasTarget)
    {
        return false;
    }

    FVector CurrentLocation = GetOwner()->GetActorLocation();
    float Distance = FVector::Dist(CurrentLocation, Memory.TargetLocation);

    if (Distance > 300.0f) // Too far to attack
    {
        return false;
    }

    // Perform attack
    UE_LOG(LogSteamAIAgent, Log, TEXT("Agent %s attacking target!"), *AgentId);

    // Trigger attack event
    OnTargetDetected.Broadcast(nullptr); // Would pass actual target actor

    // Reset target after attack
    Memory.bHasTarget = false;
    Memory.TargetLocation = FVector::ZeroVector;

    return true;
}

bool USteamAIAgent::FleeAction()
{
    if (!Memory.bHasTarget)
    {
        return true; // Nothing to flee from
    }

    FVector CurrentLocation = GetOwner()->GetActorLocation();
    FVector FleeDirection = (CurrentLocation - Memory.TargetLocation).GetSafeNormal();
    FVector FleeTarget = CurrentLocation + FleeDirection * 1000.0f; // Flee 10m away

    if (AAIController* AIController = Cast<AAIController>(GetOwner()->GetInstigatorController()))
    {
        AIController->MoveToLocation(FleeTarget, 100.0f);
    }

    // Check if we've fled far enough
    float Distance = FVector::Dist(CurrentLocation, Memory.TargetLocation);
    if (Distance > DetectionRadius * 1.5f)
    {
        Memory.bHasTarget = false;
        Memory.TargetLocation = FVector::ZeroVector;
        return true; // Successfully fled
    }

    return false; // Still fleeing
}

bool USteamAIAgent::InvestigateAction()
{
    // Simple investigation behavior
    Memory.Suspicion = FMath::Max(0.0f, Memory.Suspicion - 5.0f);

    if (Memory.Suspicion <= 5.0f)
    {
        return true; // Investigation complete
    }

    return false; // Still investigating
}

// Condition Implementations

bool USteamAIAgent::CheckHealthCondition(float Threshold)
{
    return Memory.Health > Threshold;
}

bool USteamAIAgent::HasTargetCondition()
{
    return Memory.bHasTarget;
}

bool USteamAIAgent::InAttackRangeCondition()
{
    if (!Memory.bHasTarget)
    {
        return false;
    }

    FVector CurrentLocation = GetOwner()->GetActorLocation();
    float Distance = FVector::Dist(CurrentLocation, Memory.TargetLocation);
    return Distance <= 300.0f; // 3m attack range
}

bool USteamAIAgent::DetectEnemyCondition()
{
    // Simple enemy detection - look for actors with "Enemy" tag
    TArray<AActor*> FoundActors;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), FName("Enemy"), FoundActors);

    FVector CurrentLocation = GetOwner()->GetActorLocation();

    for (AActor* Actor : FoundActors)
    {
        if (Actor && Actor != GetOwner())
        {
            float Distance = FVector::Dist(CurrentLocation, Actor->GetActorLocation());
            if (Distance <= DetectionRadius)
            {
                // Enemy detected
                Memory.bHasTarget = true;
                Memory.TargetLocation = Actor->GetActorLocation();
                SetMemory(TEXT("hasTarget"), TEXT("true"));

                OnTargetDetected.Broadcast(Actor);
                return true;
            }
        }
    }

    return false;
}

// Public API Methods

bool USteamAIAgent::SetMemory(const FString& Key, const FString& Value)
{
    if (!AIBridge || !bIsInitialized)
    {
        return false;
    }

    return AIBridge->SetAgentMemory(AgentId, Key, Value);
}

FString USteamAIAgent::GetMemory(const FString& Key)
{
    if (!AIBridge || !bIsInitialized)
    {
        return TEXT("");
    }

    return AIBridge->GetAgentMemory(AgentId, Key);
}

void USteamAIAgent::SwitchBehaviorTree(const FString& TreeName)
{
    CurrentBehaviorTree = TreeName;
    UE_LOG(LogSteamAIAgent, Log, TEXT("Agent %s switched to behavior tree: %s"), *AgentId, *TreeName);
}

void USteamAIAgent::AddPatrolPoint(const FVector& Location, float WaitTime)
{
    FPatrolPoint NewPoint;
    NewPoint.Location = Location;
    NewPoint.WaitTime = WaitTime;
    NewPoint.ActionAtPoint = TEXT("idle");

    PatrolPoints.Add(NewPoint);

    // Update memory if agent is initialized
    if (bIsInitialized)
    {
        SetupDefaultMemory();
    }
}

void USteamAIAgent::ClearPatrolPoints()
{
    PatrolPoints.Empty();
    CurrentPatrolIndex = 0;
}

void USteamAIAgent::DrawDebugInfo()
{
    if (!GetWorld())
        return;

    FVector ActorLocation = GetOwner()->GetActorLocation();

    // Draw detection radius
    DrawDebugSphere(GetWorld(), ActorLocation, DetectionRadius, 32, FColor::Yellow, false, 0.1f, 0, 2.0f);

    // Draw patrol points and path
    for (int32 i = 0; i < PatrolPoints.Num(); i++)
    {
        FVector PointLocation = PatrolPoints[i].Location;
        FColor PointColor = (i == CurrentPatrolIndex) ? FColor::Green : FColor::Blue;

        DrawDebugSphere(GetWorld(), PointLocation, 50.0f, 16, PointColor, false, 0.1f, 0, 3.0f);

        // Draw line to next patrol point
        if (i < PatrolPoints.Num() - 1)
        {
            DrawDebugLine(GetWorld(), PointLocation, PatrolPoints[i + 1].Location, FColor::Blue, false, 0.1f, 0, 2.0f);
        }
        else if (PatrolPoints.Num() > 1)
        {
            DrawDebugLine(GetWorld(), PointLocation, PatrolPoints[0].Location, FColor::Blue, false, 0.1f, 0, 2.0f);
        }
    }

    // Draw current target
    if (Memory.bHasTarget)
    {
        DrawDebugLine(GetWorld(), ActorLocation, Memory.TargetLocation, FColor::Red, false, 0.1f, 0, 3.0f);
        DrawDebugSphere(GetWorld(), Memory.TargetLocation, 75.0f, 16, FColor::Red, false, 0.1f, 0, 3.0f);
    }

    // Draw state text
    if (bShowStateText)
    {
        FString StateText = FString::Printf(TEXT("%s\nHP: %.0f\nState: %s"),
                                          *AgentId, Memory.Health, *CurrentState);
        DrawDebugString(GetWorld(), ActorLocation + FVector(0, 0, 200), StateText,
                       nullptr, FColor::White, 0.1f, false);
    }
}