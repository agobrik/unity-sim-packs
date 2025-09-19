using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using Newtonsoft.Json;

public class ComprehensivePackageTester : MonoBehaviour
{
    [Header("Testing Configuration")]
    public bool runTestsOnStart = true;
    public bool enableDetailedLogging = true;
    public bool testAllPackagesInParallel = false;

    [Header("Test Results")]
    [SerializeField] private int totalPackages = 30;
    [SerializeField] private int passedTests = 0;
    [SerializeField] private int failedTests = 0;
    [SerializeField] private List<string> testResults = new List<string>();

    private readonly string[] expectedSystems = {
        "AdvancedEconomicsSystem", "AgricultureSystem", "AISystem", "AIDecisionFrameworkSystem",
        "AnalyticsSystem", "DataVisualizationSystem", "DisasterManagementSystem", "EconomySystem",
        "EcosystemSystem", "ElectricalGridSystem", "FluidDynamicsSystem", "ManufacturingSystem",
        "MiningGeologySystem", "MlIntegrationSystem", "ModdingSystem", "PerformanceSystem",
        "PhysicsSystem", "ProceduralSystem", "ResourcesSystem", "TimeSystem", "WeatherSystem",
        "TransportationSystem", "UrbanPlanningSystem", "SocialNetworksSystem", "SecuritySystem",
        "QuantumComputingSystem", "BlockchainSystem", "CommunicationSystem", "EntertainmentSystem", "HealthcareSystem"
    };

    private readonly Dictionary<string, string> systemNamespaces = new Dictionary<string, string>
    {
        {"AdvancedEconomicsSystem", "UnitySim.AdvancedEconomics"},
        {"AgricultureSystem", "UnitySim.Agriculture"},
        {"AISystem", "UnitySim.AI"},
        {"AIDecisionFrameworkSystem", "UnitySim.AIDecisionFramework"},
        {"AnalyticsSystem", "UnitySim.Analytics"},
        {"DataVisualizationSystem", "UnitySim.DataVisualization"},
        {"DisasterManagementSystem", "UnitySim.DisasterManagement"},
        {"EconomySystem", "UnitySim.Economy"},
        {"EcosystemSystem", "UnitySim.Ecosystem"},
        {"ElectricalGridSystem", "UnitySim.ElectricalGrid"},
        {"FluidDynamicsSystem", "UnitySim.FluidDynamics"},
        {"ManufacturingSystem", "UnitySim.Manufacturing"},
        {"MiningGeologySystem", "UnitySim.MiningGeology"},
        {"MlIntegrationSystem", "UnitySim.MlIntegration"},
        {"ModdingSystem", "UnitySim.Modding"},
        {"PerformanceSystem", "UnitySim.Performance"},
        {"PhysicsSystem", "UnitySim.Physics"},
        {"ProceduralSystem", "UnitySim.Procedural"},
        {"ResourcesSystem", "UnitySim.Resources"},
        {"TimeSystem", "UnitySim.Time"},
        {"WeatherSystem", "UnitySim.Weather"},
        {"TransportationSystem", "UnitySim.Transportation"},
        {"UrbanPlanningSystem", "UnitySim.UrbanPlanning"},
        {"SocialNetworksSystem", "UnitySim.SocialNetworks"},
        {"SecuritySystem", "UnitySim.Security"},
        {"QuantumComputingSystem", "UnitySim.QuantumComputing"},
        {"BlockchainSystem", "UnitySim.Blockchain"},
        {"CommunicationSystem", "UnitySim.Communication"},
        {"EntertainmentSystem", "UnitySim.Entertainment"},
        {"HealthcareSystem", "UnitySim.Healthcare"}
    };

    void Start()
    {
        if (runTestsOnStart)
        {
            RunAllTests();
        }
    }

    [ContextMenu("Run All Package Tests")]
    public void RunAllTests()
    {
        Debug.Log("=== STARTING COMPREHENSIVE PACKAGE TESTING ===");
        testResults.Clear();
        passedTests = 0;
        failedTests = 0;

        foreach (string systemName in expectedSystems)
        {
            TestPackage(systemName);
        }

        DisplayFinalResults();
    }

    private void TestPackage(string systemName)
    {
        Debug.Log($"\n--- Testing {systemName} ---");
        bool packagePassed = true;
        List<string> packageErrors = new List<string>();

        try
        {
            // Test 1: Check if system class exists
            if (!TestSystemClassExists(systemName, packageErrors))
                packagePassed = false;

            // Test 2: Check MonoBehaviour inheritance
            if (!TestMonoBehaviourInheritance(systemName, packageErrors))
                packagePassed = false;

            // Test 3: Check required methods exist
            if (!TestRequiredMethods(systemName, packageErrors))
                packagePassed = false;

            // Test 4: Check data classes exist
            if (!TestDataClasses(systemName, packageErrors))
                packagePassed = false;

            // Test 5: Test JSON serialization
            if (!TestJsonSerialization(systemName, packageErrors))
                packagePassed = false;

            // Test 6: Test event system
            if (!TestEventSystem(systemName, packageErrors))
                packagePassed = false;

            // Test 7: Test namespace compliance
            if (!TestNamespaceCompliance(systemName, packageErrors))
                packagePassed = false;

        }
        catch (Exception ex)
        {
            packagePassed = false;
            packageErrors.Add($"Critical error during testing: {ex.Message}");
        }

        // Record results
        if (packagePassed)
        {
            passedTests++;
            testResults.Add($"✅ {systemName}: PASSED");
            if (enableDetailedLogging)
                Debug.Log($"✅ {systemName} passed all tests!");
        }
        else
        {
            failedTests++;
            string errorSummary = string.Join(", ", packageErrors);
            testResults.Add($"❌ {systemName}: FAILED - {errorSummary}");
            Debug.LogError($"❌ {systemName} failed: {errorSummary}");
        }
    }

    private bool TestSystemClassExists(string systemName, List<string> errors)
    {
        try
        {
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null)
            {
                errors.Add("System class not found");
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"Class existence check failed: {ex.Message}");
            return false;
        }
    }

    private bool TestMonoBehaviourInheritance(string systemName, List<string> errors)
    {
        try
        {
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null || !typeof(MonoBehaviour).IsAssignableFrom(systemType))
            {
                errors.Add("Not a MonoBehaviour");
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"MonoBehaviour check failed: {ex.Message}");
            return false;
        }
    }

    private bool TestRequiredMethods(string systemName, List<string> errors)
    {
        try
        {
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null) return false;

            string[] requiredMethods = { "ExportState", "GetData", "SetUpdateInterval", "ResetData" };

            foreach (string methodName in requiredMethods)
            {
                MethodInfo method = systemType.GetMethod(methodName);
                if (method == null)
                {
                    errors.Add($"Missing method: {methodName}");
                    return false;
                }
            }
            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"Method check failed: {ex.Message}");
            return false;
        }
    }

    private bool TestDataClasses(string systemName, List<string> errors)
    {
        try
        {
            string dataClassName = systemName.Replace("System", "Data");
            string infoClassName = systemName.Replace("System", "Info");

            Type dataType = Type.GetType($"{systemNamespaces[systemName]}.{dataClassName}");
            Type infoType = Type.GetType($"{systemNamespaces[systemName]}.{infoClassName}");

            if (dataType == null)
            {
                errors.Add($"Missing {dataClassName} class");
                return false;
            }

            if (infoType == null)
            {
                errors.Add($"Missing {infoClassName} class");
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"Data class check failed: {ex.Message}");
            return false;
        }
    }

    private bool TestJsonSerialization(string systemName, List<string> errors)
    {
        try
        {
            // Create a test instance
            GameObject testGO = new GameObject($"Test_{systemName}");
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null) return false;

            Component system = testGO.AddComponent(systemType);

            // Test ExportState method
            MethodInfo exportMethod = systemType.GetMethod("ExportState");
            if (exportMethod != null)
            {
                string result = (string)exportMethod.Invoke(system, null);
                if (string.IsNullOrEmpty(result) || result == "{}")
                {
                    errors.Add("ExportState returned empty/null");
                    DestroyImmediate(testGO);
                    return false;
                }

                // Try to parse the JSON
                JsonConvert.DeserializeObject(result);
            }

            DestroyImmediate(testGO);
            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"JSON serialization failed: {ex.Message}");
            return false;
        }
    }

    private bool TestEventSystem(string systemName, List<string> errors)
    {
        try
        {
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null) return false;

            // Check for expected event fields
            string eventFieldName = $"On{systemName.Replace("System", "")}Changed";
            FieldInfo eventField = systemType.GetField(eventFieldName);

            if (eventField == null)
            {
                errors.Add($"Missing event: {eventFieldName}");
                return false;
            }

            FieldInfo exportEventField = systemType.GetField("OnDataExported");
            if (exportEventField == null)
            {
                errors.Add("Missing OnDataExported event");
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"Event system check failed: {ex.Message}");
            return false;
        }
    }

    private bool TestNamespaceCompliance(string systemName, List<string> errors)
    {
        try
        {
            Type systemType = Type.GetType($"{systemNamespaces[systemName]}.{systemName}");
            if (systemType == null) return false;

            if (systemType.Namespace != systemNamespaces[systemName])
            {
                errors.Add($"Wrong namespace: expected {systemNamespaces[systemName]}, got {systemType.Namespace}");
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            errors.Add($"Namespace check failed: {ex.Message}");
            return false;
        }
    }

    private void DisplayFinalResults()
    {
        Debug.Log("\n=== COMPREHENSIVE TESTING RESULTS ===");
        Debug.Log($"Total Packages: {totalPackages}");
        Debug.Log($"Passed: {passedTests}");
        Debug.Log($"Failed: {failedTests}");
        Debug.Log($"Success Rate: {(float)passedTests / totalPackages * 100:F1}%");

        Debug.Log("\n=== DETAILED RESULTS ===");
        foreach (string result in testResults)
        {
            Debug.Log(result);
        }

        if (failedTests == 0)
        {
            Debug.Log("\n🎉 ALL PACKAGES PASSED! Unity simulation system is ready for production use.");
        }
        else
        {
            Debug.Log($"\n⚠️ {failedTests} packages need attention. Review errors above.");
        }
    }

    [ContextMenu("Test Single Package")]
    public void TestSinglePackage()
    {
        // This can be configured in inspector to test a specific package
        string systemToTest = "WeatherSystem"; // Change this to test different systems
        testResults.Clear();
        passedTests = 0;
        failedTests = 0;

        TestPackage(systemToTest);
        DisplayFinalResults();
    }

    [ContextMenu("Generate Test Report")]
    public void GenerateTestReport()
    {
        string report = "# Unity Simulation Package Test Report\n\n";
        report += $"**Generated:** {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n\n";
        report += $"## Summary\n";
        report += $"- Total Packages: {totalPackages}\n";
        report += $"- Passed: {passedTests}\n";
        report += $"- Failed: {failedTests}\n";
        report += $"- Success Rate: {(float)passedTests / totalPackages * 100:F1}%\n\n";

        report += "## Test Results\n";
        foreach (string result in testResults)
        {
            report += $"- {result}\n";
        }

        Debug.Log(report);
    }
}