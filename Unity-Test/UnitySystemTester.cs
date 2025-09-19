using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Newtonsoft.Json;
using System;

namespace UnitySim.Testing
{
    public class UnitySystemTester : MonoBehaviour
    {
        [Header("Test Configuration")]
        public float testDuration = 30f;
        public bool runAutomaticTests = true;
        public bool enableDetailedLogging = true;

        [Header("UI Components")]
        public Text statusDisplay;
        public Text resultsDisplay;
        public Button startTestButton;
        public Button stopTestButton;
        public Button exportResultsButton;

        [Header("Test Results")]
        [SerializeField] private List<TestResult> testResults = new List<TestResult>();
        [SerializeField] private bool isTestRunning = false;
        [SerializeField] private float currentTestTime = 0f;
        [SerializeField] private int totalSystems = 30;
        [SerializeField] private int passedSystems = 0;
        [SerializeField] private int failedSystems = 0;

        // All possible simulation system types
        private readonly string[] expectedSystems = {
            "AdvancedEconomicsSystem", "AgricultureSystem", "AISystem", "AIDecisionFrameworkSystem",
            "AnalyticsSystem", "DataVisualizationSystem", "DisasterManagementSystem", "EconomySystem",
            "EcosystemSystem", "ElectricalGridSystem", "FluidDynamicsSystem", "ManufacturingSystem",
            "MiningGeologySystem", "MLIntegrationSystem", "ModdingSystem", "NetworkMultiplayerSystem",
            "PerformanceSystem", "PhysicsSystem", "PopulationSystem", "ProceduralSystem",
            "ProceduralGenerationSystem", "RealWorldDataAdaptersSystem", "ResourcesSystem",
            "SimulationAlgorithmsSystem", "SupplyChainSystem", "TimeSystem", "UITemplatesSystem",
            "UrbanPlanningSystem", "VehicleSimulationSystem", "WeatherSystem"
        };

        private Dictionary<string, MonoBehaviour> foundSystems = new Dictionary<string, MonoBehaviour>();
        private Coroutine testCoroutine;

        [System.Serializable]
        public class TestResult
        {
            public string systemName;
            public bool systemFound;
            public bool initializationSuccess;
            public bool updateFunctionality;
            public bool jsonExportSuccess;
            public bool eventSystemWorking;
            public string jsonData;
            public string errorMessage;
            public float testTime;

            public bool IsFullyPassed => systemFound && initializationSuccess && updateFunctionality && jsonExportSuccess && eventSystemWorking;
        }

        #region Unity Lifecycle

        void Start()
        {
            InitializeTester();
            if (runAutomaticTests)
            {
                StartTesting();
            }
        }

        void Update()
        {
            if (isTestRunning)
            {
                currentTestTime += Time.deltaTime;
                UpdateStatusDisplay();

                if (currentTestTime >= testDuration)
                {
                    StopTesting();
                }
            }
        }

        #endregion

        #region Initialization

        private void InitializeTester()
        {
            SetupUI();
            ScanForSystems();

            Debug.Log($"🧪 Unity System Tester Initialized");
            Debug.Log($"📊 Expected Systems: {totalSystems}");
            Debug.Log($"🔍 Found Systems: {foundSystems.Count}");
        }

        private void SetupUI()
        {
            if (startTestButton != null)
                startTestButton.onClick.AddListener(StartTesting);

            if (stopTestButton != null)
                stopTestButton.onClick.AddListener(StopTesting);

            if (exportResultsButton != null)
                exportResultsButton.onClick.AddListener(ExportResults);

            UpdateStatusDisplay();
        }

        private void ScanForSystems()
        {
            foundSystems.Clear();

            foreach (string systemName in expectedSystems)
            {
                // Find all MonoBehaviours in the scene
                MonoBehaviour[] allBehaviours = FindObjectsOfType<MonoBehaviour>();

                foreach (var behaviour in allBehaviours)
                {
                    if (behaviour.GetType().Name == systemName)
                    {
                        foundSystems[systemName] = behaviour;
                        if (enableDetailedLogging)
                            Debug.Log($"✅ Found system: {systemName}");
                        break;
                    }
                }

                if (!foundSystems.ContainsKey(systemName) && enableDetailedLogging)
                {
                    Debug.LogWarning($"⚠️ System not found: {systemName}");
                }
            }
        }

        #endregion

        #region Testing Logic

        public void StartTesting()
        {
            if (isTestRunning) return;

            Debug.Log("🚀 Starting Unity Systems Test...");

            isTestRunning = true;
            currentTestTime = 0f;
            testResults.Clear();
            passedSystems = 0;
            failedSystems = 0;

            testCoroutine = StartCoroutine(RunTestSequence());
        }

        public void StopTesting()
        {
            if (!isTestRunning) return;

            Debug.Log("🛑 Stopping Unity Systems Test...");

            isTestRunning = false;

            if (testCoroutine != null)
            {
                StopCoroutine(testCoroutine);
                testCoroutine = null;
            }

            FinalizeResults();
        }

        private IEnumerator RunTestSequence()
        {
            yield return StartCoroutine(TestAllSystems());
            StopTesting();
        }

        private IEnumerator TestAllSystems()
        {
            float systemTestTime = testDuration / expectedSystems.Length;

            foreach (string systemName in expectedSystems)
            {
                if (!isTestRunning) yield break;

                Debug.Log($"🧪 Testing {systemName}...");

                TestResult result = new TestResult
                {
                    systemName = systemName,
                    testTime = Time.time
                };

                yield return StartCoroutine(TestIndividualSystem(systemName, result));

                testResults.Add(result);

                if (result.IsFullyPassed)
                    passedSystems++;
                else
                    failedSystems++;

                UpdateStatusDisplay();

                // Wait a bit between tests
                yield return new WaitForSeconds(systemTestTime);
            }
        }

        private IEnumerator TestIndividualSystem(string systemName, TestResult result)
        {
            try
            {
                // Test 1: System Found
                result.systemFound = foundSystems.ContainsKey(systemName);
                if (!result.systemFound)
                {
                    result.errorMessage = "System not found in scene";
                    yield break;
                }

                MonoBehaviour system = foundSystems[systemName];

                // Test 2: Initialization
                result.initializationSuccess = system != null && system.enabled && system.gameObject.activeInHierarchy;

                // Test 3: Update Functionality (check if system is updating)
                yield return new WaitForSeconds(0.1f);
                result.updateFunctionality = system.isActiveAndEnabled;

                // Test 4: JSON Export
                yield return StartCoroutine(TestJSONExport(system, result));

                // Test 5: Event System
                yield return StartCoroutine(TestEventSystem(system, result));

            }
            catch (System.Exception e)
            {
                result.errorMessage = e.Message;
                Debug.LogError($"❌ Test failed for {systemName}: {e.Message}");
            }
        }

        private IEnumerator TestJSONExport(MonoBehaviour system, TestResult result)
        {
            try
            {
                // Try to call ExportState method using reflection
                var exportMethod = system.GetType().GetMethod("ExportState");
                if (exportMethod != null)
                {
                    string jsonData = (string)exportMethod.Invoke(system, null);

                    if (!string.IsNullOrEmpty(jsonData) && jsonData != "{}")
                    {
                        // Try to parse JSON to verify it's valid
                        var parsed = JsonConvert.DeserializeObject(jsonData);
                        result.jsonExportSuccess = true;
                        result.jsonData = jsonData;

                        if (enableDetailedLogging)
                            Debug.Log($"✅ JSON Export successful for {result.systemName}");
                    }
                    else
                    {
                        result.jsonExportSuccess = false;
                        result.errorMessage += " JSON export returned empty/invalid data;";
                    }
                }
                else
                {
                    result.jsonExportSuccess = false;
                    result.errorMessage += " ExportState method not found;";
                }
            }
            catch (System.Exception e)
            {
                result.jsonExportSuccess = false;
                result.errorMessage += $" JSON Export failed: {e.Message};";
            }

            yield return null;
        }

        private IEnumerator TestEventSystem(MonoBehaviour system, TestResult result)
        {
            try
            {
                // Check if system has event fields using reflection
                var fields = system.GetType().GetFields();
                bool hasEvents = fields.Any(f => f.FieldType.Name.Contains("Action"));

                result.eventSystemWorking = hasEvents;

                if (enableDetailedLogging && hasEvents)
                    Debug.Log($"✅ Event system found for {result.systemName}");
                else if (enableDetailedLogging)
                    Debug.LogWarning($"⚠️ No events found for {result.systemName}");
            }
            catch (System.Exception e)
            {
                result.eventSystemWorking = false;
                result.errorMessage += $" Event system test failed: {e.Message};";
            }

            yield return null;
        }

        #endregion

        #region Results and Display

        private void UpdateStatusDisplay()
        {
            if (statusDisplay != null)
            {
                string status = isTestRunning ?
                    $"🧪 TESTING IN PROGRESS\\n" +
                    $"Time: {currentTestTime:F1}s / {testDuration:F1}s\\n" +
                    $"Systems Tested: {testResults.Count}/{totalSystems}\\n" +
                    $"✅ Passed: {passedSystems}\\n" +
                    $"❌ Failed: {failedSystems}" :
                    $"🏁 TEST COMPLETED\\n" +
                    $"Total Systems: {totalSystems}\\n" +
                    $"Found: {foundSystems.Count}\\n" +
                    $"✅ Passed: {passedSystems}\\n" +
                    $"❌ Failed: {failedSystems}\\n" +
                    $"Success Rate: {(passedSystems * 100f / totalSystems):F1}%";

                statusDisplay.text = status;
            }
        }

        private void FinalizeResults()
        {
            Debug.Log("📊 TEST RESULTS SUMMARY:");
            Debug.Log("========================");
            Debug.Log($"Total Systems Expected: {totalSystems}");
            Debug.Log($"Systems Found: {foundSystems.Count}");
            Debug.Log($"Systems Tested: {testResults.Count}");
            Debug.Log($"✅ Passed: {passedSystems}");
            Debug.Log($"❌ Failed: {failedSystems}");
            Debug.Log($"Success Rate: {(passedSystems * 100f / totalSystems):F1}%");

            // Detailed results
            foreach (var result in testResults)
            {
                string status = result.IsFullyPassed ? "✅" : "❌";
                Debug.Log($"{status} {result.systemName}: " +
                    $"Found={result.systemFound}, " +
                    $"Init={result.initializationSuccess}, " +
                    $"Update={result.updateFunctionality}, " +
                    $"JSON={result.jsonExportSuccess}, " +
                    $"Events={result.eventSystemWorking}");

                if (!string.IsNullOrEmpty(result.errorMessage))
                    Debug.LogWarning($"  Errors: {result.errorMessage}");
            }

            UpdateResultsDisplay();
        }

        private void UpdateResultsDisplay()
        {
            if (resultsDisplay != null)
            {
                string results = "📋 DETAILED RESULTS:\\n";

                foreach (var result in testResults)
                {
                    string status = result.IsFullyPassed ? "✅" : "❌";
                    results += $"{status} {result.systemName}\\n";

                    if (!result.IsFullyPassed && !string.IsNullOrEmpty(result.errorMessage))
                    {
                        results += $"  Error: {result.errorMessage}\\n";
                    }
                }

                results += $"\\n🎯 FINAL SCORE: {passedSystems}/{totalSystems} ({(passedSystems * 100f / totalSystems):F1}%)";

                resultsDisplay.text = results;
            }
        }

        public void ExportResults()
        {
            var exportData = new
            {
                testDate = System.DateTime.Now.ToString(),
                totalSystems = totalSystems,
                foundSystems = foundSystems.Count,
                passedSystems = passedSystems,
                failedSystems = failedSystems,
                successRate = (passedSystems * 100f / totalSystems),
                testDuration = testDuration,
                results = testResults
            };

            string jsonData = JsonConvert.SerializeObject(exportData, Formatting.Indented);

            // Save to file
            string fileName = $"unity_systems_test_results_{System.DateTime.Now:yyyyMMdd_HHmmss}.json";
            string filePath = System.IO.Path.Combine(Application.persistentDataPath, fileName);
            System.IO.File.WriteAllText(filePath, jsonData);

            Debug.Log($"📄 Test results exported to: {filePath}");
            Debug.Log($"📊 Results Summary: {passedSystems}/{totalSystems} systems passed ({(passedSystems * 100f / totalSystems):F1}%)");
        }

        #endregion

        #region Context Menu Actions

        [ContextMenu("Run Quick Test")]
        public void RunQuickTest()
        {
            testDuration = 10f;
            StartTesting();
        }

        [ContextMenu("Scan Systems")]
        public void ReScanSystems()
        {
            ScanForSystems();
            UpdateStatusDisplay();
        }

        [ContextMenu("Force Export Results")]
        public void ForceExportResults()
        {
            ExportResults();
        }

        #endregion

        void OnGUI()
        {
            GUILayout.BeginArea(new Rect(Screen.width - 300, 10, 290, 400));

            GUILayout.Label("Unity Systems Tester", GUI.skin.box);

            if (!isTestRunning)
            {
                if (GUILayout.Button("🧪 Start Full Test"))
                    StartTesting();

                if (GUILayout.Button("⚡ Quick Test (10s)"))
                {
                    testDuration = 10f;
                    StartTesting();
                }
            }
            else
            {
                if (GUILayout.Button("🛑 Stop Test"))
                    StopTesting();

                GUILayout.Label($"Progress: {(currentTestTime/testDuration)*100:F0}%");
            }

            GUILayout.Space(10);

            if (GUILayout.Button("🔍 Rescan Systems"))
                ReScanSystems();

            if (GUILayout.Button("📄 Export Results"))
                ExportResults();

            GUILayout.Space(10);

            GUILayout.Label($"Systems Found: {foundSystems.Count}/{totalSystems}");
            GUILayout.Label($"✅ Passed: {passedSystems}");
            GUILayout.Label($"❌ Failed: {failedSystems}");

            if (totalSystems > 0)
            {
                float successRate = (passedSystems * 100f / totalSystems);
                GUILayout.Label($"Success: {successRate:F1}%");
            }

            GUILayout.EndArea();
        }
    }
}