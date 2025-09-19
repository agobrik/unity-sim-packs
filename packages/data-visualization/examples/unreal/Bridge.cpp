#include "DataVisualizationBridge.h"
#include "Engine/World.h"
#include "TimerManager.h"
#include "HAL/PlatformMemory.h"
#include "Misc/Paths.h"

DEFINE_LOG_CATEGORY_STATIC(LogDataVisualization, Log, All);

UDataVisualizationBridge::UDataVisualizationBridge()
{
    // Default configuration
    bEnableDebugMode = false;
    PackagePath = TEXT("Content/JavaScript/node_modules/@steamproject/data-visualization");
    MemoryLimit = 50 * 1024 * 1024; // 50MB
    bAutoCleanup = true;
    bEnableBatchUpdates = true;
    BatchInterval = 0.1f; // 100ms
    MaxDataPointsPerChart = 1000;

    // Internal state
    bIsInitialized = false;
    LastBatchTime = 0.0f;
    PerformanceStats = MakeShareable(new FJsonObject);

    // Initialize collections
    Charts.Empty();
    Dashboards.Empty();
    PendingUpdates.Empty();
}

UDataVisualizationBridge::~UDataVisualizationBridge()
{
    Dispose();
}

bool UDataVisualizationBridge::Initialize()
{
    if (bIsInitialized)
    {
        return true;
    }

    UE_LOG(LogDataVisualization, Log, TEXT("Initializing Data Visualization Bridge..."));

    // Initialize JavaScript engine
    if (!InitializeJavaScriptEngine())
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to initialize JavaScript engine"));
        return false;
    }

    // Load the data visualization package
    if (!LoadDataVisualizationPackage())
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to load data visualization package"));
        return false;
    }

    // Set up event handlers
    SetupEventHandlers();

    bIsInitialized = true;
    UE_LOG(LogDataVisualization, Log, TEXT("Data Visualization Bridge initialized successfully"));

    return true;
}

bool UDataVisualizationBridge::InitializeJavaScriptEngine()
{
#if WITH_V8
    try
    {
        // Create V8 engine with optimized settings
        JavaScriptEngine = MakeShareable(new FV8Engine());
        if (!JavaScriptEngine.IsValid())
        {
            UE_LOG(LogDataVisualization, Error, TEXT("Failed to create V8 engine"));
            return false;
        }

        // Initialize the engine
        if (!JavaScriptEngine->Initialize())
        {
            UE_LOG(LogDataVisualization, Error, TEXT("Failed to initialize V8 engine"));
            return false;
        }

        // Create JavaScript context
        JavaScriptContext = JavaScriptEngine->CreateContext();
        if (!JavaScriptContext.IsValid())
        {
            UE_LOG(LogDataVisualization, Error, TEXT("Failed to create V8 context"));
            return false;
        }

        // Add Unreal-specific objects to JavaScript context
        UUnrealBridgeObject* UnrealBridge = NewObject<UUnrealBridgeObject>();
        UnrealBridge->Initialize(this);
        JavaScriptContext->SetGlobalObject(TEXT("Unreal"), UnrealBridge);

        UDebugBridgeObject* DebugBridge = NewObject<UDebugBridgeObject>();
        JavaScriptContext->SetGlobalObject(TEXT("Debug"), DebugBridge);

        UTimeBridgeObject* TimeBridge = NewObject<UTimeBridgeObject>();
        JavaScriptContext->SetGlobalObject(TEXT("Time"), TimeBridge);

        // Add basic JavaScript utilities
        FString UtilityScript = TEXT(R"(
            global.console = {
                log: function(msg) { Unreal.Log(msg); },
                warn: function(msg) { Unreal.LogWarning(msg); },
                error: function(msg) { Unreal.LogError(msg); }
            };

            global.setTimeout = function(callback, delay) {
                Unreal.SetTimeout(callback.toString(), delay);
            };

            global.setInterval = function(callback, interval) {
                return Unreal.SetInterval(callback.toString(), interval);
            };

            global.Date = {
                now: function() { return Unreal.GetUnixTimestamp(); }
            };
        )");

        JavaScriptContext->ExecuteScript(UtilityScript);

        UE_LOG(LogDataVisualization, Log, TEXT("V8 JavaScript engine initialized successfully"));
        return true;
    }
    catch (const std::exception& e)
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Exception during V8 initialization: %s"), UTF8_TO_TCHAR(e.what()));
        return false;
    }
#else
    UE_LOG(LogDataVisualization, Error, TEXT("V8 JavaScript engine not available. Please enable V8 plugin."));
    return false;
#endif
}

bool UDataVisualizationBridge::LoadDataVisualizationPackage()
{
    // Construct full path to the package
    FString PackageFullPath = FPaths::ProjectContentDir() / TEXT("JavaScript/node_modules/@steamproject/data-visualization");
    FString MainFile = PackageFullPath / TEXT("dist/index.js");

    // Check if package exists
    if (!FPaths::FileExists(MainFile))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Data visualization package not found at: %s"), *MainFile);
        UE_LOG(LogDataVisualization, Error, TEXT("Please run 'npm install @steamproject/data-visualization' in Content/JavaScript/"));
        return false;
    }

    // Load the main package file
    FString PackageCode;
    if (!FFileHelper::LoadFileToString(PackageCode, *MainFile))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to load package file: %s"), *MainFile);
        return false;
    }

    // Execute the package code
    FString Result = ExecuteJavaScript(PackageCode);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Error executing package code: %s"), *Result);
        return false;
    }

    // Initialize the visualization manager
    FString InitScript = FString::Printf(TEXT(R"(
        if (typeof DataVisualizationManager === 'undefined') {
            throw new Error('DataVisualizationManager not found in package');
        }

        global.vizManager = new DataVisualizationManager({
            debug: %s,
            autoCleanup: %s,
            memoryLimit: %d,
            maxDataPointsPerChart: %d,
            platform: 'unreal'
        });

        // Set up event handlers
        global.vizManager.on('thresholdCrossed', function(data) {
            Unreal.OnThresholdCrossed(data.chartId, JSON.stringify(data));
        });

        global.vizManager.on('dataPointAdded', function(data) {
            Unreal.OnDataPointAdded(data.chartId, JSON.stringify(data));
        });

        global.vizManager.on('error', function(error) {
            Unreal.OnChartError(error.chartId, error.message);
        });

        console.log('Data Visualization Manager initialized for Unreal Engine');
    )"),
        bEnableDebugMode ? TEXT("true") : TEXT("false"),
        bAutoCleanup ? TEXT("true") : TEXT("false"),
        MemoryLimit,
        MaxDataPointsPerChart
    );

    Result = ExecuteJavaScript(InitScript);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Error initializing visualization manager: %s"), *Result);
        return false;
    }

    UE_LOG(LogDataVisualization, Log, TEXT("Data visualization package loaded successfully"));
    return true;
}

void UDataVisualizationBridge::SetupEventHandlers()
{
    // Event handlers are set up in the JavaScript initialization script
    // The JavaScript code will call our Unreal bridge methods
}

FString UDataVisualizationBridge::ExecuteJavaScript(const FString& Script)
{
#if WITH_V8
    if (!JavaScriptContext.IsValid())
    {
        return TEXT("ERROR: JavaScript context not available");
    }

    try
    {
        FV8Value Result = JavaScriptContext->ExecuteScript(Script);

        if (Result.IsString())
        {
            return Result.ToString();
        }
        else if (Result.IsUndefined() || Result.IsNull())
        {
            return TEXT("SUCCESS");
        }
        else
        {
            return TEXT("SUCCESS: ") + Result.ToString();
        }
    }
    catch (const std::exception& e)
    {
        return FString::Printf(TEXT("ERROR: %s"), UTF8_TO_TCHAR(e.what()));
    }
#else
    return TEXT("ERROR: V8 not available");
#endif
}

void UDataVisualizationBridge::ExecuteJavaScriptAsync(const FString& Script)
{
    // Create async task for JavaScript execution
    (new FAsyncTask<FDataVisualizationAsyncTask>(this, Script))->StartBackgroundTask();
}

// Chart Creation Methods

void UDataVisualizationBridge::CreateLineChart(const FString& ChartId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createLineChart('%s', %s);"), *ChartId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Add(ChartId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created line chart: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create line chart '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::CreateBarChart(const FString& ChartId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createBarChart('%s', %s);"), *ChartId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Add(ChartId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created bar chart: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create bar chart '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::CreatePieChart(const FString& ChartId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createPieChart('%s', %s);"), *ChartId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Add(ChartId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created pie chart: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create pie chart '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::CreateHeatmap(const FString& ChartId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createHeatmap('%s', %s);"), *ChartId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Add(ChartId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created heatmap: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create heatmap '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::CreateGauge(const FString& ChartId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createGauge('%s', %s);"), *ChartId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Add(ChartId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created gauge: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create gauge '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::CreateDashboard(const FString& DashboardId, TSharedPtr<FJsonObject> Config)
{
    if (!bIsInitialized) return;

    FString ConfigJson = JsonObjectToString(Config);
    FString Script = FString::Printf(TEXT("global.vizManager.createDashboard('%s', %s);"), *DashboardId, *ConfigJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        Dashboards.Add(DashboardId, Config);
        UE_LOG(LogDataVisualization, Log, TEXT("Created dashboard: %s"), *DashboardId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to create dashboard '%s': %s"), *DashboardId, *Result);
    }
}

// Blueprint-friendly chart creation methods

void UDataVisualizationBridge::CreateSimpleLineChart(const FString& ChartId, const FString& Title, int32 MaxPoints)
{
    TSharedPtr<FJsonObject> Config = MakeShareable(new FJsonObject);
    Config->SetStringField(TEXT("title"), Title);
    Config->SetNumberField(TEXT("maxDataPoints"), MaxPoints);
    Config->SetBoolField(TEXT("realTime"), true);

    TSharedPtr<FJsonObject> YAxis = MakeShareable(new FJsonObject);
    YAxis->SetNumberField(TEXT("min"), 0);
    YAxis->SetNumberField(TEXT("max"), 100);
    Config->SetObjectField(TEXT("yAxis"), YAxis);

    CreateLineChart(ChartId, Config);
}

void UDataVisualizationBridge::CreateSimpleBarChart(const FString& ChartId, const FString& Title, bool bHorizontal)
{
    TSharedPtr<FJsonObject> Config = MakeShareable(new FJsonObject);
    Config->SetStringField(TEXT("title"), Title);
    Config->SetBoolField(TEXT("horizontal"), bHorizontal);

    CreateBarChart(ChartId, Config);
}

void UDataVisualizationBridge::CreateSimpleGauge(const FString& ChartId, const FString& Title, float MinValue, float MaxValue)
{
    TSharedPtr<FJsonObject> Config = MakeShareable(new FJsonObject);
    Config->SetStringField(TEXT("title"), Title);
    Config->SetNumberField(TEXT("min"), MinValue);
    Config->SetNumberField(TEXT("max"), MaxValue);

    CreateGauge(ChartId, Config);
}

// Data Update Methods

void UDataVisualizationBridge::UpdateChart(const FString& ChartId, int64 Timestamp, float Value)
{
    if (!bIsInitialized) return;

    if (bEnableBatchUpdates)
    {
        FBatchUpdateData Update;
        Update.ChartId = ChartId;
        Update.Method = TEXT("updateSingleData");
        Update.Data = FString::Printf(TEXT("{\"timestamp\": %lld, \"value\": %f}"), Timestamp, Value);
        Update.Timestamp = FPlatformTime::Seconds();

        PendingUpdates.Add(Update);
    }
    else
    {
        UpdateChartImmediate(ChartId, Timestamp, Value);
    }
}

void UDataVisualizationBridge::UpdateChartMultiData(const FString& ChartId, TSharedPtr<FJsonObject> Data)
{
    if (!bIsInitialized) return;

    if (bEnableBatchUpdates)
    {
        FBatchUpdateData Update;
        Update.ChartId = ChartId;
        Update.Method = TEXT("updateMultiData");
        Update.Data = JsonObjectToString(Data);
        Update.Timestamp = FPlatformTime::Seconds();

        PendingUpdates.Add(Update);
    }
    else
    {
        UpdateChartMultiDataImmediate(ChartId, Data);
    }
}

void UDataVisualizationBridge::UpdateChartArray(const FString& ChartId, const TArray<TSharedPtr<FJsonValue>>& Data)
{
    if (!bIsInitialized) return;

    if (bEnableBatchUpdates)
    {
        FBatchUpdateData Update;
        Update.ChartId = ChartId;
        Update.Method = TEXT("updateArrayData");
        Update.Data = JsonValueArrayToString(Data);
        Update.Timestamp = FPlatformTime::Seconds();

        PendingUpdates.Add(Update);
    }
    else
    {
        UpdateChartArrayDataImmediate(ChartId, Data);
    }
}

void UDataVisualizationBridge::UpdateDashboard(const FString& DashboardId, TSharedPtr<FJsonObject> Data)
{
    if (!bIsInitialized) return;

    FString DataJson = JsonObjectToString(Data);
    FString Script = FString::Printf(TEXT("global.vizManager.updateDashboard('%s', %s);"), *DashboardId, *DataJson);

    FString Result = ExecuteJavaScript(Script);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to update dashboard '%s': %s"), *DashboardId, *Result);
    }
}

// Blueprint-friendly update methods

void UDataVisualizationBridge::UpdateChartWithValue(const FString& ChartId, float Value)
{
    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();
    UpdateChart(ChartId, Timestamp, Value);
}

void UDataVisualizationBridge::UpdateGauge(const FString& ChartId, float Value)
{
    UpdateChartWithValue(ChartId, Value);
}

// Immediate update methods (bypassing batch system)

void UDataVisualizationBridge::UpdateChartImmediate(const FString& ChartId, int64 Timestamp, float Value)
{
    FString Script = FString::Printf(TEXT("global.vizManager.updateChart('%s', %lld, %f);"), *ChartId, Timestamp, Value);

    FString Result = ExecuteJavaScript(Script);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to update chart '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::UpdateChartMultiDataImmediate(const FString& ChartId, TSharedPtr<FJsonObject> Data)
{
    FString DataJson = JsonObjectToString(Data);
    FString Script = FString::Printf(TEXT("global.vizManager.updateChartMultiData('%s', %s);"), *ChartId, *DataJson);

    FString Result = ExecuteJavaScript(Script);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to update chart multi-data '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::UpdateChartArrayDataImmediate(const FString& ChartId, const TArray<TSharedPtr<FJsonValue>>& Data)
{
    FString DataJson = JsonValueArrayToString(Data);
    FString Script = FString::Printf(TEXT("global.vizManager.updateChartArrayData('%s', %s);"), *ChartId, *DataJson);

    FString Result = ExecuteJavaScript(Script);
    if (Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to update chart array data '%s': %s"), *ChartId, *Result);
    }
}

// Batch Update System

void UDataVisualizationBridge::Tick(float DeltaTime)
{
    if (bEnableBatchUpdates && (FPlatformTime::Seconds() - LastBatchTime) >= BatchInterval)
    {
        ProcessBatchedUpdates();
        LastBatchTime = FPlatformTime::Seconds();
    }
}

void UDataVisualizationBridge::ProcessBatchedUpdates()
{
    if (PendingUpdates.Num() == 0) return;

    // Group updates by chart ID for efficiency
    TMap<FString, TArray<FBatchUpdateData>> GroupedUpdates;

    for (const FBatchUpdateData& Update : PendingUpdates)
    {
        if (!GroupedUpdates.Contains(Update.ChartId))
        {
            GroupedUpdates.Add(Update.ChartId, TArray<FBatchUpdateData>());
        }
        GroupedUpdates[Update.ChartId].Add(Update);
    }

    // Process updates for each chart
    for (const auto& ChartUpdates : GroupedUpdates)
    {
        const FString& ChartId = ChartUpdates.Key;
        const TArray<FBatchUpdateData>& Updates = ChartUpdates.Value;

        // Build batch update script
        FString BatchScript = FString::Printf(TEXT("global.vizManager.startBatch('%s');"), *ChartId);

        for (const FBatchUpdateData& Update : Updates)
        {
            if (Update.Method == TEXT("updateSingleData"))
            {
                BatchScript += FString::Printf(TEXT("global.vizManager.batchUpdateSingle('%s', %s);"), *ChartId, *Update.Data);
            }
            else if (Update.Method == TEXT("updateMultiData"))
            {
                BatchScript += FString::Printf(TEXT("global.vizManager.batchUpdateMulti('%s', %s);"), *ChartId, *Update.Data);
            }
            else if (Update.Method == TEXT("updateArrayData"))
            {
                BatchScript += FString::Printf(TEXT("global.vizManager.batchUpdateArray('%s', %s);"), *ChartId, *Update.Data);
            }
        }

        BatchScript += FString::Printf(TEXT("global.vizManager.commitBatch('%s');"), *ChartId);

        FString Result = ExecuteJavaScript(BatchScript);
        if (Result.Contains(TEXT("ERROR")))
        {
            UE_LOG(LogDataVisualization, Error, TEXT("Failed to process batched updates for '%s': %s"), *ChartId, *Result);
        }
    }

    PendingUpdates.Empty();
}

void UDataVisualizationBridge::ProcessPendingUpdates()
{
    ProcessBatchedUpdates();
}

void UDataVisualizationBridge::ApplyBatchedUpdates(const TArray<FBatchUpdateData>& Updates)
{
    PendingUpdates.Append(Updates);
    ProcessBatchedUpdates();
}

// Configuration Methods

void UDataVisualizationBridge::SetTheme(TSharedPtr<FJsonObject> Theme)
{
    if (!bIsInitialized) return;

    FString ThemeJson = JsonObjectToString(Theme);
    FString Script = FString::Printf(TEXT("global.vizManager.setTheme(%s);"), *ThemeJson);

    FString Result = ExecuteJavaScript(Script);
    if (!Result.Contains(TEXT("ERROR")))
    {
        UE_LOG(LogDataVisualization, Log, TEXT("Theme applied successfully"));
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to set theme: %s"), *Result);
    }
}

void UDataVisualizationBridge::SetDebugMode(bool bEnabled)
{
    bEnableDebugMode = bEnabled;

    if (bIsInitialized)
    {
        FString Script = FString::Printf(TEXT("global.vizManager.setDebugMode(%s);"), bEnabled ? TEXT("true") : TEXT("false"));
        ExecuteJavaScript(Script);
    }
}

void UDataVisualizationBridge::SetLogLevel(const FString& Level)
{
    if (!bIsInitialized) return;

    FString Script = FString::Printf(TEXT("global.vizManager.setLogLevel('%s');"), *Level);
    ExecuteJavaScript(Script);
}

void UDataVisualizationBridge::ShowPerformanceStats(bool bShow)
{
    if (!bIsInitialized) return;

    FString Script = FString::Printf(TEXT("global.vizManager.showPerformanceStats(%s);"), bShow ? TEXT("true") : TEXT("false"));
    ExecuteJavaScript(Script);
}

void UDataVisualizationBridge::SetMemoryLimit(int32 LimitBytes)
{
    MemoryLimit = LimitBytes;

    if (bIsInitialized)
    {
        FString Script = FString::Printf(TEXT("global.vizManager.setMemoryLimit(%d);"), LimitBytes);
        ExecuteJavaScript(Script);
    }
}

void UDataVisualizationBridge::EnableAutoCleanup(bool bEnabled)
{
    bAutoCleanup = bEnabled;

    if (bIsInitialized)
    {
        FString Script = FString::Printf(TEXT("global.vizManager.enableAutoCleanup(%s);"), bEnabled ? TEXT("true") : TEXT("false"));
        ExecuteJavaScript(Script);
    }
}

void UDataVisualizationBridge::EnableBatchUpdates(bool bEnabled)
{
    bEnableBatchUpdates = bEnabled;
}

void UDataVisualizationBridge::SetBatchInterval(float Interval)
{
    BatchInterval = Interval;
}

void UDataVisualizationBridge::SetMaxDataPointsPerChart(int32 MaxPoints)
{
    MaxDataPointsPerChart = MaxPoints;
}

// Chart Management

void UDataVisualizationBridge::RemoveChart(const FString& ChartId)
{
    if (!bIsInitialized) return;

    FString Script = FString::Printf(TEXT("global.vizManager.removeChart('%s');"), *ChartId);
    FString Result = ExecuteJavaScript(Script);

    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Remove(ChartId);
        UE_LOG(LogDataVisualization, Log, TEXT("Removed chart: %s"), *ChartId);
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to remove chart '%s': %s"), *ChartId, *Result);
    }
}

void UDataVisualizationBridge::ClearAllCharts()
{
    if (!bIsInitialized) return;

    FString Script = TEXT("global.vizManager.clearAllCharts();");
    FString Result = ExecuteJavaScript(Script);

    if (!Result.Contains(TEXT("ERROR")))
    {
        Charts.Empty();
        Dashboards.Empty();
        UE_LOG(LogDataVisualization, Log, TEXT("Cleared all charts"));
    }
    else
    {
        UE_LOG(LogDataVisualization, Error, TEXT("Failed to clear all charts: %s"), *Result);
    }
}

// Utility Methods

TSharedPtr<FJsonObject> UDataVisualizationBridge::GetChartData(const FString& ChartId)
{
    if (!bIsInitialized)
    {
        return MakeShareable(new FJsonObject);
    }

    FString Script = FString::Printf(TEXT("JSON.stringify(global.vizManager.getChartData('%s'));"), *ChartId);
    FString Result = ExecuteJavaScript(Script);

    if (!Result.Contains(TEXT("ERROR")))
    {
        return StringToJsonObject(Result);
    }

    return MakeShareable(new FJsonObject);
}

FString UDataVisualizationBridge::ExportChartAsImage(const FString& ChartId, const FString& Format)
{
    if (!bIsInitialized) return TEXT("");

    FString Script = FString::Printf(TEXT("global.vizManager.exportAsImage('%s', '%s');"), *ChartId, *Format);
    FString Result = ExecuteJavaScript(Script);

    return Result.Contains(TEXT("ERROR")) ? TEXT("") : Result;
}

FString UDataVisualizationBridge::ExportChartAsData(const FString& ChartId, const FString& Format)
{
    if (!bIsInitialized) return TEXT("");

    FString Script = FString::Printf(TEXT("global.vizManager.exportAsData('%s', '%s');"), *ChartId, *Format);
    FString Result = ExecuteJavaScript(Script);

    return Result.Contains(TEXT("ERROR")) ? TEXT("") : Result;
}

TSharedPtr<FJsonObject> UDataVisualizationBridge::GetPerformanceStats()
{
    if (!bIsInitialized)
    {
        return MakeShareable(new FJsonObject);
    }

    FString Script = TEXT("JSON.stringify(global.vizManager.getPerformanceStats());");
    FString Result = ExecuteJavaScript(Script);

    if (!Result.Contains(TEXT("ERROR")))
    {
        return StringToJsonObject(Result);
    }

    return MakeShareable(new FJsonObject);
}

// Cleanup

void UDataVisualizationBridge::Dispose()
{
    if (bIsInitialized)
    {
        ClearAllCharts();

#if WITH_V8
        if (JavaScriptContext.IsValid())
        {
            JavaScriptContext.Reset();
        }

        if (JavaScriptEngine.IsValid())
        {
            JavaScriptEngine->Shutdown();
            JavaScriptEngine.Reset();
        }
#endif

        bIsInitialized = false;
        UE_LOG(LogDataVisualization, Log, TEXT("Data Visualization Bridge disposed"));
    }

    Charts.Empty();
    Dashboards.Empty();
    PendingUpdates.Empty();
}

// Event Handlers

void UDataVisualizationBridge::HandleThresholdCrossed(const FString& ChartId, const FString& ThresholdData)
{
    OnThresholdCrossed.ExecuteIfBound(ChartId, ThresholdData);
}

void UDataVisualizationBridge::HandleDataPointAdded(const FString& ChartId, const FString& DataPoint)
{
    OnDataPointAdded.ExecuteIfBound(ChartId, DataPoint);
}

void UDataVisualizationBridge::HandleChartError(const FString& ChartId, const FString& ErrorMessage)
{
    OnChartError.ExecuteIfBound(ChartId, ErrorMessage);
}

// Helper Methods

FString UDataVisualizationBridge::JsonObjectToString(TSharedPtr<FJsonObject> JsonObject)
{
    if (!JsonObject.IsValid())
    {
        return TEXT("{}");
    }

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);

    return OutputString;
}

TSharedPtr<FJsonObject> UDataVisualizationBridge::StringToJsonObject(const FString& JsonString)
{
    TSharedPtr<FJsonObject> JsonObject = MakeShareable(new FJsonObject);
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

    if (FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        return JsonObject;
    }

    return MakeShareable(new FJsonObject);
}

FString UDataVisualizationBridge::JsonValueArrayToString(const TArray<TSharedPtr<FJsonValue>>& JsonArray)
{
    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonArray, Writer);

    return OutputString;
}

// Async Task Implementation

void FDataVisualizationAsyncTask::DoWork()
{
    if (Bridge && Bridge->IsValidLowLevel())
    {
        Bridge->ExecuteJavaScript(Script);
    }
}

// Bridge Object Implementations

void UUnrealBridgeObject::Initialize(UDataVisualizationBridge* InBridge)
{
    Bridge = InBridge;
    NextTimerId = 1;
}

void UUnrealBridgeObject::Log(const FString& Message)
{
    UE_LOG(LogDataVisualization, Log, TEXT("[JS] %s"), *Message);
}

void UUnrealBridgeObject::LogWarning(const FString& Message)
{
    UE_LOG(LogDataVisualization, Warning, TEXT("[JS] %s"), *Message);
}

void UUnrealBridgeObject::LogError(const FString& Message)
{
    UE_LOG(LogDataVisualization, Error, TEXT("[JS] %s"), *Message);
}

void UUnrealBridgeObject::OnThresholdCrossed(const FString& ChartId, const FString& Data)
{
    if (Bridge)
    {
        Bridge->HandleThresholdCrossed(ChartId, Data);
    }
}

void UUnrealBridgeObject::OnDataPointAdded(const FString& ChartId, const FString& Data)
{
    if (Bridge)
    {
        Bridge->HandleDataPointAdded(ChartId, Data);
    }
}

void UUnrealBridgeObject::OnChartError(const FString& ChartId, const FString& Error)
{
    if (Bridge)
    {
        Bridge->HandleChartError(ChartId, Error);
    }
}

void UUnrealBridgeObject::SetTimeout(const FString& Callback, int32 Delay)
{
    // Implement setTimeout using Unreal's timer system
    if (UWorld* World = GWorld)
    {
        FTimerHandle TimerHandle;
        World->GetTimerManager().SetTimer(TimerHandle, [this, Callback]()
        {
            if (Bridge)
            {
                Bridge->ExecuteJavaScript(FString::Printf(TEXT("(%s)();"), *Callback));
            }
        }, Delay / 1000.0f, false);

        TimerHandles.Add(NextTimerId, TimerHandle);
        NextTimerId++;
    }
}

int32 UUnrealBridgeObject::SetInterval(const FString& Callback, int32 Interval)
{
    // Implement setInterval using Unreal's timer system
    if (UWorld* World = GWorld)
    {
        FTimerHandle TimerHandle;
        World->GetTimerManager().SetTimer(TimerHandle, [this, Callback]()
        {
            if (Bridge)
            {
                Bridge->ExecuteJavaScript(FString::Printf(TEXT("(%s)();"), *Callback));
            }
        }, Interval / 1000.0f, true);

        int32 IntervalId = NextTimerId++;
        TimerHandles.Add(IntervalId, TimerHandle);
        return IntervalId;
    }

    return -1;
}

float UUnrealBridgeObject::GetTime()
{
    return UGameplayStatics::GetTimeSeconds(GWorld);
}

float UUnrealBridgeObject::GetDeltaTime()
{
    return UGameplayStatics::GetWorldDeltaSeconds(GWorld);
}

int64 UUnrealBridgeObject::GetUnixTimestamp()
{
    return FDateTime::Now().ToUnixTimestamp();
}

// Debug Bridge Object

void UDebugBridgeObject::Log(const FString& Message)
{
    UE_LOG(LogDataVisualization, Log, TEXT("[DataViz] %s"), *Message);
}

void UDebugBridgeObject::Warn(const FString& Message)
{
    UE_LOG(LogDataVisualization, Warning, TEXT("[DataViz] %s"), *Message);
}

void UDebugBridgeObject::Error(const FString& Message)
{
    UE_LOG(LogDataVisualization, Error, TEXT("[DataViz] %s"), *Message);
}

void UDebugBridgeObject::Assert(bool bCondition, const FString& Message)
{
    if (!bCondition)
    {
        UE_LOG(LogDataVisualization, Fatal, TEXT("[DataViz] Assertion failed: %s"), *Message);
    }
}

// Time Bridge Object

float UTimeBridgeObject::GetTime()
{
    return UGameplayStatics::GetTimeSeconds(GWorld);
}

float UTimeBridgeObject::GetDeltaTime()
{
    return UGameplayStatics::GetWorldDeltaSeconds(GWorld);
}

float UTimeBridgeObject::GetUnscaledTime()
{
    return UGameplayStatics::GetUnpausedTimeSeconds(GWorld);
}

float UTimeBridgeObject::GetUnscaledDeltaTime()
{
    return FApp::GetDeltaTime();
}

int64 UTimeBridgeObject::GetUnixTimestamp()
{
    return FDateTime::Now().ToUnixTimestamp();
}

FString UTimeBridgeObject::GetFormattedTime()
{
    return FDateTime::Now().ToString();
}