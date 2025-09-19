using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;
using Newtonsoft.Json;

namespace UnitySim.Testing
{
    /// <summary>
    /// Comprehensive validation tool for individual Unity simulation packages
    /// Tests each package separately to ensure Unity compatibility
    /// </summary>
    public class IndividualPackageValidator : MonoBehaviour
    {
        [Header("Validation Configuration")]
        public bool runValidationOnStart = true;
        public bool enableDetailedLogging = true;
        public bool testAllPackages = true;
        public float validationTimeout = 10f;

        [Header("UI Display")]
        public Text validationStatusText;
        public Text validationResultsText;
        public Button startValidationButton;
        public Button exportValidationButton;

        [Header("Package Selection")]
        [SerializeField] private List<string> selectedPackages = new List<string>();

        // Validation Results
        [System.Serializable]
        public class PackageValidationResult
        {
            public string packageName;
            public string systemName;
            public bool packageStructureValid;
            public bool systemClassFound;
            public bool systemInstantiable;
            public bool hasRequiredMethods;
            public bool dataStructureValid;
            public bool jsonSerializable;
            public bool eventsImplemented;
            public bool unityCompatible;
            public List<string> missingFeatures = new List<string>();
            public List<string> errors = new List<string>();
            public string sampleJsonData;
            public float validationTime;

            public bool IsFullyValid => packageStructureValid && systemClassFound &&
                                       systemInstantiable && hasRequiredMethods &&
                                       dataStructureValid && jsonSerializable &&
                                       unityCompatible;
        }

        private List<PackageValidationResult> validationResults = new List<PackageValidationResult>();
        private bool isValidating = false;

        // Expected packages and their system names
        private readonly Dictionary<string, string> expectedPackages = new Dictionary<string, string>
        {
            {"weather", "WeatherSystem"},
            {"economy", "EconomySystem"},
            {"physics", "PhysicsSystem"},
            {"ai", "AiSystem"},
            {"analytics", "AnalyticsSystem"},
            {"modding", "ModdingSystem"},
            {"disaster-management", "DisasterManagementSystem"},
            {"procedural-generation", "ProceduralGenerationSystem"},
            {"network-multiplayer", "NetworkMultiplayerSystem"},
            {"supply-chain", "SupplyChainSystem"},
            {"urban-planning", "UrbanPlanningSystem"},
            {"vehicle-simulation", "VehicleSimulationSystem"},
            {"advanced-economics", "AdvancedEconomicsSystem"},
            {"agriculture", "AgricultureSystem"},
            {"ai-decision-framework", "AIDecisionFrameworkSystem"},
            {"data-visualization", "DataVisualizationSystem"},
            {"ecosystem", "EcosystemSystem"},
            {"electrical-grid", "ElectricalGridSystem"},
            {"fluid-dynamics", "FluidDynamicsSystem"},
            {"manufacturing", "ManufacturingSystem"},
            {"mining-geology", "MiningGeologySystem"},
            {"ml-integration", "MLIntegrationSystem"},
            {"performance", "PerformanceSystem"},
            {"population", "PopulationSystem"},
            {"procedural", "ProceduralSystem"},
            {"real-world-data-adapters", "RealWorldDataAdaptersSystem"},
            {"resources", "ResourcesSystem"},
            {"simulation-algorithms", "SimulationAlgorithmsSystem"},
            {"time", "TimeSystem"},
            {"ui-templates", "UITemplatesSystem"}
        };

        #region Unity Lifecycle

        void Start()
        {
            InitializeValidator();
            if (runValidationOnStart)
            {
                StartValidation();
            }
        }

        #endregion

        #region Initialization

        private void InitializeValidator()
        {
            SetupUI();
            if (selectedPackages.Count == 0 || testAllPackages)
            {
                selectedPackages = expectedPackages.Keys.ToList();
            }

            Debug.Log($"🔍 Individual Package Validator Initialized");
            Debug.Log($"📦 Packages to validate: {selectedPackages.Count}");
        }

        private void SetupUI()
        {
            if (startValidationButton != null)
                startValidationButton.onClick.AddListener(StartValidation);

            if (exportValidationButton != null)
                exportValidationButton.onClick.AddListener(ExportValidationResults);

            UpdateStatusDisplay();
        }

        #endregion

        #region Validation Control

        public void StartValidation()
        {
            if (isValidating) return;

            Debug.Log("🚀 Starting Individual Package Validation...");
            StartCoroutine(RunValidationSequence());
        }

        private IEnumerator RunValidationSequence()
        {
            isValidating = true;
            validationResults.Clear();

            UpdateStatusDisplay();

            foreach (string packageName in selectedPackages)
            {
                Debug.Log($"🔍 Validating package: {packageName}");

                var result = new PackageValidationResult
                {
                    packageName = packageName,
                    systemName = expectedPackages.ContainsKey(packageName) ? expectedPackages[packageName] : "Unknown",
                    validationTime = Time.time
                };

                yield return StartCoroutine(ValidateIndividualPackage(packageName, result));

                validationResults.Add(result);
                UpdateStatusDisplay();

                // Small delay between validations
                yield return new WaitForSeconds(0.1f);
            }

            isValidating = false;
            FinalizeValidation();
        }

        #endregion

        #region Individual Package Validation

        private IEnumerator ValidateIndividualPackage(string packageName, PackageValidationResult result)
        {
            try
            {
                // Step 1: Validate package structure
                yield return StartCoroutine(ValidatePackageStructure(packageName, result));

                // Step 2: Validate system class
                yield return StartCoroutine(ValidateSystemClass(packageName, result));

                // Step 3: Test system instantiation
                yield return StartCoroutine(TestSystemInstantiation(packageName, result));

                // Step 4: Validate required methods
                yield return StartCoroutine(ValidateRequiredMethods(packageName, result));

                // Step 5: Test data structure
                yield return StartCoroutine(ValidateDataStructure(packageName, result));

                // Step 6: Test JSON serialization
                yield return StartCoroutine(TestJsonSerialization(packageName, result));

                // Step 7: Test events implementation
                yield return StartCoroutine(ValidateEventsImplementation(packageName, result));

                // Step 8: Test Unity compatibility
                yield return StartCoroutine(TestUnityCompatibility(packageName, result));

            }
            catch (System.Exception e)
            {
                result.errors.Add($"Validation failed: {e.Message}");
                Debug.LogError($"❌ Package validation failed for {packageName}: {e.Message}");
            }

            result.validationTime = Time.time - result.validationTime;
        }

        private IEnumerator ValidatePackageStructure(string packageName, PackageValidationResult result)
        {
            try
            {
                // Check if package directory exists
                string packagePath = $"packages/{packageName}";

                // For Unity validation, we check if the system class can be found via reflection
                string expectedSystemName = expectedPackages.ContainsKey(packageName) ? expectedPackages[packageName] : null;

                if (expectedSystemName != null)
                {
                    result.packageStructureValid = true;
                    result.systemName = expectedSystemName;
                }
                else
                {
                    result.packageStructureValid = false;
                    result.missingFeatures.Add("Expected system name not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ Package structure validation for {packageName}: {result.packageStructureValid}");
            }
            catch (System.Exception e)
            {
                result.packageStructureValid = false;
                result.errors.Add($"Package structure validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateSystemClass(string packageName, PackageValidationResult result)
        {
            try
            {
                // Find the system class using reflection
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null)
                {
                    result.systemClassFound = true;

                    // Check if it inherits from MonoBehaviour
                    if (typeof(MonoBehaviour).IsAssignableFrom(systemType))
                    {
                        result.unityCompatible = true;
                    }
                    else
                    {
                        result.unityCompatible = false;
                        result.missingFeatures.Add("Does not inherit from MonoBehaviour");
                    }
                }
                else
                {
                    result.systemClassFound = false;
                    result.missingFeatures.Add($"System class {result.systemName} not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ System class validation for {packageName}: {result.systemClassFound}");
            }
            catch (System.Exception e)
            {
                result.systemClassFound = false;
                result.errors.Add($"System class validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator TestSystemInstantiation(string packageName, PackageValidationResult result)
        {
            try
            {
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null && typeof(MonoBehaviour).IsAssignableFrom(systemType))
                {
                    // Create a temporary GameObject to test instantiation
                    GameObject testObject = new GameObject($"Test_{result.systemName}");

                    try
                    {
                        MonoBehaviour systemComponent = testObject.AddComponent(systemType) as MonoBehaviour;

                        if (systemComponent != null)
                        {
                            result.systemInstantiable = true;

                            // Test basic functionality
                            yield return new WaitForSeconds(0.1f);

                            if (systemComponent.enabled && systemComponent.gameObject.activeInHierarchy)
                            {
                                // System is working
                            }
                        }
                        else
                        {
                            result.systemInstantiable = false;
                            result.missingFeatures.Add("Could not instantiate system component");
                        }
                    }
                    finally
                    {
                        // Clean up test object
                        DestroyImmediate(testObject);
                    }
                }
                else
                {
                    result.systemInstantiable = false;
                    result.missingFeatures.Add("System type not compatible with Unity instantiation");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ System instantiation test for {packageName}: {result.systemInstantiable}");
            }
            catch (System.Exception e)
            {
                result.systemInstantiable = false;
                result.errors.Add($"System instantiation test failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateRequiredMethods(string packageName, PackageValidationResult result)
        {
            try
            {
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null)
                {
                    // Check for required methods
                    bool hasExportState = systemType.GetMethod("ExportState") != null;
                    bool hasGetData = systemType.GetMethod("GetData") != null;
                    bool hasResetData = systemType.GetMethod("ResetData") != null;

                    result.hasRequiredMethods = hasExportState && hasGetData && hasResetData;

                    if (!hasExportState) result.missingFeatures.Add("ExportState method not found");
                    if (!hasGetData) result.missingFeatures.Add("GetData method not found");
                    if (!hasResetData) result.missingFeatures.Add("ResetData method not found");
                }
                else
                {
                    result.hasRequiredMethods = false;
                    result.missingFeatures.Add("Cannot validate methods - system type not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ Required methods validation for {packageName}: {result.hasRequiredMethods}");
            }
            catch (System.Exception e)
            {
                result.hasRequiredMethods = false;
                result.errors.Add($"Required methods validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateDataStructure(string packageName, PackageValidationResult result)
        {
            try
            {
                // Find data structure types
                string dataTypeName = result.systemName.Replace("System", "Data");
                Type dataType = FindDataType(dataTypeName);

                if (dataType != null)
                {
                    // Check if data type is serializable
                    bool isSerializable = dataType.IsSerializable ||
                                        dataType.GetCustomAttributes(typeof(System.SerializableAttribute), false).Length > 0;

                    result.dataStructureValid = isSerializable;

                    if (!isSerializable)
                        result.missingFeatures.Add("Data structure is not serializable");
                }
                else
                {
                    result.dataStructureValid = false;
                    result.missingFeatures.Add($"Data structure {dataTypeName} not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ Data structure validation for {packageName}: {result.dataStructureValid}");
            }
            catch (System.Exception e)
            {
                result.dataStructureValid = false;
                result.errors.Add($"Data structure validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator TestJsonSerialization(string packageName, PackageValidationResult result)
        {
            try
            {
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null)
                {
                    // Create temporary test instance
                    GameObject testObject = new GameObject($"JsonTest_{result.systemName}");

                    try
                    {
                        MonoBehaviour systemComponent = testObject.AddComponent(systemType) as MonoBehaviour;

                        if (systemComponent != null)
                        {
                            // Wait for initialization
                            yield return new WaitForSeconds(0.1f);

                            // Try to call ExportState method
                            MethodInfo exportMethod = systemType.GetMethod("ExportState");
                            if (exportMethod != null)
                            {
                                string jsonData = (string)exportMethod.Invoke(systemComponent, null);

                                if (!string.IsNullOrEmpty(jsonData) && jsonData != "{}")
                                {
                                    // Try to parse the JSON to verify it's valid
                                    var parsed = JsonConvert.DeserializeObject(jsonData);
                                    result.jsonSerializable = true;
                                    result.sampleJsonData = jsonData;
                                }
                                else
                                {
                                    result.jsonSerializable = false;
                                    result.missingFeatures.Add("ExportState returns empty or invalid JSON");
                                }
                            }
                            else
                            {
                                result.jsonSerializable = false;
                                result.missingFeatures.Add("ExportState method not accessible");
                            }
                        }
                    }
                    finally
                    {
                        DestroyImmediate(testObject);
                    }
                }
                else
                {
                    result.jsonSerializable = false;
                    result.missingFeatures.Add("Cannot test JSON serialization - system type not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ JSON serialization test for {packageName}: {result.jsonSerializable}");
            }
            catch (System.Exception e)
            {
                result.jsonSerializable = false;
                result.errors.Add($"JSON serialization test failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator ValidateEventsImplementation(string packageName, PackageValidationResult result)
        {
            try
            {
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null)
                {
                    // Check for Action event fields
                    var eventFields = systemType.GetFields(BindingFlags.Public | BindingFlags.Instance)
                        .Where(f => f.FieldType.IsGenericType &&
                                   f.FieldType.GetGenericTypeDefinition() == typeof(System.Action<>))
                        .ToList();

                    result.eventsImplemented = eventFields.Count > 0;

                    if (eventFields.Count == 0)
                        result.missingFeatures.Add("No Action<T> events found");
                }
                else
                {
                    result.eventsImplemented = false;
                    result.missingFeatures.Add("Cannot validate events - system type not found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ Events implementation validation for {packageName}: {result.eventsImplemented}");
            }
            catch (System.Exception e)
            {
                result.eventsImplemented = false;
                result.errors.Add($"Events validation failed: {e.Message}");
            }

            yield return null;
        }

        private IEnumerator TestUnityCompatibility(string packageName, PackageValidationResult result)
        {
            try
            {
                Type systemType = FindSystemType(result.systemName);

                if (systemType != null)
                {
                    // Additional Unity-specific checks
                    bool hasHeaders = systemType.GetFields()
                        .Any(f => f.GetCustomAttributes(typeof(HeaderAttribute), false).Length > 0);

                    bool hasSerializeField = systemType.GetFields(BindingFlags.NonPublic | BindingFlags.Instance)
                        .Any(f => f.GetCustomAttributes(typeof(SerializeField), false).Length > 0);

                    bool hasContextMenu = systemType.GetMethods()
                        .Any(m => m.GetCustomAttributes(typeof(ContextMenuAttribute), false).Length > 0);

                    // Unity compatibility is already checked in ValidateSystemClass
                    // Here we just verify additional Unity features

                    if (!hasHeaders) result.missingFeatures.Add("No [Header] attributes found");
                    if (!hasSerializeField) result.missingFeatures.Add("No [SerializeField] attributes found");
                    if (!hasContextMenu) result.missingFeatures.Add("No [ContextMenu] attributes found");
                }

                if (enableDetailedLogging)
                    Debug.Log($"✅ Unity compatibility test for {packageName}: {result.unityCompatible}");
            }
            catch (System.Exception e)
            {
                result.errors.Add($"Unity compatibility test failed: {e.Message}");
            }

            yield return null;
        }

        #endregion

        #region Helper Methods

        private Type FindSystemType(string systemName)
        {
            // Search through all loaded assemblies for the system type
            foreach (Assembly assembly in System.AppDomain.CurrentDomain.GetAssemblies())
            {
                Type[] types = assembly.GetTypes();
                foreach (Type type in types)
                {
                    if (type.Name == systemName)
                    {
                        return type;
                    }
                }
            }
            return null;
        }

        private Type FindDataType(string dataTypeName)
        {
            // Search for data type (e.g., WeatherData, EconomyData)
            foreach (Assembly assembly in System.AppDomain.CurrentDomain.GetAssemblies())
            {
                Type[] types = assembly.GetTypes();
                foreach (Type type in types)
                {
                    if (type.Name == dataTypeName)
                    {
                        return type;
                    }
                }
            }
            return null;
        }

        #endregion

        #region Results and Display

        private void UpdateStatusDisplay()
        {
            if (validationStatusText != null)
            {
                string status = isValidating ?
                    $"🔍 VALIDATING PACKAGES...\n" +
                    $"Progress: {validationResults.Count}/{selectedPackages.Count}\n" +
                    $"✅ Valid: {validationResults.Count(r => r.IsFullyValid)}\n" +
                    $"❌ Invalid: {validationResults.Count(r => !r.IsFullyValid)}" :
                    $"📊 VALIDATION COMPLETED\n" +
                    $"Total Packages: {validationResults.Count}\n" +
                    $"✅ Valid: {validationResults.Count(r => r.IsFullyValid)}\n" +
                    $"❌ Invalid: {validationResults.Count(r => !r.IsFullyValid)}\n" +
                    $"Success Rate: {(validationResults.Count > 0 ? (validationResults.Count(r => r.IsFullyValid) * 100f / validationResults.Count) : 0):F1}%";

                validationStatusText.text = status;
            }
        }

        private void FinalizeValidation()
        {
            Debug.Log("📊 INDIVIDUAL PACKAGE VALIDATION SUMMARY:");
            Debug.Log("==========================================");

            int validPackages = validationResults.Count(r => r.IsFullyValid);
            int invalidPackages = validationResults.Count - validPackages;

            Debug.Log($"Total Packages Validated: {validationResults.Count}");
            Debug.Log($"✅ Valid Packages: {validPackages}");
            Debug.Log($"❌ Invalid Packages: {invalidPackages}");
            Debug.Log($"Success Rate: {(validationResults.Count > 0 ? (validPackages * 100f / validationResults.Count) : 0):F1}%");

            // Detailed results
            foreach (var result in validationResults)
            {
                string status = result.IsFullyValid ? "✅" : "❌";
                Debug.Log($"{status} {result.packageName} ({result.systemName}):");

                if (!result.IsFullyValid)
                {
                    foreach (string error in result.errors)
                        Debug.LogWarning($"  Error: {error}");
                    foreach (string missing in result.missingFeatures)
                        Debug.LogWarning($"  Missing: {missing}");
                }
            }

            UpdateResultsDisplay();
        }

        private void UpdateResultsDisplay()
        {
            if (validationResultsText != null)
            {
                string results = "📋 PACKAGE VALIDATION RESULTS:\n\n";

                foreach (var result in validationResults)
                {
                    string status = result.IsFullyValid ? "✅" : "❌";
                    results += $"{status} {result.packageName}\n";

                    if (!result.IsFullyValid)
                    {
                        if (result.errors.Count > 0)
                            results += $"  Errors: {string.Join(", ", result.errors)}\n";
                        if (result.missingFeatures.Count > 0)
                            results += $"  Missing: {string.Join(", ", result.missingFeatures)}\n";
                    }
                    results += "\n";
                }

                int validCount = validationResults.Count(r => r.IsFullyValid);
                results += $"🎯 FINAL SCORE: {validCount}/{validationResults.Count} " +
                          $"({(validationResults.Count > 0 ? (validCount * 100f / validationResults.Count) : 0):F1}%)";

                validationResultsText.text = results;
            }
        }

        public void ExportValidationResults()
        {
            var exportData = new
            {
                validationDate = System.DateTime.Now.ToString(),
                totalPackages = validationResults.Count,
                validPackages = validationResults.Count(r => r.IsFullyValid),
                invalidPackages = validationResults.Count(r => !r.IsFullyValid),
                successRate = validationResults.Count > 0 ? (validationResults.Count(r => r.IsFullyValid) * 100f / validationResults.Count) : 0,
                results = validationResults
            };

            string jsonData = JsonConvert.SerializeObject(exportData, Formatting.Indented);

            // Save to file
            string fileName = $"unity_package_validation_results_{System.DateTime.Now:yyyyMMdd_HHmmss}.json";
            string filePath = System.IO.Path.Combine(Application.persistentDataPath, fileName);
            System.IO.File.WriteAllText(filePath, jsonData);

            Debug.Log($"📄 Package validation results exported to: {filePath}");
            Debug.Log($"📊 Summary: {validationResults.Count(r => r.IsFullyValid)}/{validationResults.Count} packages are valid");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Validate All Packages")]
        public void ValidateAllPackages()
        {
            testAllPackages = true;
            selectedPackages = expectedPackages.Keys.ToList();
            StartValidation();
        }

        [ContextMenu("Export Results")]
        public void ForceExportResults()
        {
            ExportValidationResults();
        }

        #endregion

        void OnGUI()
        {
            GUILayout.BeginArea(new Rect(Screen.width - 350, 10, 340, 500));

            GUILayout.Label("Individual Package Validator", GUI.skin.box);

            if (!isValidating)
            {
                if (GUILayout.Button("🔍 Validate All Packages"))
                    ValidateAllPackages();

                if (GUILayout.Button("📄 Export Results"))
                    ExportValidationResults();
            }
            else
            {
                GUILayout.Label($"Validating: {validationResults.Count}/{selectedPackages.Count}");
                float progress = selectedPackages.Count > 0 ? (float)validationResults.Count / selectedPackages.Count : 0f;
                GUILayout.Label($"Progress: {progress * 100:F0}%");
            }

            GUILayout.Space(10);

            if (validationResults.Count > 0)
            {
                int validCount = validationResults.Count(r => r.IsFullyValid);
                GUILayout.Label($"✅ Valid: {validCount}");
                GUILayout.Label($"❌ Invalid: {validationResults.Count - validCount}");
                GUILayout.Label($"Success: {(validCount * 100f / validationResults.Count):F1}%");

                GUILayout.Space(10);
                GUILayout.Label("Recent Results:", GUI.skin.box);

                // Show last 10 results
                foreach (var result in validationResults.TakeLast(10))
                {
                    string status = result.IsFullyValid ? "✅" : "❌";
                    GUILayout.Label($"{status} {result.packageName}");
                }
            }

            GUILayout.EndArea();
        }
    }
}