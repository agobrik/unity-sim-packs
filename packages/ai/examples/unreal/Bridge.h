// Steam AI Bridge for Unreal Engine
// Provides JavaScript execution environment for Steam AI package integration

#pragma once

#include "CoreMinimal.h"
#include "Engine/Engine.h"
#include "UObject/NoExportTypes.h"
#include "Components/ActorComponent.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Engine/World.h"
#include "Misc/DateTime.h"
#include "HAL/PlatformFilemanager.h"
#include "Misc/FileHelper.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

// Include V8 headers if available
#if WITH_V8
#include "V8/Public/V8.h"
#include "V8/Public/V8Isolate.h"
#include "V8/Public/V8Context.h"
#include "V8/Public/V8Value.h"
#include "V8/Public/V8Function.h"
#include "V8/Public/V8Object.h"
#endif

#include "SteamAIBridge.generated.h"

DECLARE_LOG_CATEGORY_EXTERN(LogSteamAI, Log, All);

// Delegates for AI events
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAITreeExecuted, const FString&, TreeId, const FString&, Status);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAINodeExecuted, const FString&, NodeId, const FString&, Status);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAIError, const FString&, ErrorMessage);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAIInitialized, bool, bSuccess);

// Action and condition delegate types for JavaScript callbacks
DECLARE_DYNAMIC_DELEGATE_RetVal_TwoParams(bool, FActionDelegate, const FString&, AgentData, const FString&, BlackboardData);
DECLARE_DYNAMIC_DELEGATE_RetVal_TwoParams(bool, FConditionDelegate, const FString&, AgentData, const FString&, BlackboardData);

/**
 * Configuration structure for Steam AI Bridge
 */
USTRUCT(BlueprintType)
struct FSteamAIConfig
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bEnableDebugLogging = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    FString JavaScriptFilePath = TEXT("/Game/JavaScript/steam-ai.js");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bUseV8Engine = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    float GarbageCollectionInterval = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    int32 MaxMemoryUsageMB = 128;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bEnablePerformanceMonitoring = false;
};

/**
 * Performance monitoring structure
 */
USTRUCT(BlueprintType)
struct FSteamAIPerformanceStats
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    float ScriptExecutionTimeMs = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    float TreeExecutionTimeMs = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    int32 ActiveAgents = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    int32 ActiveTrees = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    float MemoryUsageMB = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Performance")
    int32 ScriptCallsPerSecond = 0;
};

/**
 * JavaScript execution context for Steam AI
 */
UCLASS()
class YOURPROJECT_API USteamAIJSContext : public UObject
{
    GENERATED_BODY()

public:
    // JavaScript callback functions
    UFUNCTION()
    static void JSLog(const FString& Message);

    UFUNCTION()
    static void JSWarn(const FString& Message);

    UFUNCTION()
    static void JSError(const FString& Message);

    UFUNCTION()
    static float JSGetTime();

    UFUNCTION()
    static float JSGetDeltaTime();

    UFUNCTION()
    static FString JSCreateVector3(float X, float Y, float Z);

    UFUNCTION()
    static float JSCalculateDistance(const FString& VectorA, const FString& VectorB);

    UFUNCTION()
    static bool JSCallAction(const FString& AgentId, const FString& ActionName, const FString& AgentData, const FString& BlackboardData);

    UFUNCTION()
    static bool JSCallCondition(const FString& AgentId, const FString& ConditionName, const FString& AgentData, const FString& BlackboardData);

private:
    static class USteamAIBridge* GetBridgeInstance();
};

/**
 * Main Steam AI Bridge Component
 * Provides integration between Unreal Engine and Steam AI JavaScript package
 */
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class YOURPROJECT_API USteamAIBridge : public UActorComponent
{
    GENERATED_BODY()

public:
    USteamAIBridge();

protected:
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:
    // Configuration
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    FSteamAIConfig Config;

    // Events
    UPROPERTY(BlueprintAssignable, Category = "Steam AI Events")
    FOnAITreeExecuted OnTreeExecuted;

    UPROPERTY(BlueprintAssignable, Category = "Steam AI Events")
    FOnAINodeExecuted OnNodeExecuted;

    UPROPERTY(BlueprintAssignable, Category = "Steam AI Events")
    FOnAIError OnAIError;

    UPROPERTY(BlueprintAssignable, Category = "Steam AI Events")
    FOnAIInitialized OnAIInitialized;

    // Core JavaScript Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Core")
    bool InitializeAI();

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Core")
    bool IsInitialized() const { return bIsInitialized; }

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Core")
    bool ExecuteScript(const FString& Script);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Core")
    FString ExecuteFunction(const FString& FunctionName, const TArray<FString>& Parameters = TArray<FString>());

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Core")
    void ForceGarbageCollection();

    // Agent Management Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Agents")
    bool CreateAgent(const FString& AgentId, const FString& AgentConfig);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Agents")
    bool RemoveAgent(const FString& AgentId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Agents")
    bool SetAgentMemory(const FString& AgentId, const FString& Key, const FString& Value);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Agents")
    FString GetAgentMemory(const FString& AgentId, const FString& Key);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Agents")
    bool UpdateAgentPosition(const FString& AgentId, const FVector& Position);

    // Behavior Tree Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Behavior Trees")
    bool CreateBehaviorTree(const FString& TreeId, const FString& TreeConfig);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Behavior Trees")
    bool RemoveBehaviorTree(const FString& TreeId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Behavior Trees")
    FString ExecuteBehaviorTree(const FString& TreeId, const FString& AgentId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Behavior Trees")
    TArray<FString> GetBehaviorTreeList();

    // State Machine Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|State Machines")
    bool CreateStateMachine(const FString& MachineId, const FString& InitialState, const FString& StatesConfig);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|State Machines")
    bool UpdateStateMachine(const FString& MachineId, const FString& AgentId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|State Machines")
    bool ForceStateTransition(const FString& MachineId, const FString& AgentId, const FString& NewState);

    // Action and Condition Registration
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Callbacks")
    void RegisterAction(const FString& AgentId, const FString& ActionName, const FActionDelegate& Callback);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Callbacks")
    void RegisterCondition(const FString& AgentId, const FString& ConditionName, const FConditionDelegate& Callback);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Callbacks")
    void UnregisterAction(const FString& AgentId, const FString& ActionName);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Callbacks")
    void UnregisterCondition(const FString& AgentId, const FString& ConditionName);

    // Utility Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Utilities")
    FString VectorToJSON(const FVector& Vector);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Utilities")
    FVector JSONToVector(const FString& JSONString);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Utilities")
    FString CreateAgentConfig(const FString& AgentId, const FString& AgentType, const FVector& Position, const TMap<FString, FString>& Properties = TMap<FString, FString>());

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Utilities")
    FString GetSteamAIVersion();

    // Performance Monitoring
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Performance")
    FSteamAIPerformanceStats GetPerformanceStats() const { return PerformanceStats; }

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Performance")
    void ResetPerformanceStats();

    // Debug Functions
    UFUNCTION(BlueprintCallable, Category = "Steam AI|Debug")
    void SetDebugLogging(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Debug")
    TArray<FString> GetRegisteredAgents();

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Debug")
    FString GetAgentDebugInfo(const FString& AgentId);

    UFUNCTION(BlueprintCallable, Category = "Steam AI|Debug")
    bool TestJavaScriptExecution();

    // Internal callback handling
    bool HandleActionCallback(const FString& AgentId, const FString& ActionName, const FString& AgentData, const FString& BlackboardData);
    bool HandleConditionCallback(const FString& AgentId, const FString& ConditionName, const FString& AgentData, const FString& BlackboardData);

private:
    // Initialization state
    bool bIsInitialized = false;
    bool bInitializationInProgress = false;

    // JavaScript engine
#if WITH_V8
    TSharedPtr<class FV8Isolate> V8Isolate;
    TSharedPtr<class FV8Context> V8Context;
#endif

    // Callback storage
    TMap<FString, TMap<FString, FActionDelegate>> RegisteredActions; // AgentId -> ActionName -> Delegate
    TMap<FString, TMap<FString, FConditionDelegate>> RegisteredConditions; // AgentId -> ConditionName -> Delegate

    // Performance monitoring
    UPROPERTY(BlueprintReadOnly, Category = "Performance", meta = (AllowPrivateAccess = "true"))
    FSteamAIPerformanceStats PerformanceStats;

    float LastGCTime = 0.0f;
    float LastStatsUpdateTime = 0.0f;
    int32 ScriptCallsThisSecond = 0;

    // Internal functions
    void SetupJavaScriptEnvironment();
    bool LoadSteamAIPackage();
    void SetupUnrealBindings();
    void CleanupJavaScript();

    void UpdatePerformanceStats(float DeltaTime);
    void PerformPeriodicMaintenance(float DeltaTime);

    // V8-specific functions
#if WITH_V8
    bool InitializeV8Engine();
    void CleanupV8Engine();
    bool ExecuteV8Script(const FString& Script);
    FString ExecuteV8Function(const FString& FunctionName, const TArray<FString>& Parameters);
#endif

    // Fallback JavaScript execution (for when V8 is not available)
    bool InitializeFallbackEngine();
    void CleanupFallbackEngine();
    bool ExecuteFallbackScript(const FString& Script);
    FString ExecuteFallbackFunction(const FString& FunctionName, const TArray<FString>& Parameters);

    // Utility functions
    void LogAIMessage(const FString& Message, bool bIsError = false);
    double GetCurrentTimeMilliseconds() const;
    FString SanitizeJSONString(const FString& Input);

    // Static instance for callbacks
    static USteamAIBridge* StaticInstance;

public:
    static USteamAIBridge* GetStaticInstance() { return StaticInstance; }
};

/**
 * Subsystem for managing Steam AI across the entire game instance
 */
UCLASS()
class YOURPROJECT_API USteamAISubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // Subsystem Interface
    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    USteamAIBridge* GetAIBridge();

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    bool InitializeGlobalAI(const FSteamAIConfig& Config);

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    void RegisterAIAgent(class USteamAIAgent* Agent);

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    void UnregisterAIAgent(class USteamAIAgent* Agent);

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    TArray<class USteamAIAgent*> GetAllAIAgents();

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    FSteamAIPerformanceStats GetGlobalPerformanceStats();

    // Batch processing for performance
    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    void SetBatchProcessingEnabled(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    void SetAgentsPerBatch(int32 Count);

    UFUNCTION(BlueprintCallable, Category = "Steam AI Subsystem")
    void SetBatchUpdateInterval(float Interval);

private:
    UPROPERTY()
    USteamAIBridge* GlobalAIBridge;

    UPROPERTY()
    TArray<class USteamAIAgent*> RegisteredAgents;

    // Batch processing settings
    bool bBatchProcessingEnabled = true;
    int32 AgentsPerBatch = 10;
    float BatchUpdateInterval = 0.1f;
    int32 CurrentBatchIndex = 0;
    float LastBatchUpdateTime = 0.0f;

    virtual void Tick(float DeltaTime) override;
    virtual bool IsTickable() const override { return true; }
    virtual TStatId GetStatId() const override { RETURN_QUICK_DECLARE_CYCLE_STAT(USteamAISubsystem, STATGROUP_Tickables); }

    void ProcessAgentBatch();
};

// Helper macros for JavaScript integration
#define STEAM_AI_LOG(Format, ...) UE_LOG(LogSteamAI, Log, Format, ##__VA_ARGS__)
#define STEAM_AI_WARN(Format, ...) UE_LOG(LogSteamAI, Warning, Format, ##__VA_ARGS__)
#define STEAM_AI_ERROR(Format, ...) UE_LOG(LogSteamAI, Error, Format, ##__VA_ARGS__)

#define STEAM_AI_EXECUTE_SAFE(Bridge, Script) \
    if (Bridge && Bridge->IsInitialized()) \
    { \
        Bridge->ExecuteScript(Script); \
    } \
    else \
    { \
        STEAM_AI_ERROR(TEXT("Attempted to execute script on uninitialized AI Bridge")); \
    }