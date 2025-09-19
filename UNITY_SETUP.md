# Unity Setup Guide 🎮

Bu rehber Unity'de simulation paketlerinizi nasıl kullanacağınızı adım adım gösterir.

## 🚀 Kurulum Adımları

### 1. Unity Projesini Hazırlayın

```bash
# Unity 2020.3 veya daha yeni sürüm gereklidir
Unity Hub > New Project > 3D Template
```

### 2. Newtonsoft JSON Paketini Yükleyin

Unity Package Manager'da:
1. **Window > Package Manager**
2. **+ (Add Package) > Add package by name**
3. **com.unity.nuget.newtonsoft-json** yazın
4. **Add** butonuna basın

### 3. Simulation Paketlerini Kopyalayın

```bash
# Bu repository'deki Unity klasörlerini Unity projenize kopyalayın:
cp -r unity-sim-packs/packages/*/Unity/* YourUnityProject/Assets/Scripts/Simulations/

# Veya manuel olarak:
# 1. packages/weather/Unity/ klasörünü Assets/Scripts/Weather/ içine kopyalayın
# 2. packages/economy/Unity/ klasörünü Assets/Scripts/Economy/ içine kopyalayın
# 3. Diğer paketler için aynısını yapın
```

## 📦 Mevcut Unity C# Simulation Sistemleri

### ✅ Hazır Paketler:
- **WeatherSystem.cs** - Dinamik hava durumu simulasyonu
- **EconomySystem.cs** - Ekonomik model ve piyasa simulasyonu
- **PhysicsSystem.cs** - Fizik sistemi izleme
- **AiSystem.cs** - AI agent davranış simulasyonu
- **ProceduralGenerationSystem.cs** - Prosedürel dünya oluşturma
- **DisasterManagementSystem.cs** - Afet yönetim simulasyonu
- **AnalyticsSystem.cs** - Veri analizi ve metrikleri
- **ModdingSystem.cs** - Mod yönetim sistemi
- **NetworkMultiplayerSystem.cs** - Çok oyunculu networking
- **SupplyChainSystem.cs** - Tedarik zinciri yönetimi
- **UrbanPlanningSystem.cs** - Şehir planlama simulasyonu
- **VehicleSimulationSystem.cs** - Araç ve trafik simulasyonu

## 🎯 Hızlı Kullanım

### 1. Temel Weather System

```csharp
// Scene'e WeatherSystem componenti ekleyin
public class GameManager : MonoBehaviour
{
    public WeatherSystem weather;

    void Start()
    {
        // Weather verilerini dinleyin
        weather.OnWeatherChanged += HandleWeatherChange;
    }

    void HandleWeatherChange(WeatherData data)
    {
        Debug.Log($"Temperature: {data.weather.temperature}°C");
        Debug.Log($"Wind Speed: {data.weather.windSpeed} km/h");

        // Unity JSON formatında export
        string jsonData = weather.ExportState();
        Debug.Log(jsonData);
    }
}
```

### 2. Comprehensive Simulation Manager

```csharp
// SimulationManager.cs'i sahnenize ekleyin ve referansları ayarlayın
public class MyGameController : MonoBehaviour
{
    public SimulationManager simManager;

    void Start()
    {
        // Otomatik export'u aktifleştirin
        simManager.autoExport = true;
        simManager.exportInterval = 2f; // 2 saniyede bir export
    }

    void Update()
    {
        // Space tuşu ile manuel export
        if (Input.GetKeyDown(KeyCode.Space))
        {
            simManager.ExportAllData();
        }
    }
}
```

## 🔧 Advanced Kullanım

### 1. Multiple Simulations

```csharp
public class MultiSimulationController : MonoBehaviour
{
    [Header("All Simulation Systems")]
    public WeatherSystem weather;
    public EconomySystem economy;
    public UrbanPlanningSystem urbanPlanning;
    public VehicleSimulationSystem vehicles;

    void Start()
    {
        // Tüm simulasyon sistemlerini başlat
        StartAllSimulations();

        // Cross-system interactions
        SetupInteractions();
    }

    void SetupInteractions()
    {
        // Weather, economy'yi etkilesin
        weather.OnWeatherChanged += (data) => {
            if (data.weather.temperature < 0) {
                // Soğuk hava ekonomiyi etkileyebilir
                economy.GetData().economy.marketValue *= 0.98f;
            }
        };
    }

    [ContextMenu("Export All Systems")]
    void ExportAllSystems()
    {
        var allData = new {
            weather = weather.GetData(),
            economy = economy.GetData(),
            urbanPlanning = urbanPlanning.GetData(),
            vehicles = vehicles.GetData(),
            exportTime = System.DateTime.Now
        };

        string json = JsonConvert.SerializeObject(allData, Formatting.Indented);
        Debug.Log("🌍 COMPLETE SIMULATION STATE:");
        Debug.Log(json);
    }
}
```

### 2. Real-time Data Streaming

```csharp
public class SimulationDataStreamer : MonoBehaviour
{
    [Header("Data Streaming")]
    public string serverUrl = "ws://localhost:8080/simulation";
    public float streamInterval = 1f;

    private WebSocket webSocket;
    private float streamTimer;

    void Start()
    {
        InitializeWebSocket();
    }

    void Update()
    {
        streamTimer += Time.deltaTime;
        if (streamTimer >= streamInterval)
        {
            StreamSimulationData();
            streamTimer = 0f;
        }
    }

    void StreamSimulationData()
    {
        var allSystems = FindObjectsOfType<MonoBehaviour>()
            .Where(mb => mb.name.Contains("System"))
            .ToList();

        foreach (var system in allSystems)
        {
            if (system.GetType().GetMethod("ExportState") != null)
            {
                string data = (string)system.GetType()
                    .GetMethod("ExportState")
                    .Invoke(system, null);

                SendToServer(data);
            }
        }
    }
}
```

## 🎮 Sahne Kurulumu

### 1. Temel Sahne Yapısı

```
GameObject Hierarchy:
├── Main Camera
├── Directional Light
├── SimulationManager (SimulationManager.cs)
├── Simulations/
│   ├── Weather (WeatherSystem.cs)
│   ├── Economy (EconomySystem.cs)
│   ├── Physics (PhysicsSystem.cs)
│   └── AI (AiSystem.cs)
├── UI/
│   ├── Canvas
│   ├── Weather Display (Text)
│   ├── Economy Display (Text)
│   └── Export Button
└── Environment/
    ├── Terrain
    ├── Buildings
    └── Effects
```

### 2. UI Setup

Canvas üzerinde:
- **Text** componentleri (Weather Display, Economy Display, vs.)
- **Button** componentleri (Export, Toggle Auto Export)
- **SimulationManager** referanslarını Inspector'da ayarlayın

## 📊 Data Export Formatları

### Weather System Export:
```json
{
  "timestamp": 1634567890123,
  "currentTime": 1634567890123,
  "weather": {
    "temperature": 23.5,
    "humidity": 65,
    "pressure": 1015.2,
    "windSpeed": 12.3,
    "systemHealth": "operational",
    "framework": "unity-sim-weather"
  }
}
```

### Economy System Export:
```json
{
  "timestamp": 1634567890123,
  "currentTime": 1634567890123,
  "economy": {
    "marketValue": 8750.25,
    "inflation": 2.1,
    "unemployment": 6.8,
    "gdpGrowth": 3.2,
    "systemHealth": "operational",
    "framework": "unity-sim-economy"
  }
}
```

## 🛠️ Troubleshooting

### Yaygın Sorunlar:

1. **"JsonConvert not found" hatası**
   - Newtonsoft.Json paketinin yüklü olduğundan emin olun

2. **"Namespace UnitySim not found" hatası**
   - Assembly Definition dosyalarının doğru yerde olduğunu kontrol edin

3. **Simulation systems çalışmıyor**
   - MonoBehaviour componentlerinin GameObject'lere eklendiğini kontrol edin
   - Update interval'ların 0'dan büyük olduğunu kontrol edin

### Debug İpuçları:

```csharp
// Console'da simulation durumunu kontrol edin
Debug.Log($"Weather System Active: {weatherSystem != null && weatherSystem.enabled}");
Debug.Log($"Update Interval: {weatherSystem.updateInterval}");
Debug.Log($"Current Data: {weatherSystem.ExportState()}");
```

## 🎯 Production İpuçları

1. **Performance Optimization:**
   - Update interval'ları ihtiyacınıza göre ayarlayın (1-5 saniye arası)
   - Gereksiz export'ları kapatın

2. **Data Management:**
   - Büyük data setleri için async export kullanın
   - JSON data'yı dosyalara kaydetmek için StreamingAssets klasörünü kullanın

3. **Multi-platform:**
   - WebGL builds için WebSocket connections kullanın
   - Mobile builds için lightweight versiyonlar kullanın

## 🎉 Başarı!

Artık Unity projenizde tamamen işlevsel simulation sistemleriniz var!

- ✅ 12 farklı simulation sistemi
- ✅ Real-time data export
- ✅ Unity-compatible JSON format
- ✅ Cross-system interactions
- ✅ UI integration ready

**Happy Simulating!** 🚀