#include "DataVisualizationExample.h"
#include "Engine/World.h"
#include "GameFramework/GameStateBase.h"
#include "HAL/PlatformMemory.h"
#include "Kismet/GameplayStatics.h"

DEFINE_LOG_CATEGORY_STATIC(LogDataVizExample, Log, All);

ADataVisualizationExample::ADataVisualizationExample()
{
    PrimaryActorTick.bCanEverTick = true;

    // Create components
    VisualizationBridge = CreateDefaultSubobject<UDataVisualizationBridge>(TEXT("DataVisualizationBridge"));
    PerformanceMonitor = CreateDefaultSubobject<UPerformanceMonitorComponent>(TEXT("PerformanceMonitor"));

    // Configuration defaults
    bEnablePerformanceMonitoring = true;
    bEnablePlayerStats = true;
    bEnableGameAnalytics = true;
    bEnableEconomyTracking = true;

    // Update intervals
    PerformanceUpdateInterval = 0.1f;
    PlayerStatsUpdateInterval = 1.0f;
    AnalyticsUpdateInterval = 5.0f;
    EconomyUpdateInterval = 2.0f;

    // Initialize timers
    LastPerformanceUpdate = 0.0f;
    LastPlayerStatsUpdate = 0.0f;
    LastAnalyticsUpdate = 0.0f;
    LastEconomyUpdate = 0.0f;

    // Initialize data structures
    InitializeExampleData();
}

void ADataVisualizationExample::BeginPlay()
{
    Super::BeginPlay();

    UE_LOG(LogDataVizExample, Log, TEXT("Initializing Data Visualization Example..."));

    // Initialize the bridge
    if (VisualizationBridge && VisualizationBridge->Initialize())
    {
        SetupEventHandlers();

        // Delay chart setup to ensure everything is initialized
        GetWorld()->GetTimerManager().SetTimer(
            InitializationTimerHandle,
            this,
            &ADataVisualizationExample::InitializeAllVisualizations,
            1.0f,
            false
        );
    }
    else
    {
        UE_LOG(LogDataVizExample, Error, TEXT("Failed to initialize Data Visualization Bridge"));
    }
}

void ADataVisualizationExample::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    // Update simulated game data
    UpdateSimulatedGameData(DeltaTime);

    // Update visualizations based on intervals
    UpdateVisualizationsBasedOnIntervals();

    // Process batch updates
    if (VisualizationBridge)
    {
        VisualizationBridge->Tick(DeltaTime);
    }
}

void ADataVisualizationExample::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    Super::EndPlay(EndPlayReason);

    CleanupExample();
}

void ADataVisualizationExample::InitializeExampleData()
{
    // Initialize current player
    CurrentPlayer.PlayerName = TEXT("TestPlayer");
    CurrentPlayer.Level = 15;
    CurrentPlayer.Health = 85.0f;
    CurrentPlayer.Mana = 60.0f;
    CurrentPlayer.Experience = 750.0f;
    CurrentPlayer.Score = 12500;
    CurrentPlayer.Playtime = 3600.0f;
    CurrentPlayer.Position = FVector::ZeroVector;

    // Initialize skills
    CurrentPlayer.Skills.Add(TEXT("Combat"), 85.0f);
    CurrentPlayer.Skills.Add(TEXT("Magic"), 62.0f);
    CurrentPlayer.Skills.Add(TEXT("Crafting"), 43.0f);
    CurrentPlayer.Skills.Add(TEXT("Trade"), 78.0f);
    CurrentPlayer.Skills.Add(TEXT("Stealth"), 35.0f);

    // Initialize inventory
    CurrentPlayer.Inventory.Add(TEXT("Health Potions"), 15);
    CurrentPlayer.Inventory.Add(TEXT("Mana Potions"), 8);
    CurrentPlayer.Inventory.Add(TEXT("Iron Sword"), 1);
    CurrentPlayer.Inventory.Add(TEXT("Magic Staff"), 1);
    CurrentPlayer.Inventory.Add(TEXT("Gold Coins"), 250);

    // Initialize leaderboard
    LeaderboardData.Empty();
    for (int32 i = 0; i < 10; i++)
    {
        FPlayerData Player;
        Player.PlayerName = FString::Printf(TEXT("Player%d"), i + 1);
        Player.Level = FMath::RandRange(10, 25);
        Player.Score = FMath::RandRange(5000, 20000);
        Player.Playtime = FMath::RandRange(1800.0f, 7200.0f);
        LeaderboardData.Add(Player);
    }

    // Initialize economy data
    EconomyData.Resources.Add(TEXT("Wood"), 35.0f);
    EconomyData.Resources.Add(TEXT("Stone"), 28.0f);
    EconomyData.Resources.Add(TEXT("Iron"), 20.0f);
    EconomyData.Resources.Add(TEXT("Gold"), 17.0f);

    EconomyData.Prices.Add(TEXT("Wood"), 2.5f);
    EconomyData.Prices.Add(TEXT("Stone"), 3.2f);
    EconomyData.Prices.Add(TEXT("Iron"), 8.7f);
    EconomyData.Prices.Add(TEXT("Gold"), 25.4f);

    EconomyData.TotalGold = 1000.0f;
    EconomyData.RecentTransactions.Empty();

    UE_LOG(LogDataVizExample, Log, TEXT("Example data initialized"));
}

void ADataVisualizationExample::SetupEventHandlers()
{
    if (VisualizationBridge)
    {
        VisualizationBridge->OnThresholdCrossed.AddDynamic(this, &ADataVisualizationExample::HandleThresholdCrossed);
        VisualizationBridge->OnDataPointAdded.AddDynamic(this, &ADataVisualizationExample::HandleDataPointAdded);
        VisualizationBridge->OnChartError.AddDynamic(this, &ADataVisualizationExample::HandleChartError);
    }
}

void ADataVisualizationExample::InitializeAllVisualizations()
{
    if (!VisualizationBridge || !VisualizationBridge->IsInitialized())
    {
        UE_LOG(LogDataVizExample, Warning, TEXT("Bridge not ready, retrying initialization..."));
        GetWorld()->GetTimerManager().SetTimer(
            InitializationTimerHandle,
            this,
            &ADataVisualizationExample::InitializeAllVisualizations,
            1.0f,
            false
        );
        return;
    }

    if (bEnablePerformanceMonitoring)
    {
        SetupPerformanceMonitoring();
    }

    if (bEnablePlayerStats)
    {
        SetupPlayerStatistics();
    }

    if (bEnableGameAnalytics)
    {
        SetupGameAnalytics();
    }

    if (bEnableEconomyTracking)
    {
        SetupEconomyTracking();
    }

    // Apply custom theme
    ApplyGameTheme();

    UE_LOG(LogDataVizExample, Log, TEXT("All visualizations initialized successfully"));
}

// Performance Monitoring

void ADataVisualizationExample::SetupPerformanceMonitoring()
{
    // Real-time FPS monitor
    TSharedPtr<FJsonObject> FPSConfig = MakeShareable(new FJsonObject);
    FPSConfig->SetStringField(TEXT("title"), TEXT("FPS Monitor"));
    FPSConfig->SetNumberField(TEXT("maxDataPoints"), 100);
    FPSConfig->SetBoolField(TEXT("realTime"), true);

    TSharedPtr<FJsonObject> YAxis = MakeShareable(new FJsonObject);
    YAxis->SetNumberField(TEXT("min"), 0);
    YAxis->SetNumberField(TEXT("max"), 120);
    FPSConfig->SetObjectField(TEXT("yAxis"), YAxis);

    TArray<TSharedPtr<FJsonValue>> FPSDatasets;
    TSharedPtr<FJsonObject> FPSDataset = MakeShareable(new FJsonObject);
    FPSDataset->SetStringField(TEXT("name"), TEXT("FPS"));
    FPSDataset->SetStringField(TEXT("color"), TEXT("#ff6b6b"));
    FPSDatasets.Add(MakeShareable(new FJsonValueObject(FPSDataset)));
    FPSConfig->SetArrayField(TEXT("datasets"), FPSDatasets);

    VisualizationBridge->CreateLineChart(TEXT("fpsChart"), FPSConfig);

    // System performance multi-line chart
    TSharedPtr<FJsonObject> PerfConfig = MakeShareable(new FJsonObject);
    PerfConfig->SetStringField(TEXT("title"), TEXT("System Performance"));
    PerfConfig->SetNumberField(TEXT("maxDataPoints"), 200);
    PerfConfig->SetBoolField(TEXT("realTime"), true);

    TArray<TSharedPtr<FJsonValue>> PerfDatasets;

    TSharedPtr<FJsonObject> FPSPerfDataset = MakeShareable(new FJsonObject);
    FPSPerfDataset->SetStringField(TEXT("name"), TEXT("FPS"));
    FPSPerfDataset->SetStringField(TEXT("color"), TEXT("#ff6b6b"));
    PerfDatasets.Add(MakeShareable(new FJsonValueObject(FPSPerfDataset)));

    TSharedPtr<FJsonObject> MemoryDataset = MakeShareable(new FJsonObject);
    MemoryDataset->SetStringField(TEXT("name"), TEXT("Memory (MB)"));
    MemoryDataset->SetStringField(TEXT("color"), TEXT("#4ecdc4"));
    PerfDatasets.Add(MakeShareable(new FJsonValueObject(MemoryDataset)));

    TSharedPtr<FJsonObject> CPUDataset = MakeShareable(new FJsonObject);
    CPUDataset->SetStringField(TEXT("name"), TEXT("CPU %"));
    CPUDataset->SetStringField(TEXT("color"), TEXT("#45b7d1"));
    PerfDatasets.Add(MakeShareable(new FJsonValueObject(CPUDataset)));

    PerfConfig->SetArrayField(TEXT("datasets"), PerfDatasets);
    VisualizationBridge->CreateLineChart(TEXT("systemPerformance"), PerfConfig);

    // Performance gauge
    TSharedPtr<FJsonObject> GaugeConfig = MakeShareable(new FJsonObject);
    GaugeConfig->SetStringField(TEXT("title"), TEXT("Overall Performance"));
    GaugeConfig->SetNumberField(TEXT("min"), 0);
    GaugeConfig->SetNumberField(TEXT("max"), 100);

    TArray<TSharedPtr<FJsonValue>> Thresholds;

    TSharedPtr<FJsonObject> LowThreshold = MakeShareable(new FJsonObject);
    LowThreshold->SetNumberField(TEXT("value"), 30);
    LowThreshold->SetStringField(TEXT("color"), TEXT("#ff4444"));
    Thresholds.Add(MakeShareable(new FJsonValueObject(LowThreshold)));

    TSharedPtr<FJsonObject> MedThreshold = MakeShareable(new FJsonObject);
    MedThreshold->SetNumberField(TEXT("value"), 60);
    MedThreshold->SetStringField(TEXT("color"), TEXT("#ffaa00"));
    Thresholds.Add(MakeShareable(new FJsonValueObject(MedThreshold)));

    TSharedPtr<FJsonObject> HighThreshold = MakeShareable(new FJsonObject);
    HighThreshold->SetNumberField(TEXT("value"), 85);
    HighThreshold->SetStringField(TEXT("color"), TEXT("#44ff44"));
    Thresholds.Add(MakeShareable(new FJsonValueObject(HighThreshold)));

    GaugeConfig->SetArrayField(TEXT("thresholds"), Thresholds);
    VisualizationBridge->CreateGauge(TEXT("performanceGauge"), GaugeConfig);

    UE_LOG(LogDataVizExample, Log, TEXT("Performance monitoring setup complete"));
}

void ADataVisualizationExample::UpdatePerformanceMonitoring()
{
    if (PerformanceMonitor)
    {
        FPerformanceMetrics Metrics = PerformanceMonitor->GetCurrentMetrics();

        int64 Timestamp = FDateTime::Now().ToUnixTimestamp();

        // Update FPS chart
        VisualizationBridge->UpdateChart(TEXT("fpsChart"), Timestamp, Metrics.FPS);

        // Update multi-line performance chart
        TSharedPtr<FJsonObject> MultiData = MakeShareable(new FJsonObject);
        MultiData->SetNumberField(TEXT("timestamp"), Timestamp);

        TSharedPtr<FJsonObject> Data = MakeShareable(new FJsonObject);
        Data->SetNumberField(TEXT("FPS"), Metrics.FPS);
        Data->SetNumberField(TEXT("Memory"), Metrics.MemoryUsageMB);
        Data->SetNumberField(TEXT("CPU"), Metrics.CPUUsagePercent);
        MultiData->SetObjectField(TEXT("data"), Data);

        VisualizationBridge->UpdateChartMultiData(TEXT("systemPerformance"), MultiData);

        // Update performance gauge
        float PerformanceScore = CalculatePerformanceScore(Metrics);
        VisualizationBridge->UpdateChart(TEXT("performanceGauge"), Timestamp, PerformanceScore);
    }
}

float ADataVisualizationExample::CalculatePerformanceScore(const FPerformanceMetrics& Metrics) const
{
    float FPSScore = FMath::Clamp(Metrics.FPS / 60.0f, 0.0f, 1.0f) * 40.0f;
    float MemoryScore = FMath::Clamp(1.0f - (Metrics.MemoryUsageMB / 2048.0f), 0.0f, 1.0f) * 30.0f;
    float CPUScore = FMath::Clamp(1.0f - (Metrics.CPUUsagePercent / 100.0f), 0.0f, 1.0f) * 30.0f;

    return FPSScore + MemoryScore + CPUScore;
}

// Player Statistics

void ADataVisualizationExample::SetupPlayerStatistics()
{
    // Health gauge
    TSharedPtr<FJsonObject> HealthConfig = MakeShareable(new FJsonObject);
    HealthConfig->SetStringField(TEXT("title"), TEXT("Health"));
    HealthConfig->SetNumberField(TEXT("min"), 0);
    HealthConfig->SetNumberField(TEXT("max"), 100);
    HealthConfig->SetNumberField(TEXT("value"), CurrentPlayer.Health);
    HealthConfig->SetStringField(TEXT("color"), TEXT("#ff4444"));
    VisualizationBridge->CreateGauge(TEXT("healthGauge"), HealthConfig);

    // Mana gauge
    TSharedPtr<FJsonObject> ManaConfig = MakeShareable(new FJsonObject);
    ManaConfig->SetStringField(TEXT("title"), TEXT("Mana"));
    ManaConfig->SetNumberField(TEXT("min"), 0);
    ManaConfig->SetNumberField(TEXT("max"), 100);
    ManaConfig->SetNumberField(TEXT("value"), CurrentPlayer.Mana);
    ManaConfig->SetStringField(TEXT("color"), TEXT("#4444ff"));
    VisualizationBridge->CreateGauge(TEXT("manaGauge"), ManaConfig);

    // Experience gauge
    TSharedPtr<FJsonObject> ExpConfig = MakeShareable(new FJsonObject);
    ExpConfig->SetStringField(TEXT("title"), TEXT("Experience"));
    ExpConfig->SetNumberField(TEXT("min"), 0);
    ExpConfig->SetNumberField(TEXT("max"), 1000);
    ExpConfig->SetNumberField(TEXT("value"), CurrentPlayer.Experience);
    ExpConfig->SetStringField(TEXT("color"), TEXT("#ffaa00"));
    VisualizationBridge->CreateGauge(TEXT("experienceGauge"), ExpConfig);

    // Skills chart
    TSharedPtr<FJsonObject> SkillsConfig = MakeShareable(new FJsonObject);
    SkillsConfig->SetStringField(TEXT("title"), TEXT("Player Skills"));
    SkillsConfig->SetBoolField(TEXT("horizontal"), true);
    SkillsConfig->SetArrayField(TEXT("data"), SkillsToJsonArray());
    VisualizationBridge->CreateBarChart(TEXT("skillsChart"), SkillsConfig);

    // Inventory pie chart
    TSharedPtr<FJsonObject> InventoryConfig = MakeShareable(new FJsonObject);
    InventoryConfig->SetStringField(TEXT("title"), TEXT("Inventory Distribution"));
    InventoryConfig->SetArrayField(TEXT("data"), InventoryToJsonArray());
    VisualizationBridge->CreatePieChart(TEXT("inventoryChart"), InventoryConfig);

    UE_LOG(LogDataVizExample, Log, TEXT("Player statistics setup complete"));
}

void ADataVisualizationExample::UpdatePlayerStatistics()
{
    // Simulate player data changes
    SimulatePlayerDataChanges();

    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();

    // Update gauges
    VisualizationBridge->UpdateChart(TEXT("healthGauge"), Timestamp, CurrentPlayer.Health);
    VisualizationBridge->UpdateChart(TEXT("manaGauge"), Timestamp, CurrentPlayer.Mana);
    VisualizationBridge->UpdateChart(TEXT("experienceGauge"), Timestamp, CurrentPlayer.Experience);

    // Update charts
    VisualizationBridge->UpdateChartArray(TEXT("skillsChart"), SkillsToJsonArray());
    VisualizationBridge->UpdateChartArray(TEXT("inventoryChart"), InventoryToJsonArray());
}

void ADataVisualizationExample::SimulatePlayerDataChanges()
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

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::SkillsToJsonArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Skill : CurrentPlayer.Skills)
    {
        TSharedPtr<FJsonObject> SkillObj = MakeShareable(new FJsonObject);
        SkillObj->SetStringField(TEXT("name"), Skill.Key);
        SkillObj->SetNumberField(TEXT("value"), Skill.Value);
        Result.Add(MakeShareable(new FJsonValueObject(SkillObj)));
    }

    return Result;
}

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::InventoryToJsonArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Item : CurrentPlayer.Inventory)
    {
        TSharedPtr<FJsonObject> ItemObj = MakeShareable(new FJsonObject);
        ItemObj->SetStringField(TEXT("name"), Item.Key);
        ItemObj->SetNumberField(TEXT("value"), Item.Value);
        Result.Add(MakeShareable(new FJsonValueObject(ItemObj)));
    }

    return Result;
}

// Game Analytics

void ADataVisualizationExample::SetupGameAnalytics()
{
    // Leaderboard
    TSharedPtr<FJsonObject> LeaderboardConfig = MakeShareable(new FJsonObject);
    LeaderboardConfig->SetStringField(TEXT("title"), TEXT("Top Players"));
    LeaderboardConfig->SetBoolField(TEXT("horizontal"), true);
    LeaderboardConfig->SetNumberField(TEXT("maxEntries"), 10);
    LeaderboardConfig->SetArrayField(TEXT("data"), GetLeaderboardArray());
    VisualizationBridge->CreateBarChart(TEXT("leaderboard"), LeaderboardConfig);

    // Player activity heatmap
    TSharedPtr<FJsonObject> HeatmapConfig = MakeShareable(new FJsonObject);
    HeatmapConfig->SetStringField(TEXT("title"), TEXT("Player Activity Zones"));
    HeatmapConfig->SetNumberField(TEXT("width"), 20);
    HeatmapConfig->SetNumberField(TEXT("height"), 20);

    TArray<TSharedPtr<FJsonValue>> ColorScale;
    ColorScale.Add(MakeShareable(new FJsonValueString(TEXT("#000033"))));
    ColorScale.Add(MakeShareable(new FJsonValueString(TEXT("#0066cc"))));
    ColorScale.Add(MakeShareable(new FJsonValueString(TEXT("#00ccff"))));
    ColorScale.Add(MakeShareable(new FJsonValueString(TEXT("#ffff00"))));
    ColorScale.Add(MakeShareable(new FJsonValueString(TEXT("#ff0000"))));
    HeatmapConfig->SetArrayField(TEXT("colorScale"), ColorScale);

    VisualizationBridge->CreateHeatmap(TEXT("activityHeatmap"), HeatmapConfig);

    // Session time distribution
    TSharedPtr<FJsonObject> SessionConfig = MakeShareable(new FJsonObject);
    SessionConfig->SetStringField(TEXT("title"), TEXT("Session Time Distribution"));

    TArray<TSharedPtr<FJsonValue>> SessionData;

    TSharedPtr<FJsonObject> Session1 = MakeShareable(new FJsonObject);
    Session1->SetStringField(TEXT("name"), TEXT("0-30 min"));
    Session1->SetNumberField(TEXT("value"), 25);
    SessionData.Add(MakeShareable(new FJsonValueObject(Session1)));

    TSharedPtr<FJsonObject> Session2 = MakeShareable(new FJsonObject);
    Session2->SetStringField(TEXT("name"), TEXT("30-60 min"));
    Session2->SetNumberField(TEXT("value"), 35);
    SessionData.Add(MakeShareable(new FJsonValueObject(Session2)));

    TSharedPtr<FJsonObject> Session3 = MakeShareable(new FJsonObject);
    Session3->SetStringField(TEXT("name"), TEXT("1-2 hours"));
    Session3->SetNumberField(TEXT("value"), 25);
    SessionData.Add(MakeShareable(new FJsonValueObject(Session3)));

    TSharedPtr<FJsonObject> Session4 = MakeShareable(new FJsonObject);
    Session4->SetStringField(TEXT("name"), TEXT("2+ hours"));
    Session4->SetNumberField(TEXT("value"), 15);
    SessionData.Add(MakeShareable(new FJsonValueObject(Session4)));

    SessionConfig->SetArrayField(TEXT("data"), SessionData);
    VisualizationBridge->CreatePieChart(TEXT("sessionTimeChart"), SessionConfig);

    UE_LOG(LogDataVizExample, Log, TEXT("Game analytics setup complete"));
}

void ADataVisualizationExample::UpdateGameAnalytics()
{
    // Update leaderboard with simulated changes
    SimulateLeaderboardChanges();
    VisualizationBridge->UpdateChartArray(TEXT("leaderboard"), GetLeaderboardArray());

    // Update activity heatmap
    UpdateActivityHeatmap();
}

void ADataVisualizationExample::SimulateLeaderboardChanges()
{
    // Randomly update some player scores
    for (FPlayerData& Player : LeaderboardData)
    {
        if (FMath::RandRange(0.0f, 1.0f) < 0.2f)
        {
            Player.Score += FMath::RandRange(50, 200);
        }
    }
}

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::GetLeaderboardArray() const
{
    // Sort by score descending
    TArray<FPlayerData> SortedPlayers = LeaderboardData;
    SortedPlayers.Sort([](const FPlayerData& A, const FPlayerData& B) {
        return A.Score > B.Score;
    });

    TArray<TSharedPtr<FJsonValue>> Result;
    for (int32 i = 0; i < FMath::Min(10, SortedPlayers.Num()); i++)
    {
        const FPlayerData& Player = SortedPlayers[i];
        TSharedPtr<FJsonObject> PlayerObj = MakeShareable(new FJsonObject);
        PlayerObj->SetStringField(TEXT("name"), Player.PlayerName);
        PlayerObj->SetNumberField(TEXT("value"), Player.Score);
        Result.Add(MakeShareable(new FJsonValueObject(PlayerObj)));
    }

    return Result;
}

void ADataVisualizationExample::UpdateActivityHeatmap()
{
    // Generate simulated activity data
    TArray<TSharedPtr<FJsonValue>> HeatmapData;

    for (int32 x = 0; x < 20; x++)
    {
        for (int32 y = 0; y < 20; y++)
        {
            FVector2D Point(x, y);
            FVector2D Center1(10, 10);
            FVector2D Center2(5, 15);

            float Distance1 = FVector2D::Distance(Point, Center1);
            float Distance2 = FVector2D::Distance(Point, Center2);

            float Intensity = FMath::Max(0.0f, 1.0f - (Distance1 / 10.0f)) + FMath::Max(0.0f, 1.0f - (Distance2 / 8.0f));
            Intensity += FMath::RandRange(0.0f, 0.2f);
            Intensity = FMath::Clamp(Intensity, 0.0f, 1.0f);

            HeatmapData.Add(MakeShareable(new FJsonValueNumber(Intensity)));
        }
    }

    VisualizationBridge->UpdateChartArray(TEXT("activityHeatmap"), HeatmapData);
}

// Economy Tracking

void ADataVisualizationExample::SetupEconomyTracking()
{
    // Resource distribution
    TSharedPtr<FJsonObject> ResourceConfig = MakeShareable(new FJsonObject);
    ResourceConfig->SetStringField(TEXT("title"), TEXT("Resource Distribution"));
    ResourceConfig->SetBoolField(TEXT("donut"), true);
    ResourceConfig->SetArrayField(TEXT("data"), GetResourceArray());
    VisualizationBridge->CreatePieChart(TEXT("resourceDistribution"), ResourceConfig);

    // Price history
    TSharedPtr<FJsonObject> PriceConfig = MakeShareable(new FJsonObject);
    PriceConfig->SetStringField(TEXT("title"), TEXT("Market Prices"));
    PriceConfig->SetArrayField(TEXT("datasets"), GetPriceDatasets());
    PriceConfig->SetBoolField(TEXT("realTime"), true);
    PriceConfig->SetNumberField(TEXT("maxDataPoints"), 50);
    VisualizationBridge->CreateLineChart(TEXT("priceHistory"), PriceConfig);

    // Transaction volume
    TSharedPtr<FJsonObject> VolumeConfig = MakeShareable(new FJsonObject);
    VolumeConfig->SetStringField(TEXT("title"), TEXT("Transaction Volume"));
    VolumeConfig->SetArrayField(TEXT("data"), GetVolumeArray());
    VisualizationBridge->CreateBarChart(TEXT("transactionVolume"), VolumeConfig);

    UE_LOG(LogDataVizExample, Log, TEXT("Economy tracking setup complete"));
}

void ADataVisualizationExample::UpdateEconomyTracking()
{
    // Simulate market fluctuations
    SimulateMarketChanges();

    // Update resource distribution
    VisualizationBridge->UpdateChartArray(TEXT("resourceDistribution"), GetResourceArray());

    // Update price history
    int64 Timestamp = FDateTime::Now().ToUnixTimestamp();
    TSharedPtr<FJsonObject> PriceData = MakeShareable(new FJsonObject);
    PriceData->SetNumberField(TEXT("timestamp"), Timestamp);

    TSharedPtr<FJsonObject> Prices = MakeShareable(new FJsonObject);
    for (const auto& Price : EconomyData.Prices)
    {
        Prices->SetNumberField(Price.Key, Price.Value);
    }
    PriceData->SetObjectField(TEXT("data"), Prices);

    VisualizationBridge->UpdateChartMultiData(TEXT("priceHistory"), PriceData);

    // Simulate new transaction
    if (FMath::RandRange(0.0f, 1.0f) < 0.3f)
    {
        SimulateTransaction();
    }
}

void ADataVisualizationExample::SimulateMarketChanges()
{
    // Simulate price fluctuations
    for (auto& Price : EconomyData.Prices)
    {
        float Change = FMath::RandRange(-0.5f, 0.5f);
        Price.Value = FMath::Max(0.1f, Price.Value + Change);
    }

    // Simulate resource quantity changes
    for (auto& Resource : EconomyData.Resources)
    {
        float Change = FMath::RandRange(-2.0f, 3.0f);
        Resource.Value = FMath::Max(0.0f, Resource.Value + Change);
    }
}

void ADataVisualizationExample::SimulateTransaction()
{
    TArray<FString> ResourceKeys;
    EconomyData.Resources.GenerateKeyArray(ResourceKeys);

    if (ResourceKeys.Num() > 0)
    {
        FString RandomResource = ResourceKeys[FMath::RandRange(0, ResourceKeys.Num() - 1)];

        FTransaction Transaction;
        Transaction.Item = RandomResource;
        Transaction.Quantity = FMath::RandRange(1, 10);
        Transaction.Price = *EconomyData.Prices.Find(RandomResource);
        Transaction.Timestamp = FDateTime::Now();
        Transaction.PlayerName = FString::Printf(TEXT("Player%d"), FMath::RandRange(1, 100));

        EconomyData.RecentTransactions.Add(Transaction);

        // Keep only recent transactions
        if (EconomyData.RecentTransactions.Num() > 100)
        {
            EconomyData.RecentTransactions.RemoveAt(0);
        }

        UE_LOG(LogDataVizExample, Log, TEXT("New transaction: %s bought %d %s for %.2f each"),
               *Transaction.PlayerName, Transaction.Quantity, *Transaction.Item, Transaction.Price);
    }
}

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::GetResourceArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Resource : EconomyData.Resources)
    {
        TSharedPtr<FJsonObject> ResourceObj = MakeShareable(new FJsonObject);
        ResourceObj->SetStringField(TEXT("name"), Resource.Key);
        ResourceObj->SetNumberField(TEXT("value"), Resource.Value);
        ResourceObj->SetStringField(TEXT("color"), GetResourceColor(Resource.Key));
        Result.Add(MakeShareable(new FJsonValueObject(ResourceObj)));
    }

    return Result;
}

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::GetPriceDatasets() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Price : EconomyData.Prices)
    {
        TSharedPtr<FJsonObject> Dataset = MakeShareable(new FJsonObject);
        Dataset->SetStringField(TEXT("name"), Price.Key);
        Dataset->SetStringField(TEXT("color"), GetResourceColor(Price.Key));
        Result.Add(MakeShareable(new FJsonValueObject(Dataset)));
    }

    return Result;
}

TArray<TSharedPtr<FJsonValue>> ADataVisualizationExample::GetVolumeArray() const
{
    TArray<TSharedPtr<FJsonValue>> Result;

    for (const auto& Resource : EconomyData.Resources)
    {
        TSharedPtr<FJsonObject> VolumeObj = MakeShareable(new FJsonObject);
        VolumeObj->SetStringField(TEXT("name"), Resource.Key);
        VolumeObj->SetNumberField(TEXT("value"), FMath::RandRange(5, 25));
        Result.Add(MakeShareable(new FJsonValueObject(VolumeObj)));
    }

    return Result;
}

FString ADataVisualizationExample::GetResourceColor(const FString& Resource) const
{
    if (Resource == TEXT("Wood"))
        return TEXT("#8b4513");
    else if (Resource == TEXT("Stone"))
        return TEXT("#696969");
    else if (Resource == TEXT("Iron"))
        return TEXT("#708090");
    else if (Resource == TEXT("Gold"))
        return TEXT("#ffd700");
    else
        return TEXT("#cccccc");
}

// Theme and Configuration

void ADataVisualizationExample::ApplyGameTheme()
{
    TSharedPtr<FJsonObject> GameTheme = MakeShareable(new FJsonObject);

    TSharedPtr<FJsonObject> Colors = MakeShareable(new FJsonObject);
    Colors->SetStringField(TEXT("primary"), TEXT("#ff6b6b"));
    Colors->SetStringField(TEXT("secondary"), TEXT("#4ecdc4"));
    Colors->SetStringField(TEXT("background"), TEXT("#1a1a2e"));
    Colors->SetStringField(TEXT("text"), TEXT("#eee"));
    Colors->SetStringField(TEXT("accent"), TEXT("#ffd93d"));
    GameTheme->SetObjectField(TEXT("colors"), Colors);

    TSharedPtr<FJsonObject> Fonts = MakeShareable(new FJsonObject);
    Fonts->SetStringField(TEXT("title"), TEXT("Orbitron"));
    Fonts->SetStringField(TEXT("body"), TEXT("Roboto Mono"));
    GameTheme->SetObjectField(TEXT("fonts"), Fonts);

    TSharedPtr<FJsonObject> Borders = MakeShareable(new FJsonObject);
    Borders->SetNumberField(TEXT("radius"), 8);
    Borders->SetBoolField(TEXT("glow"), true);
    Borders->SetStringField(TEXT("color"), TEXT("#333"));
    GameTheme->SetObjectField(TEXT("borders"), Borders);

    TSharedPtr<FJsonObject> Animations = MakeShareable(new FJsonObject);
    Animations->SetBoolField(TEXT("enabled"), true);
    Animations->SetNumberField(TEXT("duration"), 300);
    GameTheme->SetObjectField(TEXT("animations"), Animations);

    VisualizationBridge->SetTheme(GameTheme);
    UE_LOG(LogDataVizExample, Log, TEXT("Game theme applied"));
}

// Update Logic

void ADataVisualizationExample::UpdateSimulatedGameData(float DeltaTime)
{
    // Simulate player movement
    CurrentPlayer.Position += FVector(
        FMath::RandRange(-0.1f, 0.1f),
        FMath::RandRange(-0.1f, 0.1f),
        0.0f
    );

    // Update playtime
    CurrentPlayer.Playtime += DeltaTime;

    // Update performance monitor
    if (PerformanceMonitor)
    {
        PerformanceMonitor->Update(DeltaTime);
    }
}

void ADataVisualizationExample::UpdateVisualizationsBasedOnIntervals()
{
    float CurrentTime = GetWorld()->GetTimeSeconds();

    // Performance monitoring updates
    if (bEnablePerformanceMonitoring && (CurrentTime - LastPerformanceUpdate) >= PerformanceUpdateInterval)
    {
        UpdatePerformanceMonitoring();
        LastPerformanceUpdate = CurrentTime;
    }

    // Player statistics updates
    if (bEnablePlayerStats && (CurrentTime - LastPlayerStatsUpdate) >= PlayerStatsUpdateInterval)
    {
        UpdatePlayerStatistics();
        LastPlayerStatsUpdate = CurrentTime;
    }

    // Game analytics updates
    if (bEnableGameAnalytics && (CurrentTime - LastAnalyticsUpdate) >= AnalyticsUpdateInterval)
    {
        UpdateGameAnalytics();
        LastAnalyticsUpdate = CurrentTime;
    }

    // Economy tracking updates
    if (bEnableEconomyTracking && (CurrentTime - LastEconomyUpdate) >= EconomyUpdateInterval)
    {
        UpdateEconomyTracking();
        LastEconomyUpdate = CurrentTime;
    }
}

// Event Handlers

void ADataVisualizationExample::HandleThresholdCrossed(const FString& ChartId, const FString& ThresholdData)
{
    UE_LOG(LogDataVizExample, Warning, TEXT("Threshold crossed in chart '%s': %s"), *ChartId, *ThresholdData);

    if (ChartId == TEXT("fpsChart"))
    {
        HandleFPSThreshold(ThresholdData);
    }
    else if (ChartId == TEXT("healthGauge"))
    {
        HandleHealthThreshold(ThresholdData);
    }
    else if (ChartId == TEXT("performanceGauge"))
    {
        HandlePerformanceThreshold(ThresholdData);
    }
}

void ADataVisualizationExample::HandleDataPointAdded(const FString& ChartId, const FString& DataPoint)
{
    // Log data point additions if needed (debug mode)
    if (bEnableDebugLogging)
    {
        UE_LOG(LogDataVizExample, Log, TEXT("Data point added to '%s': %s"), *ChartId, *DataPoint);
    }
}

void ADataVisualizationExample::HandleChartError(const FString& ChartId, const FString& ErrorMessage)
{
    UE_LOG(LogDataVizExample, Error, TEXT("Chart error in '%s': %s"), *ChartId, *ErrorMessage);
}

void ADataVisualizationExample::HandleFPSThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Red, TEXT("Performance Warning: FPS too low!"));
    }
}

void ADataVisualizationExample::HandleHealthThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Red, TEXT("Health Warning: Player health critical!"));
    }
}

void ADataVisualizationExample::HandlePerformanceThreshold(const FString& Data)
{
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor::Yellow, TEXT("Performance below threshold - consider reducing quality"));
    }
}

// Public Interface

void ADataVisualizationExample::TogglePerformanceMonitoring()
{
    bEnablePerformanceMonitoring = !bEnablePerformanceMonitoring;
    UE_LOG(LogDataVizExample, Log, TEXT("Performance monitoring: %s"), bEnablePerformanceMonitoring ? TEXT("Enabled") : TEXT("Disabled"));
}

void ADataVisualizationExample::TogglePlayerStats()
{
    bEnablePlayerStats = !bEnablePlayerStats;
    UE_LOG(LogDataVizExample, Log, TEXT("Player statistics: %s"), bEnablePlayerStats ? TEXT("Enabled") : TEXT("Disabled"));
}

void ADataVisualizationExample::ToggleGameAnalytics()
{
    bEnableGameAnalytics = !bEnableGameAnalytics;
    UE_LOG(LogDataVizExample, Log, TEXT("Game analytics: %s"), bEnableGameAnalytics ? TEXT("Enabled") : TEXT("Disabled"));
}

void ADataVisualizationExample::ToggleEconomyTracking()
{
    bEnableEconomyTracking = !bEnableEconomyTracking;
    UE_LOG(LogDataVizExample, Log, TEXT("Economy tracking: %s"), bEnableEconomyTracking ? TEXT("Enabled") : TEXT("Disabled"));
}

void ADataVisualizationExample::ResetAllCharts()
{
    if (VisualizationBridge)
    {
        VisualizationBridge->ClearAllCharts();

        GetWorld()->GetTimerManager().SetTimer(
            ResetTimerHandle,
            this,
            &ADataVisualizationExample::InitializeAllVisualizations,
            1.0f,
            false
        );
    }
}

// Cleanup

void ADataVisualizationExample::CleanupExample()
{
    if (VisualizationBridge)
    {
        VisualizationBridge->OnThresholdCrossed.RemoveDynamic(this, &ADataVisualizationExample::HandleThresholdCrossed);
        VisualizationBridge->OnDataPointAdded.RemoveDynamic(this, &ADataVisualizationExample::HandleDataPointAdded);
        VisualizationBridge->OnChartError.RemoveDynamic(this, &ADataVisualizationExample::HandleChartError);

        VisualizationBridge->ClearAllCharts();
        VisualizationBridge->Dispose();
    }

    ActiveCharts.Empty();
    UE_LOG(LogDataVizExample, Log, TEXT("Data Visualization Example cleanup complete"));
}