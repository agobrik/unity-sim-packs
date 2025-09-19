// Steam AI Bridge Implementation for Unreal Engine

#include "SteamAIBridge.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Misc/Paths.h"
#include "HAL/PlatformApplicationMisc.h"
#include "Misc/FileHelper.h"
#include "Misc/DateTime.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

DEFINE_LOG_CATEGORY(LogSteamAI);

// Static instance for JavaScript callbacks
USteamAIBridge* USteamAIBridge::StaticInstance = nullptr;

// USteamAIJSContext Implementation

void USteamAIJSContext::JSLog(const FString& Message)
{
    STEAM_AI_LOG(TEXT("[JS] %s"), *Message);
}

void USteamAIJSContext::JSWarn(const FString& Message)
{
    STEAM_AI_WARN(TEXT("[JS] %s"), *Message);
}

void USteamAIJSContext::JSError(const FString& Message)
{
    STEAM_AI_ERROR(TEXT("[JS] %s"), *Message);
}

float USteamAIJSContext::JSGetTime()
{
    if (UWorld* World = GEngine->GetWorldFromContextObject(GetBridgeInstance(), EGetWorldErrorMode::LogAndReturnNull))
    {
        return World->GetTimeSeconds();
    }
    return 0.0f;
}

float USteamAIJSContext::JSGetDeltaTime()
{
    if (UWorld* World = GEngine->GetWorldFromContextObject(GetBridgeInstance(), EGetWorldErrorMode::LogAndReturnNull))
    {
        return World->GetDeltaSeconds();
    }
    return 0.016f; // Default to ~60 FPS
}

FString USteamAIJSContext::JSCreateVector3(float X, float Y, float Z)
{
    TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
    JsonObject->SetNumberField(TEXT("x"), X);
    JsonObject->SetNumberField(TEXT("y"), Y);
    JsonObject->SetNumberField(TEXT("z"), Z);

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
    return OutputString;
}

float USteamAIJSContext::JSCalculateDistance(const FString& VectorA, const FString& VectorB)
{
    TSharedPtr<FJsonObject> JsonObjectA;
    TSharedPtr<FJsonObject> JsonObjectB;
    TSharedRef<TJsonReader<>> ReaderA = TJsonReaderFactory<>::Create(VectorA);
    TSharedRef<TJsonReader<>> ReaderB = TJsonReaderFactory<>::Create(VectorB);

    if (FJsonSerializer::Deserialize(ReaderA, JsonObjectA) && FJsonSerializer::Deserialize(ReaderB, JsonObjectB))
    {
        FVector VecA(
            JsonObjectA->GetNumberField(TEXT("x")),
            JsonObjectA->GetNumberField(TEXT("y")),
            JsonObjectA->GetNumberField(TEXT("z"))
        );
        FVector VecB(
            JsonObjectB->GetNumberField(TEXT("x")),
            JsonObjectB->GetNumberField(TEXT("y")),
            JsonObjectB->GetNumberField(TEXT("z"))
        );

        return FVector::Dist(VecA, VecB);
    }

    return 0.0f;
}

bool USteamAIJSContext::JSCallAction(const FString& AgentId, const FString& ActionName, const FString& AgentData, const FString& BlackboardData)
{
    if (USteamAIBridge* Bridge = GetBridgeInstance())
    {
        return Bridge->HandleActionCallback(AgentId, ActionName, AgentData, BlackboardData);
    }
    return false;
}

bool USteamAIJSContext::JSCallCondition(const FString& AgentId, const FString& ConditionName, const FString& AgentData, const FString& BlackboardData)
{
    if (USteamAIBridge* Bridge = GetBridgeInstance())
    {
        return Bridge->HandleConditionCallback(AgentId, ConditionName, AgentData, BlackboardData);
    }
    return false;
}

USteamAIBridge* USteamAIJSContext::GetBridgeInstance()
{
    return USteamAIBridge::GetStaticInstance();
}

// USteamAIBridge Implementation

USteamAIBridge::USteamAIBridge()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickInterval = 0.1f; // Tick every 100ms
    StaticInstance = this;
}

void USteamAIBridge::BeginPlay()
{
    Super::BeginPlay();

    if (!bInitializationInProgress)
    {
        InitializeAI();
    }
}

void USteamAIBridge::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (bIsInitialized)
    {
        UpdatePerformanceStats(DeltaTime);
        PerformPeriodicMaintenance(DeltaTime);
    }
}

void USteamAIBridge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    CleanupJavaScript();
    StaticInstance = nullptr;
    Super::EndPlay(EndPlayReason);
}

bool USteamAIBridge::InitializeAI()
{
    if (bIsInitialized || bInitializationInProgress)
    {
        return bIsInitialized;
    }

    bInitializationInProgress = true;

    STEAM_AI_LOG(TEXT("Initializing Steam AI Bridge..."));

    try
    {
        // Setup JavaScript environment
        SetupJavaScriptEnvironment();

        // Load Steam AI package
        if (!LoadSteamAIPackage())
        {
            STEAM_AI_ERROR(TEXT("Failed to load Steam AI package"));
            bInitializationInProgress = false;
            OnAIInitialized.Broadcast(false);
            return false;
        }

        // Setup Unreal-specific bindings
        SetupUnrealBindings();

        bIsInitialized = true;
        bInitializationInProgress = false;

        STEAM_AI_LOG(TEXT("Steam AI Bridge initialized successfully"));
        OnAIInitialized.Broadcast(true);

        return true;
    }
    catch (const std::exception& e)
    {
        FString ErrorMsg = FString::Printf(TEXT("Exception during AI initialization: %s"), UTF8_TO_TCHAR(e.what()));
        STEAM_AI_ERROR(TEXT("%s"), *ErrorMsg);
        OnAIError.Broadcast(ErrorMsg);
        bInitializationInProgress = false;
        OnAIInitialized.Broadcast(false);
        return false;
    }
}

void USteamAIBridge::SetupJavaScriptEnvironment()
{
#if WITH_V8
    if (Config.bUseV8Engine)
    {
        if (!InitializeV8Engine())
        {
            STEAM_AI_WARN(TEXT("V8 engine initialization failed, falling back to alternative"));
            InitializeFallbackEngine();
        }
    }
    else
#endif
    {
        InitializeFallbackEngine();
    }
}

bool USteamAIBridge::LoadSteamAIPackage()
{
    FString JavaScriptCode;
    FString FilePath = FPaths::ProjectContentDir() + Config.JavaScriptFilePath;

    if (!FFileHelper::LoadFileToString(JavaScriptCode, *FilePath))
    {
        // Try alternative paths
        TArray<FString> AlternativePaths = {
            FPaths::ProjectContentDir() + TEXT("JavaScript/steam-ai.js"),
            FPaths::ProjectContentDir() + TEXT("Scripts/steam-ai.js"),
            FPaths::ProjectDir() + TEXT("steam-ai.js")
        };

        bool bFileFound = false;
        for (const FString& AltPath : AlternativePaths)
        {
            if (FFileHelper::LoadFileToString(JavaScriptCode, *AltPath))
            {
                bFileFound = true;
                FilePath = AltPath;
                break;
            }
        }

        if (!bFileFound)
        {
            STEAM_AI_ERROR(TEXT("Steam AI package file not found at: %s"), *FilePath);
            return false;
        }
    }

    // Wrap the Steam AI code in a module-like structure
    FString WrappedCode = FString::Printf(TEXT(R"(
        (function() {
            // Module system
            var module = { exports: {} };
            var exports = module.exports;
            var global = this;
            var window = global;

            // Steam AI Package Code
            %s

            // Export to global scope
            if (typeof module !== 'undefined' && module.exports) {
                window.SteamAI = module.exports;
            }

            console.log('Steam AI package loaded successfully');
        }).call(this);
    )"), *JavaScriptCode);

    return ExecuteScript(WrappedCode);
}

void USteamAIBridge::SetupUnrealBindings()
{
    FString BindingScript = TEXT(R"(
        // Unreal Engine specific bindings
        window.Unreal = {
            log: function(message) {
                window.UnrealCallbacks.Log(String(message));
            },
            warn: function(message) {
                window.UnrealCallbacks.Warn(String(message));
            },
            error: function(message) {
                window.UnrealCallbacks.Error(String(message));
            },
            getTime: function() {
                return window.UnrealCallbacks.GetTime();
            },
            getDeltaTime: function() {
                return window.UnrealCallbacks.GetDeltaTime();
            },
            createVector3: function(x, y, z) {
                return JSON.parse(window.UnrealCallbacks.CreateVector3(x || 0, y || 0, z || 0));
            },
            calculateDistance: function(a, b) {
                return window.UnrealCallbacks.CalculateDistance(JSON.stringify(a), JSON.stringify(b));
            }
        };

        // Console compatibility
        if (typeof console === 'undefined') {
            window.console = {
                log: window.Unreal.log,
                warn: window.Unreal.warn,
                error: window.Unreal.error
            };
        }

        // Callback system for actions and conditions
        window.UnrealCallAction = function(agentId, actionName, agent, blackboard) {
            try {
                return window.UnrealCallbacks.CallAction(agentId, actionName, JSON.stringify(agent), JSON.stringify(blackboard));
            } catch (e) {
                console.error('Action callback error:', e.message);
                return false;
            }
        };

        window.UnrealCallCondition = function(agentId, conditionName, agent, blackboard) {
            try {
                return window.UnrealCallbacks.CallCondition(agentId, conditionName, JSON.stringify(agent), JSON.stringify(blackboard));
            } catch (e) {
                console.error('Condition callback error:', e.message);
                return false;
            }
        };

        // Initialize Steam AI components
        if (typeof window.SteamAI !== 'undefined') {
            const { AgentManager, BehaviorTreeEngine, StateMachineEngine } = window.SteamAI;

            window.agentManager = new AgentManager();
            window.behaviorTreeEngine = new BehaviorTreeEngine();
            window.stateMachineEngine = new StateMachineEngine();

            // Global storage
            window.agents = {};
            window.behaviorTrees = {};
            window.stateMachines = {};

            console.log('Steam AI components initialized');
        } else {
            console.error('Steam AI package not found');
        }
    )");

    ExecuteScript(BindingScript);
}

bool USteamAIBridge::ExecuteScript(const FString& Script)
{
    if (!bIsInitialized)
    {
        STEAM_AI_ERROR(TEXT("Attempting to execute script on uninitialized bridge"));
        return false;
    }

    double StartTime = GetCurrentTimeMilliseconds();

#if WITH_V8
    if (Config.bUseV8Engine && V8Context.IsValid())
    {
        bool bResult = ExecuteV8Script(Script);

        if (Config.bEnablePerformanceMonitoring)
        {
            PerformanceStats.ScriptExecutionTimeMs = GetCurrentTimeMilliseconds() - StartTime;
            ScriptCallsThisSecond++;
        }

        return bResult;
    }
    else
#endif
    {
        bool bResult = ExecuteFallbackScript(Script);

        if (Config.bEnablePerformanceMonitoring)
        {
            PerformanceStats.ScriptExecutionTimeMs = GetCurrentTimeMilliseconds() - StartTime;
            ScriptCallsThisSecond++;
        }

        return bResult;
    }
}

FString USteamAIBridge::ExecuteFunction(const FString& FunctionName, const TArray<FString>& Parameters)
{
    if (!bIsInitialized)
    {
        STEAM_AI_ERROR(TEXT("Attempting to execute function on uninitialized bridge"));
        return TEXT("");
    }

    double StartTime = GetCurrentTimeMilliseconds();

#if WITH_V8
    if (Config.bUseV8Engine && V8Context.IsValid())
    {
        FString Result = ExecuteV8Function(FunctionName, Parameters);

        if (Config.bEnablePerformanceMonitoring)
        {
            PerformanceStats.ScriptExecutionTimeMs = GetCurrentTimeMilliseconds() - StartTime;
            ScriptCallsThisSecond++;
        }

        return Result;
    }
    else
#endif
    {
        FString Result = ExecuteFallbackFunction(FunctionName, Parameters);

        if (Config.bEnablePerformanceMonitoring)
        {
            PerformanceStats.ScriptExecutionTimeMs = GetCurrentTimeMilliseconds() - StartTime;
            ScriptCallsThisSecond++;
        }

        return Result;
    }
}

bool USteamAIBridge::CreateAgent(const FString& AgentId, const FString& AgentConfig)
{
    FString Script = FString::Printf(TEXT(R"(
        if (window.agentManager) {
            try {
                const config = %s;
                const agent = window.agentManager.createAgent('%s', config);
                window.agents['%s'] = agent;
                true;
            } catch (e) {
                console.error('Failed to create agent:', e.message);
                false;
            }
        } else {
            console.error('Agent manager not initialized');
            false;
        }
    )"), *AgentConfig, *AgentId, *AgentId);

    FString Result = ExecuteFunction(TEXT("(function() { return ") + Script + TEXT(" })"), TArray<FString>());
    return Result.Contains(TEXT("true"));
}

bool USteamAIBridge::CreateBehaviorTree(const FString& TreeId, const FString& TreeConfig)
{
    FString Script = FString::Printf(TEXT(R"(
        if (window.behaviorTreeEngine) {
            try {
                const config = %s;
                window.behaviorTreeEngine.createTree('%s', config);
                window.behaviorTrees['%s'] = config;
                true;
            } catch (e) {
                console.error('Failed to create behavior tree:', e.message);
                false;
            }
        } else {
            console.error('Behavior tree engine not initialized');
            false;
        }
    )"), *TreeConfig, *TreeId, *TreeId);

    FString Result = ExecuteFunction(TEXT("(function() { return ") + Script + TEXT(" })"), TArray<FString>());
    return Result.Contains(TEXT("true"));
}

FString USteamAIBridge::ExecuteBehaviorTree(const FString& TreeId, const FString& AgentId)
{
    double StartTime = GetCurrentTimeMilliseconds();

    FString Script = FString::Printf(TEXT(R"(
        if (window.behaviorTreeEngine && window.agents['%s']) {
            try {
                const status = window.behaviorTreeEngine.executeTree('%s', window.agents['%s']);
                String(status);
            } catch (e) {
                console.error('Failed to execute behavior tree:', e.message);
                'FAILURE';
            }
        } else {
            'INVALID';
        }
    )"), *AgentId, *TreeId, *AgentId);

    FString Result = ExecuteFunction(TEXT("(function() { return ") + Script + TEXT(" })"), TArray<FString>());

    if (Config.bEnablePerformanceMonitoring)
    {
        PerformanceStats.TreeExecutionTimeMs = GetCurrentTimeMilliseconds() - StartTime;
    }

    // Broadcast execution event
    OnTreeExecuted.Broadcast(TreeId, Result);

    return Result;
}

bool USteamAIBridge::SetAgentMemory(const FString& AgentId, const FString& Key, const FString& Value)
{
    FString Script = FString::Printf(TEXT(R"(
        if (window.agentManager && window.agents['%s']) {
            try {
                window.agentManager.updateAgentMemory('%s', '%s', %s);
                true;
            } catch (e) {
                console.error('Failed to set agent memory:', e.message);
                false;
            }
        } else {
            false;
        }
    )"), *AgentId, *AgentId, *Key, *Value);

    FString Result = ExecuteFunction(TEXT("(function() { return ") + Script + TEXT(" })"), TArray<FString>());
    return Result.Contains(TEXT("true"));
}

void USteamAIBridge::ForceGarbageCollection()
{
    ExecuteScript(TEXT("if (typeof gc !== 'undefined') { gc(); }"));
    LastGCTime = GetWorld()->GetTimeSeconds();
}

bool USteamAIBridge::HandleActionCallback(const FString& AgentId, const FString& ActionName, const FString& AgentData, const FString& BlackboardData)
{
    if (RegisteredActions.Contains(AgentId))
    {
        const TMap<FString, FActionDelegate>& AgentActions = RegisteredActions[AgentId];
        if (AgentActions.Contains(ActionName))
        {
            const FActionDelegate& Callback = AgentActions[ActionName];
            if (Callback.IsBound())
            {
                return Callback.ExecuteIfBound(AgentData, BlackboardData);
            }
        }
    }

    STEAM_AI_WARN(TEXT("No action callback found for agent %s, action %s"), *AgentId, *ActionName);
    return false;
}

bool USteamAIBridge::HandleConditionCallback(const FString& AgentId, const FString& ConditionName, const FString& AgentData, const FString& BlackboardData)
{
    if (RegisteredConditions.Contains(AgentId))
    {
        const TMap<FString, FConditionDelegate>& AgentConditions = RegisteredConditions[AgentId];
        if (AgentConditions.Contains(ConditionName))
        {
            const FConditionDelegate& Callback = AgentConditions[ConditionName];
            if (Callback.IsBound())
            {
                return Callback.ExecuteIfBound(AgentData, BlackboardData);
            }
        }
    }

    STEAM_AI_WARN(TEXT("No condition callback found for agent %s, condition %s"), *AgentId, *ConditionName);
    return false;
}

void USteamAIBridge::RegisterAction(const FString& AgentId, const FString& ActionName, const FActionDelegate& Callback)
{
    if (!RegisteredActions.Contains(AgentId))
    {
        RegisteredActions.Add(AgentId, TMap<FString, FActionDelegate>());
    }

    RegisteredActions[AgentId].Add(ActionName, Callback);

    STEAM_AI_LOG(TEXT("Registered action %s for agent %s"), *ActionName, *AgentId);
}

void USteamAIBridge::RegisterCondition(const FString& AgentId, const FString& ConditionName, const FConditionDelegate& Callback)
{
    if (!RegisteredConditions.Contains(AgentId))
    {
        RegisteredConditions.Add(AgentId, TMap<FString, FConditionDelegate>());
    }

    RegisteredConditions[AgentId].Add(ConditionName, Callback);

    STEAM_AI_LOG(TEXT("Registered condition %s for agent %s"), *ConditionName, *AgentId);
}

FString USteamAIBridge::VectorToJSON(const FVector& Vector)
{
    return FString::Printf(TEXT("{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f}"), Vector.X, Vector.Y, Vector.Z);
}

FVector USteamAIBridge::JSONToVector(const FString& JSONString)
{
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JSONString);

    if (FJsonSerializer::Deserialize(Reader, JsonObject) && JsonObject.IsValid())
    {
        return FVector(
            JsonObject->GetNumberField(TEXT("x")),
            JsonObject->GetNumberField(TEXT("y")),
            JsonObject->GetNumberField(TEXT("z"))
        );
    }

    return FVector::ZeroVector;
}

FString USteamAIBridge::CreateAgentConfig(const FString& AgentId, const FString& AgentType, const FVector& Position, const TMap<FString, FString>& Properties)
{
    TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
    JsonObject->SetStringField(TEXT("id"), AgentId);
    JsonObject->SetStringField(TEXT("agentType"), AgentType);

    TSharedPtr<FJsonObject> PositionObj = MakeShareable(new FJsonObject);
    PositionObj->SetNumberField(TEXT("x"), Position.X);
    PositionObj->SetNumberField(TEXT("y"), Position.Y);
    PositionObj->SetNumberField(TEXT("z"), Position.Z);
    JsonObject->SetObjectField(TEXT("position"), PositionObj);

    if (Properties.Num() > 0)
    {
        TSharedPtr<FJsonObject> PropertiesObj = MakeShareable(new FJsonObject);
        for (const auto& Property : Properties)
        {
            PropertiesObj->SetStringField(Property.Key, Property.Value);
        }
        JsonObject->SetObjectField(TEXT("properties"), PropertiesObj);
    }

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
    return OutputString;
}

void USteamAIBridge::UpdatePerformanceStats(float DeltaTime)
{
    if (!Config.bEnablePerformanceMonitoring)
        return;

    static float StatsUpdateInterval = 1.0f;
    LastStatsUpdateTime += DeltaTime;

    if (LastStatsUpdateTime >= StatsUpdateInterval)
    {
        PerformanceStats.ScriptCallsPerSecond = ScriptCallsThisSecond;
        PerformanceStats.ActiveAgents = RegisteredActions.Num();
        PerformanceStats.ActiveTrees = 0; // Would need to query JavaScript for this

        ScriptCallsThisSecond = 0;
        LastStatsUpdateTime = 0.0f;
    }
}

void USteamAIBridge::PerformPeriodicMaintenance(float DeltaTime)
{
    float CurrentTime = GetWorld()->GetTimeSeconds();

    // Garbage collection
    if (CurrentTime - LastGCTime >= Config.GarbageCollectionInterval)
    {
        ForceGarbageCollection();
    }
}

void USteamAIBridge::CleanupJavaScript()
{
    if (!bIsInitialized)
        return;

    STEAM_AI_LOG(TEXT("Cleaning up Steam AI Bridge..."));

    // Clear all registered callbacks
    RegisteredActions.Empty();
    RegisteredConditions.Empty();

    // Cleanup JavaScript engines
#if WITH_V8
    if (Config.bUseV8Engine)
    {
        CleanupV8Engine();
    }
    else
#endif
    {
        CleanupFallbackEngine();
    }

    bIsInitialized = false;
    STEAM_AI_LOG(TEXT("Steam AI Bridge cleanup complete"));
}

double USteamAIBridge::GetCurrentTimeMilliseconds() const
{
    return FDateTime::Now().GetTicks() / ETimespan::TicksPerMillisecond;
}

void USteamAIBridge::LogAIMessage(const FString& Message, bool bIsError)
{
    if (Config.bEnableDebugLogging)
    {
        if (bIsError)
        {
            STEAM_AI_ERROR(TEXT("%s"), *Message);
            OnAIError.Broadcast(Message);
        }
        else
        {
            STEAM_AI_LOG(TEXT("%s"), *Message);
        }
    }
}

// V8-specific implementations (placeholder - would need actual V8 integration)
#if WITH_V8
bool USteamAIBridge::InitializeV8Engine()
{
    // V8 initialization code would go here
    // This is a placeholder implementation
    STEAM_AI_LOG(TEXT("V8 engine initialization not fully implemented"));
    return false;
}

void USteamAIBridge::CleanupV8Engine()
{
    // V8 cleanup code would go here
}

bool USteamAIBridge::ExecuteV8Script(const FString& Script)
{
    // V8 script execution would go here
    return false;
}

FString USteamAIBridge::ExecuteV8Function(const FString& FunctionName, const TArray<FString>& Parameters)
{
    // V8 function execution would go here
    return TEXT("");
}
#endif

// Fallback implementations for when V8 is not available
bool USteamAIBridge::InitializeFallbackEngine()
{
    STEAM_AI_LOG(TEXT("Using fallback JavaScript engine (limited functionality)"));
    return true;
}

void USteamAIBridge::CleanupFallbackEngine()
{
    // Cleanup fallback engine resources
}

bool USteamAIBridge::ExecuteFallbackScript(const FString& Script)
{
    // Basic fallback - just log the script execution
    if (Config.bEnableDebugLogging)
    {
        STEAM_AI_LOG(TEXT("Fallback script execution: %s"), *Script.Left(100));
    }
    return true;
}

FString USteamAIBridge::ExecuteFallbackFunction(const FString& FunctionName, const TArray<FString>& Parameters)
{
    // Basic fallback - return empty result
    if (Config.bEnableDebugLogging)
    {
        STEAM_AI_LOG(TEXT("Fallback function execution: %s"), *FunctionName);
    }
    return TEXT("");
}

// USteamAISubsystem Implementation

void USteamAISubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    STEAM_AI_LOG(TEXT("Steam AI Subsystem initialized"));
}

void USteamAISubsystem::Deinitialize()
{
    RegisteredAgents.Empty();
    GlobalAIBridge = nullptr;

    Super::Deinitialize();
}

USteamAIBridge* USteamAISubsystem::GetAIBridge()
{
    return GlobalAIBridge;
}

bool USteamAISubsystem::InitializeGlobalAI(const FSteamAIConfig& Config)
{
    if (!GlobalAIBridge)
    {
        // Create a global AI bridge (this would typically be attached to a persistent actor)
        // For now, we'll just store the config and create the bridge when needed
        STEAM_AI_LOG(TEXT("Global AI configuration set"));
        return true;
    }

    return GlobalAIBridge->InitializeAI();
}