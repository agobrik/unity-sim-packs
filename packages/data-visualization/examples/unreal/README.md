# Unreal Engine Integration Guide - Data Visualization

This guide shows how to integrate the Data Visualization package into Unreal Engine projects for real-time game analytics, performance monitoring, and player statistics visualization.

## Requirements

- Unreal Engine 5.0+ (5.1+ recommended)
- V8 JavaScript Engine Plugin
- C++ development environment
- Node.js for package management

## Installation

### 1. Install V8 JavaScript Engine

Add the V8 plugin to your Unreal project:

1. Download V8 plugin from Unreal Marketplace or compile from source
2. Add to your project's `Plugins` folder
3. Enable in Project Settings > Plugins

### 2. Add C++ Module

Add the Data Visualization module to your project:

1. Copy `Bridge.h`, `Bridge.cpp`, and `Example.cpp` to your project's `Source` folder
2. Update your project's `.Build.cs` file:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core",
    "CoreUObject",
    "Engine",
    "V8",
    "HTTP",
    "Json"
});

PrivateDependencyModuleNames.AddRange(new string[] {
    "Slate",
    "SlateCore",
    "UnrealEd"
});
```

### 3. Install JavaScript Package

```bash
# In your project's Content folder
mkdir JavaScript
cd JavaScript
npm install @steamproject/data-visualization
```

## Quick Start

### 1. Basic Setup

Include the bridge in your game class:

```cpp
// MyGameMode.h
#include "DataVisualizationBridge.h"

UCLASS()
class MYGAME_API AMyGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AMyGameMode();

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

private:
    UPROPERTY()
    UDataVisualizationBridge* VizBridge;

    void SetupCharts();
    void UpdatePerformanceData();
};

// MyGameMode.cpp
#include "MyGameMode.h"

AMyGameMode::AMyGameMode()
{
    PrimaryActorTick.bCanEverTick = true;
    VizBridge = CreateDefaultSubobject<UDataVisualizationBridge>(TEXT("DataVisualizationBridge"));
}

void AMyGameMode::BeginPlay()
{
    Super::BeginPlay();

    if (VizBridge)
    {
        SetupCharts();
    }
}

void AMyGameMode::SetupCharts()
{
    // Create FPS monitor
    TSharedPtr<FJsonObject> FPSConfig = MakeShareable(new FJsonObject);
    FPSConfig->SetStringField("title", "FPS Monitor");
    FPSConfig->SetNumberField("maxDataPoints", 100);
    FPSConfig->SetBoolField("realTime", true);

    TSharedPtr<FJsonObject> YAxis = MakeShareable(new FJsonObject);
    YAxis->SetNumberField("min", 0);
    YAxis->SetNumberField("max", 120);
    FPSConfig->SetObjectField("yAxis", YAxis);

    VizBridge->CreateLineChart("fpsChart", FPSConfig);

    // Create player dashboard
    TSharedPtr<FJsonObject> DashboardConfig = MakeShareable(new FJsonObject);
    DashboardConfig->SetStringField("container", "player-stats");
    DashboardConfig->SetStringField("layout", "grid");
    DashboardConfig->SetNumberField("columns", 3);

    VizBridge->CreateDashboard("playerDashboard", DashboardConfig);
}

void AMyGameMode::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    static float LastUpdate = 0.0f;
    LastUpdate += DeltaTime;

    if (LastUpdate >= 0.1f) // Update every 100ms
    {
        UpdatePerformanceData();
        LastUpdate = 0.0f;
    }
}

void AMyGameMode::UpdatePerformanceData()
{
    // Update FPS chart
    float CurrentFPS = 1.0f / GetWorld()->GetDeltaSeconds();
    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();

    VizBridge->UpdateChart("fpsChart", Timestamp, CurrentFPS);
}
```

### 2. Performance Monitoring Component

```cpp
// PerformanceMonitor.h
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DataVisualizationBridge.h"
#include "PerformanceMonitor.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UPerformanceMonitor : public UActorComponent
{
    GENERATED_BODY()

public:
    UPerformanceMonitor();

protected:
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

private:
    UPROPERTY(EditAnywhere, Category = "Performance")
    float UpdateInterval = 0.5f;

    UPROPERTY()
    UDataVisualizationBridge* VizBridge;

    float LastUpdateTime = 0.0f;
    TArray<float> FPSHistory;
    TArray<float> MemoryHistory;

    void SetupPerformanceCharts();
    void UpdatePerformanceMetrics();
    float CalculatePerformanceScore() const;
    float GetCPUUsage() const;
    float GetMemoryUsageMB() const;
};

// PerformanceMonitor.cpp
#include "PerformanceMonitor.h"
#include "Engine/Engine.h"
#include "HAL/PlatformFilemanager.h"

UPerformanceMonitor::UPerformanceMonitor()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UPerformanceMonitor::BeginPlay()
{
    Super::BeginPlay();

    VizBridge = NewObject<UDataVisualizationBridge>(this);
    SetupPerformanceCharts();
}

void UPerformanceMonitor::SetupPerformanceCharts()
{
    // Multi-line performance chart
    TSharedPtr<FJsonObject> PerfConfig = MakeShareable(new FJsonObject);
    PerfConfig->SetStringField("title", "System Performance");
    PerfConfig->SetNumberField("maxDataPoints", 200);
    PerfConfig->SetBoolField("realTime", true);

    TArray<TSharedPtr<FJsonValue>> Datasets;

    TSharedPtr<FJsonObject> FPSDataset = MakeShareable(new FJsonObject);
    FPSDataset->SetStringField("name", "FPS");
    FPSDataset->SetStringField("color", "#ff6b6b");
    Datasets.Add(MakeShareable(new FJsonValueObject(FPSDataset)));

    TSharedPtr<FJsonObject> MemoryDataset = MakeShareable(new FJsonObject);
    MemoryDataset->SetStringField("name", "Memory (MB)");
    MemoryDataset->SetStringField("color", "#4ecdc4");
    Datasets.Add(MakeShareable(new FJsonValueObject(MemoryDataset)));

    TSharedPtr<FJsonObject> CPUDataset = MakeShareable(new FJsonObject);
    CPUDataset->SetStringField("name", "CPU %");
    CPUDataset->SetStringField("color", "#45b7d1");
    Datasets.Add(MakeShareable(new FJsonValueObject(CPUDataset)));

    PerfConfig->SetArrayField("datasets", Datasets);
    VizBridge->CreateLineChart("performanceChart", PerfConfig);

    // Performance gauge
    TSharedPtr<FJsonObject> GaugeConfig = MakeShareable(new FJsonObject);
    GaugeConfig->SetStringField("title", "Overall Performance");
    GaugeConfig->SetNumberField("min", 0);
    GaugeConfig->SetNumberField("max", 100);

    TArray<TSharedPtr<FJsonValue>> Thresholds;

    TSharedPtr<FJsonObject> LowThreshold = MakeShareable(new FJsonObject);
    LowThreshold->SetNumberField("value", 30);
    LowThreshold->SetStringField("color", "#ff4444");
    Thresholds.Add(MakeShareable(new FJsonValueObject(LowThreshold)));

    TSharedPtr<FJsonObject> MedThreshold = MakeShareable(new FJsonObject);
    MedThreshold->SetNumberField("value", 60);
    MedThreshold->SetStringField("color", "#ffaa00");
    Thresholds.Add(MakeShareable(new FJsonValueObject(MedThreshold)));

    TSharedPtr<FJsonObject> HighThreshold = MakeShareable(new FJsonObject);
    HighThreshold->SetNumberField("value", 85);
    HighThreshold->SetStringField("color", "#44ff44");
    Thresholds.Add(MakeShareable(new FJsonValueObject(HighThreshold)));

    GaugeConfig->SetArrayField("thresholds", Thresholds);
    VizBridge->CreateGauge("performanceGauge", GaugeConfig);
}

void UPerformanceMonitor::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    LastUpdateTime += DeltaTime;

    if (LastUpdateTime >= UpdateInterval)
    {
        UpdatePerformanceMetrics();
        LastUpdateTime = 0.0f;
    }
}

void UPerformanceMonitor::UpdatePerformanceMetrics()
{
    float CurrentFPS = 1.0f / GetWorld()->GetDeltaSeconds();
    float MemoryMB = GetMemoryUsageMB();
    float CPUPercent = GetCPUUsage();

    // Track history
    FPSHistory.Add(CurrentFPS);
    MemoryHistory.Add(MemoryMB);

    // Limit history size
    if (FPSHistory.Num() > 60)
    {
        FPSHistory.RemoveAt(0);
    }
    if (MemoryHistory.Num() > 60)
    {
        MemoryHistory.RemoveAt(0);
    }

    // Update charts
    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();

    TSharedPtr<FJsonObject> MultiData = MakeShareable(new FJsonObject);
    MultiData->SetNumberField("timestamp", Timestamp);

    TSharedPtr<FJsonObject> Data = MakeShareable(new FJsonObject);
    Data->SetNumberField("FPS", CurrentFPS);
    Data->SetNumberField("Memory", MemoryMB);
    Data->SetNumberField("CPU", CPUPercent);
    MultiData->SetObjectField("data", Data);

    VizBridge->UpdateChartMultiData("performanceChart", MultiData);

    // Update performance gauge
    float PerformanceScore = CalculatePerformanceScore();
    VizBridge->UpdateChart("performanceGauge", Timestamp, PerformanceScore);
}

float UPerformanceMonitor::CalculatePerformanceScore() const
{
    float FPSScore = FMath::Clamp(FPSHistory.Num() > 0 ? FPSHistory.Last() / 60.0f : 0.0f, 0.0f, 1.0f) * 40.0f;
    float MemoryScore = FMath::Clamp(1.0f - (GetMemoryUsageMB() / 2048.0f), 0.0f, 1.0f) * 30.0f;
    float CPUScore = FMath::Clamp(1.0f - (GetCPUUsage() / 100.0f), 0.0f, 1.0f) * 30.0f;

    return FPSScore + MemoryScore + CPUScore;
}

float UPerformanceMonitor::GetMemoryUsageMB() const
{
    FPlatformMemoryStats MemStats = FPlatformMemory::GetStats();
    return MemStats.UsedPhysical / 1024.0f / 1024.0f;
}

float UPerformanceMonitor::GetCPUUsage() const
{
    // Simplified CPU usage - implement platform-specific monitoring
    return FMath::RandRange(10.0f, 80.0f);
}
```

### 3. Player Statistics Manager

```cpp
// PlayerStatsManager.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "DataVisualizationBridge.h"
#include "PlayerStatsManager.generated.h"

USTRUCT(BlueprintType)
struct FPlayerData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString PlayerName = "Player";

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Level = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Health = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Mana = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Experience = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Score = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TMap<FString, float> Skills;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    TMap<FString, int32> Inventory;
};

UCLASS()
class MYGAME_API APlayerStatsManager : public AGameStateBase
{
    GENERATED_BODY()

public:
    APlayerStatsManager();

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

private:
    UPROPERTY()
    UDataVisualizationBridge* VizBridge;

    UPROPERTY(EditAnywhere, Category = "Player Data")
    FPlayerData CurrentPlayer;

    UPROPERTY(EditAnywhere, Category = "Update Settings")
    float StatsUpdateInterval = 1.0f;

    float LastStatsUpdate = 0.0f;

    void SetupPlayerCharts();
    void UpdatePlayerStatistics();
    void SimulatePlayerDataChanges();
    TArray<TSharedPtr<FJsonValue>> SkillsToJsonArray() const;
    TArray<TSharedPtr<FJsonValue>> InventoryToJsonArray() const;
};

// PlayerStatsManager.cpp
#include "PlayerStatsManager.h"

APlayerStatsManager::APlayerStatsManager()
{
    PrimaryActorTick.bCanEverTick = true;
    VizBridge = CreateDefaultSubobject<UDataVisualizationBridge>(TEXT("DataVisualizationBridge"));
}

void APlayerStatsManager::BeginPlay()
{
    Super::BeginPlay();

    // Initialize player data
    CurrentPlayer.PlayerName = "TestPlayer";
    CurrentPlayer.Level = 15;
    CurrentPlayer.Health = 85.0f;
    CurrentPlayer.Mana = 60.0f;
    CurrentPlayer.Experience = 750.0f;
    CurrentPlayer.Score = 12500;

    // Initialize skills
    CurrentPlayer.Skills.Add("Combat", 85.0f);
    CurrentPlayer.Skills.Add("Magic", 62.0f);
    CurrentPlayer.Skills.Add("Crafting", 43.0f);
    CurrentPlayer.Skills.Add("Trade", 78.0f);
    CurrentPlayer.Skills.Add("Stealth", 35.0f);

    // Initialize inventory
    CurrentPlayer.Inventory.Add("Health Potions", 15);
    CurrentPlayer.Inventory.Add("Mana Potions", 8);
    CurrentPlayer.Inventory.Add("Iron Sword", 1);
    CurrentPlayer.Inventory.Add("Magic Staff", 1);
    CurrentPlayer.Inventory.Add("Gold Coins", 250);

    SetupPlayerCharts();
}

void APlayerStatsManager::SetupPlayerCharts()
{
    // Health gauge
    TSharedPtr<FJsonObject> HealthConfig = MakeShareable(new FJsonObject);
    HealthConfig->SetStringField("title", "Health");
    HealthConfig->SetNumberField("min", 0);
    HealthConfig->SetNumberField("max", 100);
    HealthConfig->SetNumberField("value", CurrentPlayer.Health);
    HealthConfig->SetStringField("color", "#ff4444");
    VizBridge->CreateGauge("healthGauge", HealthConfig);

    // Mana gauge
    TSharedPtr<FJsonObject> ManaConfig = MakeShareable(new FJsonObject);
    ManaConfig->SetStringField("title", "Mana");
    ManaConfig->SetNumberField("min", 0);
    ManaConfig->SetNumberField("max", 100);
    ManaConfig->SetNumberField("value", CurrentPlayer.Mana);
    ManaConfig->SetStringField("color", "#4444ff");
    VizBridge->CreateGauge("manaGauge", ManaConfig);

    // Experience gauge
    TSharedPtr<FJsonObject> ExpConfig = MakeShareable(new FJsonObject);
    ExpConfig->SetStringField("title", "Experience");
    ExpConfig->SetNumberField("min", 0);
    ExpConfig->SetNumberField("max", 1000);
    ExpConfig->SetNumberField("value", CurrentPlayer.Experience);
    ExpConfig->SetStringField("color", "#ffaa00");
    VizBridge->CreateGauge("experienceGauge", ExpConfig);

    // Skills chart
    TSharedPtr<FJsonObject> SkillsConfig = MakeShareable(new FJsonObject);
    SkillsConfig->SetStringField("title", "Player Skills");
    SkillsConfig->SetBoolField("horizontal", true);
    SkillsConfig->SetArrayField("data", SkillsToJsonArray());
    VizBridge->CreateBarChart("skillsChart", SkillsConfig);

    // Inventory pie chart
    TSharedPtr<FJsonObject> InventoryConfig = MakeShareable(new FJsonObject);
    InventoryConfig->SetStringField("title", "Inventory Distribution");
    InventoryConfig->SetArrayField("data", InventoryToJsonArray());
    VizBridge->CreatePieChart("inventoryChart", InventoryConfig);
}

void APlayerStatsManager::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    LastStatsUpdate += DeltaTime;

    if (LastStatsUpdate >= StatsUpdateInterval)
    {
        UpdatePlayerStatistics();
        LastStatsUpdate = 0.0f;
    }
}

void APlayerStatsManager::UpdatePlayerStatistics()
{
    SimulatePlayerDataChanges();

    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();

    // Update gauges
    VizBridge->UpdateChart("healthGauge", Timestamp, CurrentPlayer.Health);
    VizBridge->UpdateChart("manaGauge", Timestamp, CurrentPlayer.Mana);
    VizBridge->UpdateChart("experienceGauge", Timestamp, CurrentPlayer.Experience);

    // Update charts
    VizBridge->UpdateChartArray("skillsChart", SkillsToJsonArray());
    VizBridge->UpdateChartArray("inventoryChart", InventoryToJsonArray());
}

void APlayerStatsManager::SimulatePlayerDataChanges()
{
    // Simulate health/mana changes
    if (FMath::RandRange(0.0f, 1.0f) < 0.3f)
    {
        CurrentPlayer.Health = FMath::Clamp(CurrentPlayer.Health + FMath::RandRange(-5.0f, 3.0f), 0.0f, 100.0f);
    }

    if (FMath::RandRange(0.0f, 1.0f) < 0.3f)
    {
        CurrentPlayer.Mana = FMath::Clamp(CurrentPlayer.Mana + FMath::RandRange(-8.0f, 5.0f), 0.0f, 100.0f);
    }

    // Simulate experience gain
    if (FMath::RandRange(0.0f, 1.0f) < 0.1f)
    {
        CurrentPlayer.Experience += FMath::RandRange(5.0f, 25.0f);
        if (CurrentPlayer.Experience >= 1000.0f)
        {
            CurrentPlayer.Level++;
            CurrentPlayer.Experience = 0.0f;
        }
    }

    // Simulate skill progression
    if (FMath::RandRange(0.0f, 1.0f) < 0.05f)
    {
        TArray<FString> SkillKeys;
        CurrentPlayer.Skills.GenerateKeyArray(SkillKeys);

        if (SkillKeys.Num() > 0)
        {
            FString RandomSkill = SkillKeys[FMath::RandRange(0, SkillKeys.Num() - 1)];
            float* SkillValue = CurrentPlayer.Skills.Find(RandomSkill);
            if (SkillValue)
            {
                *SkillValue = FMath::Min(*SkillValue + FMath::RandRange(0.5f, 2.0f), 100.0f);
            }
        }
    }
}

TArray<TSharedPtr<FJsonValue>> APlayerStatsManager::SkillsToJsonArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Skill : CurrentPlayer.Skills)
    {
        TSharedPtr<FJsonObject> SkillObj = MakeShareable(new FJsonObject);
        SkillObj->SetStringField("name", Skill.Key);
        SkillObj->SetNumberField("value", Skill.Value);
        Result.Add(MakeShareable(new FJsonValueObject(SkillObj)));
    }

    return Result;
}

TArray<TSharedPtr<FJsonValue>> APlayerStatsManager::InventoryToJsonArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Item : CurrentPlayer.Inventory)
    {
        TSharedPtr<FJsonObject> ItemObj = MakeShareable(new FJsonObject);
        ItemObj->SetStringField("name", Item.Key);
        ItemObj->SetNumberField("value", Item.Value);
        Result.Add(MakeShareable(new FJsonValueObject(ItemObj)));
    }

    return Result;
}
```

## Advanced Features

### Event System Integration

```cpp
// DataVisualizationEventHandler.h
#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "DataVisualizationBridge.h"
#include "DataVisualizationEventHandler.generated.h"

UCLASS(BlueprintType)
class MYGAME_API UDataVisualizationEventHandler : public UObject
{
    GENERATED_BODY()

public:
    void Initialize(UDataVisualizationBridge* Bridge);

    UFUNCTION(BlueprintCallable)
    void OnThresholdCrossed(const FString& ChartId, const FString& ThresholdData);

    UFUNCTION(BlueprintCallable)
    void OnDataPointAdded(const FString& ChartId, const FString& DataPoint);

    UFUNCTION(BlueprintCallable)
    void OnChartError(const FString& ChartId, const FString& ErrorMessage);

private:
    UPROPERTY()
    UDataVisualizationBridge* VizBridge;

    void HandleFPSThreshold(const FString& Data);
    void HandleHealthThreshold(const FString& Data);
    void HandlePerformanceThreshold(const FString& Data);
};

// DataVisualizationEventHandler.cpp
#include "DataVisualizationEventHandler.h"
#include "Engine/Engine.h"

void UDataVisualizationEventHandler::Initialize(UDataVisualizationBridge* Bridge)
{
    VizBridge = Bridge;

    if (VizBridge)
    {
        VizBridge->OnThresholdCrossed.AddDynamic(this, &UDataVisualizationEventHandler::OnThresholdCrossed);
        VizBridge->OnDataPointAdded.AddDynamic(this, &UDataVisualizationEventHandler::OnDataPointAdded);
        VizBridge->OnChartError.AddDynamic(this, &UDataVisualizationEventHandler::OnChartError);
    }
}

void UDataVisualizationEventHandler::OnThresholdCrossed(const FString& ChartId, const FString& ThresholdData)
{
    UE_LOG(LogTemp, Warning, TEXT("Threshold crossed in chart '%s': %s"), *ChartId, *ThresholdData);

    if (ChartId == "fpsChart")
    {
        HandleFPSThreshold(ThresholdData);
    }
    else if (ChartId == "healthGauge")
    {
        HandleHealthThreshold(ThresholdData);
    }
    else if (ChartId == "performanceGauge")
    {
        HandlePerformanceThreshold(ThresholdData);
    }
}

void UDataVisualizationEventHandler::OnDataPointAdded(const FString& ChartId, const FString& DataPoint)
{
    // Log for debugging if needed
    // UE_LOG(LogTemp, Log, TEXT("Data point added to '%s': %s"), *ChartId, *DataPoint);
}

void UDataVisualizationEventHandler::OnChartError(const FString& ChartId, const FString& ErrorMessage)
{
    UE_LOG(LogTemp, Error, TEXT("Chart error in '%s': %s"), *ChartId, *ErrorMessage);
}

void UDataVisualizationEventHandler::HandleFPSThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Red, TEXT("Performance Warning: FPS too low!"));
    }
}

void UDataVisualizationEventHandler::HandleHealthThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Red, TEXT("Health Warning: Player health critical!"));
    }
}

void UDataVisualizationEventHandler::HandlePerformanceThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Yellow, TEXT("Performance below threshold - consider reducing quality"));
    }
}
```

### Custom Themes

```cpp
// ChartThemeManager.h
#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "DataVisualizationBridge.h"
#include "ChartThemeManager.generated.h"

UCLASS(BlueprintType)
class MYGAME_API UChartThemeManager : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable)
    static void ApplyGameTheme(UDataVisualizationBridge* Bridge);

    UFUNCTION(BlueprintCallable)
    static void ApplySciFiTheme(UDataVisualizationBridge* Bridge);

    UFUNCTION(BlueprintCallable)
    static void ApplyFantasyTheme(UDataVisualizationBridge* Bridge);

    UFUNCTION(BlueprintCallable)
    static void ApplyNeonTheme(UDataVisualizationBridge* Bridge);

private:
    static TSharedPtr<FJsonObject> CreateBaseTheme();
};

// ChartThemeManager.cpp
#include "ChartThemeManager.h"

void UChartThemeManager::ApplyGameTheme(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    TSharedPtr<FJsonObject> Theme = CreateBaseTheme();

    TSharedPtr<FJsonObject> Colors = MakeShareable(new FJsonObject);
    Colors->SetStringField("primary", "#ff6b6b");
    Colors->SetStringField("secondary", "#4ecdc4");
    Colors->SetStringField("background", "#1a1a2e");
    Colors->SetStringField("text", "#eee");
    Colors->SetStringField("accent", "#ffd93d");
    Theme->SetObjectField("colors", Colors);

    TSharedPtr<FJsonObject> Fonts = MakeShareable(new FJsonObject);
    Fonts->SetStringField("title", "Orbitron");
    Fonts->SetStringField("body", "Roboto Mono");
    Theme->SetObjectField("fonts", Fonts);

    Bridge->SetTheme(Theme);
}

void UChartThemeManager::ApplySciFiTheme(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    TSharedPtr<FJsonObject> Theme = CreateBaseTheme();

    TSharedPtr<FJsonObject> Colors = MakeShareable(new FJsonObject);
    Colors->SetStringField("primary", "#00ffff");
    Colors->SetStringField("secondary", "#0080ff");
    Colors->SetStringField("background", "#0a0a0a");
    Colors->SetStringField("text", "#ffffff");
    Colors->SetStringField("accent", "#ff8000");
    Theme->SetObjectField("colors", Colors);

    Bridge->SetTheme(Theme);
}

TSharedPtr<FJsonObject> UChartThemeManager::CreateBaseTheme()
{
    TSharedPtr<FJsonObject> Theme = MakeShareable(new FJsonObject);

    TSharedPtr<FJsonObject> Borders = MakeShareable(new FJsonObject);
    Borders->SetNumberField("radius", 8);
    Borders->SetBoolField("glow", true);
    Borders->SetStringField("color", "#333");
    Theme->SetObjectField("borders", Borders);

    TSharedPtr<FJsonObject> Animations = MakeShareable(new FJsonObject);
    Animations->SetBoolField("enabled", true);
    Animations->SetNumberField("duration", 300);
    Theme->SetObjectField("animations", Animations);

    return Theme;
}
```

## Performance Optimization

### Memory Management

```cpp
// DataVisualizationOptimizer.h
#pragma once

#include "CoreMinimal.h"
#include "UObject/NoExportTypes.h"
#include "DataVisualizationBridge.h"
#include "DataVisualizationOptimizer.generated.h"

UCLASS()
class MYGAME_API UDataVisualizationOptimizer : public UObject
{
    GENERATED_BODY()

public:
    static void ConfigureOptimalSettings(UDataVisualizationBridge* Bridge);
    static void EnableBatchUpdates(UDataVisualizationBridge* Bridge);
    static void SetMemoryLimits(UDataVisualizationBridge* Bridge, int32 LimitMB = 50);
    static void OptimizeForMobile(UDataVisualizationBridge* Bridge);
    static void OptimizeForConsole(UDataVisualizationBridge* Bridge);
};

// DataVisualizationOptimizer.cpp
#include "DataVisualizationOptimizer.h"

void UDataVisualizationOptimizer::ConfigureOptimalSettings(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    // Set memory limits
    SetMemoryLimits(Bridge, 50);

    // Enable auto-cleanup
    Bridge->EnableAutoCleanup(true);

    // Enable batch updates
    EnableBatchUpdates(Bridge);

    // Set performance stats
    Bridge->ShowPerformanceStats(false); // Disable in shipping builds
}

void UDataVisualizationOptimizer::EnableBatchUpdates(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    Bridge->EnableBatchUpdates(true);
    Bridge->SetBatchInterval(0.1f); // 100ms batches
}

void UDataVisualizationOptimizer::SetMemoryLimits(UDataVisualizationBridge* Bridge, int32 LimitMB)
{
    if (!Bridge) return;

    Bridge->SetMemoryLimit(LimitMB * 1024 * 1024);
    Bridge->SetMaxDataPointsPerChart(1000);
}

void UDataVisualizationOptimizer::OptimizeForMobile(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    // Reduced memory and features for mobile
    SetMemoryLimits(Bridge, 25);
    Bridge->SetMaxDataPointsPerChart(500);
    Bridge->EnableBatchUpdates(true);
    Bridge->SetBatchInterval(0.2f); // Slower updates on mobile
}

void UDataVisualizationOptimizer::OptimizeForConsole(UDataVisualizationBridge* Bridge)
{
    if (!Bridge) return;

    // Higher limits for console platforms
    SetMemoryLimits(Bridge, 100);
    Bridge->SetMaxDataPointsPerChart(2000);
    Bridge->EnableBatchUpdates(true);
    Bridge->SetBatchInterval(0.05f); // Faster updates on console
}
```

## Blueprint Integration

Create Blueprint nodes for easier integration:

```cpp
// DataVisualizationBlueprintLibrary.h
#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "DataVisualizationBridge.h"
#include "DataVisualizationBlueprintLibrary.generated.h"

UCLASS()
class MYGAME_API UDataVisualizationBlueprintLibrary : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    static UDataVisualizationBridge* CreateVisualizationBridge();

    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    static void CreateSimpleLineChart(UDataVisualizationBridge* Bridge, const FString& ChartId, const FString& Title);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    static void CreateSimpleBarChart(UDataVisualizationBridge* Bridge, const FString& ChartId, const FString& Title);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    static void UpdateChartWithValue(UDataVisualizationBridge* Bridge, const FString& ChartId, float Value);

    UFUNCTION(BlueprintCallable, Category = "Data Visualization")
    static void ApplyDarkTheme(UDataVisualizationBridge* Bridge);
};
```

## Troubleshooting

### Common Issues

1. **V8 Engine Not Found**
   - Ensure V8 plugin is installed and enabled
   - Check that V8 is included in build dependencies

2. **JavaScript Files Not Loading**
   - Verify npm package is installed in Content/JavaScript/
   - Check file paths in DataVisualizationBridge

3. **Performance Issues**
   - Reduce chart update frequency
   - Enable batch updates
   - Limit concurrent charts

4. **Packaging Errors**
   - Ensure JavaScript files are included in packaging
   - Check that V8 plugin is included in target platforms

### Debug Configuration

```cpp
void AMyGameMode::SetupDebugMode()
{
    if (VizBridge)
    {
        VizBridge->SetDebugMode(true);
        VizBridge->SetLogLevel("verbose");
        VizBridge->ShowPerformanceStats(true);
    }
}
```

## Best Practices

1. **Initialization**: Always initialize the bridge in BeginPlay()
2. **Update Frequency**: Use appropriate intervals for different chart types
3. **Memory Management**: Set reasonable memory limits and enable auto-cleanup
4. **Error Handling**: Implement proper error handlers for production builds
5. **Performance**: Use batch updates for multiple chart operations
6. **Platform Optimization**: Configure different settings for mobile vs. desktop

## Example Project Structure

```
MyProject/
├── Source/
│   └── MyProject/
│       ├── DataVisualization/
│       │   ├── Bridge.h/cpp
│       │   ├── Example.cpp
│       │   └── Utilities/
│       └── MyProject.Build.cs
├── Content/
│   ├── JavaScript/
│   │   └── node_modules/@steamproject/data-visualization/
│   └── Blueprints/
│       └── DataVisualization/
├── Plugins/
│   └── V8JavaScript/
└── Package.uplugin
```

This integration provides a robust foundation for real-time data visualization in Unreal Engine projects, with comprehensive examples for performance monitoring, player statistics, and game analytics.