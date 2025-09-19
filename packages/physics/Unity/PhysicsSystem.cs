
using System;
using UnityEngine;
using Newtonsoft.Json;

namespace UnitySim.Physics
{
    [System.Serializable]
    public class PhysicsData
    {
        public long timestamp;
        public long currentTime;
        public PhysicsInfo physics;

        public PhysicsData()
        {
            timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            physics = new PhysicsInfo();
        }
    }

    [System.Serializable]
    public class PhysicsInfo
    {
        
        public float gravity = -9.81f;
        public int rigidBodies = 0;
        public int constraints = 0;
        public int collisions = 0;
        public string systemHealth = "operational";
        public string framework = "unity-sim-physics";
    }

    public class PhysicsSystem : MonoBehaviour
    {
        [Header("Physics Settings")]
        public float updateInterval = 1f;

        [Header("Current Data")]
        [SerializeField] private PhysicsData currentData;

        // Events
        public System.Action<PhysicsData> OnPhysicsChanged;

        private float updateTimer = 0f;

        void Start()
        {
            InitializePhysics();
        }

        void Update()
        {
            UpdatePhysics();

            updateTimer += Time.deltaTime;
            if (updateTimer >= updateInterval)
            {
                OnPhysicsChanged?.Invoke(currentData);
                updateTimer = 0f;
            }
        }

        private void InitializePhysics()
        {
            currentData = new PhysicsData();
        }

        private void UpdatePhysics()
        {
            // Update timestamps
            currentData.timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            currentData.currentTime = currentData.timestamp;

            // Specific update logic will be added here
            UpdateSpecificData();
        }

        private void UpdateSpecificData()
        {
            // Package-specific update logic
            
            currentData.physics.rigidBodies = FindObjectsOfType<Rigidbody>().Length;
            currentData.physics.collisions += UnityEngine.Random.Range(0, 3);
        }

        public string ExportState()
        {
            return JsonConvert.SerializeObject(currentData, Formatting.Indented);
        }

        public PhysicsData GetData()
        {
            return currentData;
        }

        [ContextMenu("Export Physics Data")]
        public void ExportPhysicsToConsole()
        {
            Debug.Log("Physics Data: " + ExportState());
        }
    }
}