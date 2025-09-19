#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "Engine/Engine.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "HAL/PlatformFilemanager.h"
#include "Misc/FileHelper.h"
#include "Misc/DateTime.h"
#include "Async/AsyncWork.h"

// V8 JavaScript Engine includes
#if WITH_V8
#include "V8/V8Engine.h"
#include "V8/V8Context.h"
#include "V8/V8Value.h"
#endif

#include "DataVisualizationBridge.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnThresholdCrossed, const FString&, ChartId, const FString&, ThresholdData);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnDataPointAdded, const FString&, ChartId, const FString&, DataPoint);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnChartError, const FString&, ChartId, const FString&, ErrorMessage);

USTRUCT(BlueprintType)
struct FBatchUpdateData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString ChartId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Method;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Data;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Timestamp;

    FBatchUpdateData()
    {
        ChartId = "";
        Method = "";
        Data = "";
        Timestamp = 0.0f;
    }
};

USTRUCT(BlueprintType)
struct FChartConfiguration
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bRealTime;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 MaxDataPoints;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bShowLegend;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TArray<FString> Colors;

    FChartConfiguration()
    {
        Title = "";
        bRealTime = false;
        MaxDataPoints = 1000;
        bShowLegend = true;
    }
};

/**
 * Unreal Engine bridge for the Data Visualization JavaScript package
 * Provides seamless integration between Unreal C++ and JavaScript charting library
 */
UCLASS(BlueprintType, Blueprintable)
class MYGAME_API UDataVisualizationBridge : public UObject
{
    GENERATED_BODY()

public:
    UDataVisualizationBridge();
    virtual ~UDataVisualizationBridge();

    // Event delegates
    UPROPERTY(BlueprintAssignable)
    FOnThresholdCrossed OnThresholdCrossed;

    UPROPERTY(BlueprintAssignable)
    FOnDataPointAdded OnDataPointAdded;

    UPROPERTY(BlueprintAssignable)
    FOnChartError OnChartError;

    // Configuration properties
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bEnableDebugMode;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    FString PackagePath;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    int32 MemoryLimit;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Configuration")
    bool bAutoCleanup;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    bool bEnableBatchUpdates;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    float BatchInterval;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    int32 MaxDataPointsPerChart;

    // Initialization
    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    bool Initialize();

    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    bool IsInitialized() const { return bIsInitialized; }

    // Chart Creation
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateLineChart(const FString& ChartId, TSharedPtr<FJsonObject> Config);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateBarChart(const FString& ChartId, TSharedPtr<FJsonObject> Config);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreatePieChart(const FString& ChartId, TSharedPtr<FJsonObject> Config);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateHeatmap(const FString& ChartId, TSharedPtr<FJsonObject> Config);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateGauge(const FString& ChartId, TSharedPtr<FJsonObject> Config);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateDashboard(const FString& DashboardId, TSharedPtr<FJsonObject> Config);

    // Blueprint-friendly chart creation
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateSimpleLineChart(const FString& ChartId, const FString& Title, int32 MaxPoints = 100);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateSimpleBarChart(const FString& ChartId, const FString& Title, bool bHorizontal = false);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Charts")
    void CreateSimpleGauge(const FString& ChartId, const FString& Title, float MinValue = 0.0f, float MaxValue = 100.0f);

    // Data Updates
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateChart(const FString& ChartId, int64 Timestamp, float Value);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateChartMultiData(const FString& ChartId, TSharedPtr<FJsonObject> Data);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateChartArray(const FString& ChartId, const TArray<TSharedPtr<FJsonValue>>& Data);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateDashboard(const FString& DashboardId, TSharedPtr<FJsonObject> Data);

    // Blueprint-friendly updates
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateChartWithValue(const FString& ChartId, float Value);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Updates")
    void UpdateGauge(const FString& ChartId, float Value);

    // Batch Updates
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Batch")
    void ApplyBatchedUpdates(const TArray<FBatchUpdateData>& Updates);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Batch")
    void ProcessPendingUpdates();

    // Configuration
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetTheme(TSharedPtr<FJsonObject> Theme);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetDebugMode(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetLogLevel(const FString& Level);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void ShowPerformanceStats(bool bShow);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetMemoryLimit(int32 LimitBytes);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void EnableAutoCleanup(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void EnableBatchUpdates(bool bEnabled);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetBatchInterval(float Interval);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Configuration")
    void SetMaxDataPointsPerChart(int32 MaxPoints);

    // Chart Management
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Management")
    void RemoveChart(const FString& ChartId);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Management")
    void ClearAllCharts();

    // Utilities
    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Utilities")
    TSharedPtr<FJsonObject> GetChartData(const FString& ChartId);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Utilities")
    FString ExportChartAsImage(const FString& ChartId, const FString& Format = TEXT("png"));

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Utilities")
    FString ExportChartAsData(const FString& ChartId, const FString& Format = TEXT("json"));

    UFUNCTION(BlueprintCallable, Category = "Data Visualization|Utilities")
    TSharedPtr<FJsonObject> GetPerformanceStats();

    // Cleanup
    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    void Dispose();

    // Tick function for batch processing
    void Tick(float DeltaTime);

protected:
    // JavaScript Engine Integration
#if WITH_V8
    TSharedPtr<FV8Engine> JavaScriptEngine;
    TSharedPtr<FV8Context> JavaScriptContext;
#endif

    // Internal state
    bool bIsInitialized;
    TMap<FString, TSharedPtr<FJsonObject>> Charts;
    TMap<FString, TSharedPtr<FJsonObject>> Dashboards;

    // Batch Update System
    TArray<FBatchUpdateData> PendingUpdates;
    float LastBatchTime;

    // Performance Tracking
    TSharedPtr<FJsonObject> PerformanceStats;

    // Internal methods
    bool InitializeJavaScriptEngine();
    bool LoadDataVisualizationPackage();
    void SetupEventHandlers();

    FString ExecuteJavaScript(const FString& Script);
    void ExecuteJavaScriptAsync(const FString& Script);

    void UpdateChartImmediate(const FString& ChartId, int64 Timestamp, float Value);
    void UpdateChartMultiDataImmediate(const FString& ChartId, TSharedPtr<FJsonObject> Data);
    void UpdateChartArrayDataImmediate(const FString& ChartId, const TArray<TSharedPtr<FJsonValue>>& Data);

    void ProcessBatchedUpdates();
    void AddBatchUpdate(const FString& ChartId, const FString& Method, const FString& Data);

    // Event Handlers (called from JavaScript)
    UFUNCTION()
    void HandleThresholdCrossed(const FString& ChartId, const FString& ThresholdData);

    UFUNCTION()
    void HandleDataPointAdded(const FString& ChartId, const FString& DataPoint);

    UFUNCTION()
    void HandleChartError(const FString& ChartId, const FString& ErrorMessage);

private:
    // Helper methods
    FString JsonObjectToString(TSharedPtr<FJsonObject> JsonObject);
    TSharedPtr<FJsonObject> StringToJsonObject(const FString& JsonString);
    FString JsonValueArrayToString(const TArray<TSharedPtr<FJsonValue>>& JsonArray);
};

/**
 * Async task for JavaScript execution to prevent blocking the main thread
 */
class FDataVisualizationAsyncTask : public FNonAbandonableTask
{
    friend class FAsyncTask<FDataVisualizationAsyncTask>;

public:
    FDataVisualizationAsyncTask(UDataVisualizationBridge* InBridge, const FString& InScript)
        : Bridge(InBridge), Script(InScript)
    {
    }

    void DoWork();

    FORCEINLINE TStatId GetStatId() const
    {
        RETURN_QUICK_DECLARE_CYCLE_STAT(FDataVisualizationAsyncTask, STATGROUP_ThreadPoolAsyncTasks);
    }

private:
    UDataVisualizationBridge* Bridge;
    FString Script;
};

/**
 * Unreal Bridge Object for JavaScript Callbacks
 */
UCLASS()
class MYGAME_API UUnrealBridgeObject : public UObject
{
    GENERATED_BODY()

public:
    void Initialize(UDataVisualizationBridge* InBridge);

    // Methods called from JavaScript
    UFUNCTION()
    void Log(const FString& Message);

    UFUNCTION()
    void LogWarning(const FString& Message);

    UFUNCTION()
    void LogError(const FString& Message);

    UFUNCTION()
    void OnThresholdCrossed(const FString& ChartId, const FString& Data);

    UFUNCTION()
    void OnDataPointAdded(const FString& ChartId, const FString& Data);

    UFUNCTION()
    void OnChartError(const FString& ChartId, const FString& Error);

    UFUNCTION()
    void SetTimeout(const FString& Callback, int32 Delay);

    UFUNCTION()
    int32 SetInterval(const FString& Callback, int32 Interval);

    // Utility methods
    UFUNCTION()
    float GetTime();

    UFUNCTION()
    float GetDeltaTime();

    UFUNCTION()
    int64 GetUnixTimestamp();

private:
    UPROPERTY()
    UDataVisualizationBridge* Bridge;

    // Timer handles for setTimeout/setInterval
    TMap<int32, FTimerHandle> TimerHandles;
    int32 NextTimerId;
};

/**
 * Debug Bridge Object for logging and debugging
 */
UCLASS()
class MYGAME_API UDebugBridgeObject : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION()
    void Log(const FString& Message);

    UFUNCTION()
    void Warn(const FString& Message);

    UFUNCTION()
    void Error(const FString& Message);

    UFUNCTION()
    void Assert(bool bCondition, const FString& Message);
};

/**
 * Time Bridge Object for time-related utilities
 */
UCLASS()
class MYGAME_API UTimeBridgeObject : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION()
    float GetTime();

    UFUNCTION()
    float GetDeltaTime();

    UFUNCTION()
    float GetUnscaledTime();

    UFUNCTION()
    float GetUnscaledDeltaTime();

    UFUNCTION()
    int64 GetUnixTimestamp();

    UFUNCTION()
    FString GetFormattedTime();
};