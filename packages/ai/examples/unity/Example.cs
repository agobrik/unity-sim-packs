using System;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json;

namespace SteamSim.AI.Unity.Examples
{
    /// <summary>
    /// Main AI Agent component that integrates Steam AI package with Unity
    /// </summary>
    public class AIAgent : MonoBehaviour
    {
        [Header("AI Configuration")]
        [SerializeField] private string agentId;
        [SerializeField] private string agentType = "basic";
        [SerializeField] private float updateInterval = 0.1f;
        [SerializeField] private bool enableDebugDraw = true;

        [Header("Behavior Properties")]
        [SerializeField] private float detectionRadius = 10f;
        [SerializeField] private float movementSpeed = 5f;
        [SerializeField] private Transform[] patrolPoints;

        // Private fields
        private Dictionary<string, object> memory = new Dictionary<string, object>();
        private Dictionary<string, Func<dynamic, dynamic, bool>> customActions = new Dictionary<string, Func<dynamic, dynamic, bool>>();
        private Dictionary<string, Func<dynamic, dynamic, bool>> customConditions = new Dictionary<string, Func<dynamic, dynamic, bool>>();
        private string currentBehaviorTreeId;
        private float lastUpdateTime;
        private bool isInitialized = false;

        // Events
        public event Action<string, string> OnTreeExecuted;
        public event Action<string, string> OnNodeExecuted;
        public event Action<string> OnStateChanged;

        void Start()
        {
            if (string.IsNullOrEmpty(agentId))
            {
                agentId = $"agent_{GetInstanceID()}";
            }

            InitializeAgent();
        }

        void Update()
        {
            if (!isInitialized || JavaScriptBridge.Instance == null || !JavaScriptBridge.Instance.IsInitialized)
                return;

            if (Time.time - lastUpdateTime >= updateInterval)
            {
                UpdateAI();
                lastUpdateTime = Time.time;
            }
        }

        /// <summary>
        /// Initialize the AI agent
        /// </summary>
        private void InitializeAgent()
        {
            try
            {
                if (JavaScriptBridge.Instance == null)
                {
                    Debug.LogError("JavaScriptBridge not found! Please add it to the scene.");
                    return;
                }

                if (!JavaScriptBridge.Instance.IsInitialized)
                {
                    JavaScriptBridge.Instance.OnEngineInitialized += OnJavaScriptEngineReady;
                    return;
                }

                OnJavaScriptEngineReady();
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to initialize AI agent: {ex.Message}");
            }
        }

        /// <summary>
        /// Called when the JavaScript engine is ready
        /// </summary>
        private void OnJavaScriptEngineReady()
        {
            try
            {
                CreateAgent();
                SetupDefaultMemory();
                RegisterDefaultActions();
                RegisterDefaultConditions();
                CreateDefaultBehaviorTree();

                isInitialized = true;
                Debug.Log($"AI Agent {agentId} initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to setup AI agent: {ex.Message}");
            }
        }

        /// <summary>
        /// Create the agent in the JavaScript environment
        /// </summary>
        private void CreateAgent()
        {
            var agentConfig = new
            {
                id = agentId,
                position = new { x = transform.position.x, y = transform.position.y, z = transform.position.z },
                agentType = agentType,
                properties = new
                {
                    detectionRadius = detectionRadius,
                    movementSpeed = movementSpeed,
                    maxHealth = 100f
                }
            };

            string script = $@"
                if (typeof window.agentManager === 'undefined') {{
                    const {{ AgentManager }} = require('@steam-sim/ai');
                    window.agentManager = new AgentManager();
                }}

                const agent = window.agentManager.createAgent('{agentId}', {JsonConvert.SerializeObject(agentConfig)});
                window.agents = window.agents || {{}};
                window.agents['{agentId}'] = agent;
            ";

            JavaScriptBridge.Instance.ExecuteScript(script);
        }

        /// <summary>
        /// Set up default memory values
        /// </summary>
        private void SetupDefaultMemory()
        {
            SetMemory("health", 100f);
            SetMemory("energy", 100f);
            SetMemory("detectionRadius", detectionRadius);
            SetMemory("movementSpeed", movementSpeed);

            if (patrolPoints != null && patrolPoints.Length > 0)
            {
                var points = new List<object>();
                foreach (var point in patrolPoints)
                {
                    points.Add(new { x = point.position.x, y = point.position.y, z = point.position.z });
                }
                SetMemory("patrolPoints", points);
                SetMemory("currentPatrolIndex", 0);
            }
        }

        /// <summary>
        /// Register default actions
        /// </summary>
        private void RegisterDefaultActions()
        {
            RegisterAction("moveToTarget", MoveToTarget);
            RegisterAction("patrol", Patrol);
            RegisterAction("lookForTarget", LookForTarget);
            RegisterAction("attack", Attack);
            RegisterAction("flee", Flee);
            RegisterAction("idle", Idle);
        }

        /// <summary>
        /// Register default conditions
        /// </summary>
        private void RegisterDefaultConditions()
        {
            RegisterCondition("checkHealth", CheckHealth);
            RegisterCondition("detectEnemy", DetectEnemy);
            RegisterCondition("inAttackRange", InAttackRange);
            RegisterCondition("hasTarget", HasTarget);
            RegisterCondition("atPatrolPoint", AtPatrolPoint);
        }

        /// <summary>
        /// Create a default behavior tree
        /// </summary>
        private void CreateDefaultBehaviorTree()
        {
            CreateBehaviorTree("default_behavior", GetDefaultBehaviorTreeJson());
        }

        /// <summary>
        /// Get the default behavior tree configuration
        /// </summary>
        private string GetDefaultBehaviorTreeJson()
        {
            return @"{
                'id': 'default_root',
                'type': 'COMPOSITE',
                'parameters': { 'compositeType': 'selector' },
                'children': [
                    {
                        'id': 'combat_sequence',
                        'type': 'COMPOSITE',
                        'parameters': { 'compositeType': 'sequence' },
                        'children': [
                            {
                                'id': 'detect_enemy',
                                'type': 'CONDITION',
                                'condition': 'detectEnemy'
                            },
                            {
                                'id': 'attack_enemy',
                                'type': 'ACTION',
                                'action': 'attack'
                            }
                        ]
                    },
                    {
                        'id': 'patrol_sequence',
                        'type': 'COMPOSITE',
                        'parameters': { 'compositeType': 'sequence' },
                        'children': [
                            {
                                'id': 'patrol_action',
                                'type': 'ACTION',
                                'action': 'patrol'
                            }
                        ]
                    },
                    {
                        'id': 'idle_action',
                        'type': 'ACTION',
                        'action': 'idle'
                    }
                ]
            }";
        }

        /// <summary>
        /// Update the AI logic
        /// </summary>
        private void UpdateAI()
        {
            try
            {
                UpdateAgentPosition();
                ExecuteBehaviorTree();
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error updating AI for agent {agentId}: {ex.Message}");
            }
        }

        /// <summary>
        /// Update the agent's position in the JavaScript environment
        /// </summary>
        private void UpdateAgentPosition()
        {
            string script = $@"
                if (window.agents && window.agents['{agentId}']) {{
                    window.agents['{agentId}'].position = {{
                        x: {transform.position.x},
                        y: {transform.position.y},
                        z: {transform.position.z}
                    }};
                }}
            ";

            JavaScriptBridge.Instance.ExecuteScript(script);
        }

        /// <summary>
        /// Execute the behavior tree
        /// </summary>
        public void ExecuteBehaviorTree()
        {
            if (string.IsNullOrEmpty(currentBehaviorTreeId)) return;

            try
            {
                string result = JavaScriptBridge.Instance.ExecuteFunction<string>(
                    "window.behaviorTreeEngine.executeTree",
                    currentBehaviorTreeId,
                    $"window.agents['{agentId}']"
                );

                OnTreeExecuted?.Invoke(currentBehaviorTreeId, result);
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error executing behavior tree: {ex.Message}");
            }
        }

        /// <summary>
        /// Create a behavior tree
        /// </summary>
        public void CreateBehaviorTree(string treeId, string treeJson)
        {
            try
            {
                string script = $@"
                    if (typeof window.behaviorTreeEngine === 'undefined') {{
                        const {{ BehaviorTreeEngine }} = require('@steam-sim/ai');
                        window.behaviorTreeEngine = new BehaviorTreeEngine();

                        // Register Unity actions and conditions
                        window.unityActions = {{}};
                        window.unityConditions = {{}};
                    }}

                    const treeConfig = {treeJson};
                    window.behaviorTreeEngine.createTree('{treeId}', treeConfig);
                ";

                JavaScriptBridge.Instance.ExecuteScript(script);
                currentBehaviorTreeId = treeId;

                Debug.Log($"Behavior tree '{treeId}' created for agent {agentId}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to create behavior tree: {ex.Message}");
            }
        }

        /// <summary>
        /// Register a custom action
        /// </summary>
        public void RegisterAction(string actionName, Func<dynamic, dynamic, bool> action)
        {
            customActions[actionName] = action;

            string script = $@"
                window.unityActions['{actionName}'] = function(agent, blackboard) {{
                    return window.UnityCallAction('{agentId}', '{actionName}', agent, blackboard);
                }};
            ";

            JavaScriptBridge.Instance?.ExecuteScript(script);
        }

        /// <summary>
        /// Register a custom condition
        /// </summary>
        public void RegisterCondition(string conditionName, Func<dynamic, dynamic, bool> condition)
        {
            customConditions[conditionName] = condition;

            string script = $@"
                window.unityConditions['{conditionName}'] = function(agent, blackboard) {{
                    return window.UnityCallCondition('{agentId}', '{conditionName}', agent, blackboard);
                }};
            ";

            JavaScriptBridge.Instance?.ExecuteScript(script);
        }

        /// <summary>
        /// Set memory value
        /// </summary>
        public void SetMemory(string key, object value)
        {
            memory[key] = value;

            string script = $@"
                if (window.agents && window.agents['{agentId}']) {{
                    window.agentManager.updateAgentMemory('{agentId}', '{key}', {JsonConvert.SerializeObject(value)});
                }}
            ";

            JavaScriptBridge.Instance?.ExecuteScript(script);
        }

        /// <summary>
        /// Get memory value
        /// </summary>
        public T GetMemory<T>(string key)
        {
            if (memory.TryGetValue(key, out object value))
            {
                if (value is T directValue)
                    return directValue;

                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return default(T);
                }
            }

            return default(T);
        }

        // Default Action Implementations

        private bool MoveToTarget(dynamic agent, dynamic blackboard)
        {
            try
            {
                var target = blackboard.data.Get("target");
                if (target == null) return false;

                Vector3 targetPos = new Vector3(target.x, target.y, target.z);
                Vector3 direction = (targetPos - transform.position).normalized;

                transform.position += direction * movementSpeed * Time.deltaTime;

                float distance = Vector3.Distance(transform.position, targetPos);
                return distance < 1f;
            }
            catch
            {
                return false;
            }
        }

        private bool Patrol(dynamic agent, dynamic blackboard)
        {
            if (patrolPoints == null || patrolPoints.Length == 0) return true;

            try
            {
                int currentIndex = GetMemory<int>("currentPatrolIndex");
                if (currentIndex >= patrolPoints.Length) currentIndex = 0;

                Transform targetPoint = patrolPoints[currentIndex];
                Vector3 direction = (targetPoint.position - transform.position).normalized;

                transform.position += direction * movementSpeed * Time.deltaTime;

                float distance = Vector3.Distance(transform.position, targetPoint.position);
                if (distance < 1f)
                {
                    int nextIndex = (currentIndex + 1) % patrolPoints.Length;
                    SetMemory("currentPatrolIndex", nextIndex);
                    return true;
                }

                return false;
            }
            catch
            {
                return true;
            }
        }

        private bool LookForTarget(dynamic agent, dynamic blackboard)
        {
            GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");

            foreach (var enemy in enemies)
            {
                float distance = Vector3.Distance(transform.position, enemy.transform.position);
                if (distance <= detectionRadius)
                {
                    SetMemory("target", new {
                        x = enemy.transform.position.x,
                        y = enemy.transform.position.y,
                        z = enemy.transform.position.z
                    });
                    return true;
                }
            }

            return false;
        }

        private bool Attack(dynamic agent, dynamic blackboard)
        {
            var target = blackboard.data.Get("target");
            if (target == null) return false;

            // Simple attack animation or effect
            Debug.Log($"{agentId} attacking target!");

            // Reset target after attack
            SetMemory("target", null);
            return true;
        }

        private bool Flee(dynamic agent, dynamic blackboard)
        {
            var threat = blackboard.data.Get("threat");
            if (threat == null) return true;

            Vector3 threatPos = new Vector3(threat.x, threat.y, threat.z);
            Vector3 fleeDirection = (transform.position - threatPos).normalized;

            transform.position += fleeDirection * movementSpeed * 1.5f * Time.deltaTime;
            return false; // Keep fleeing
        }

        private bool Idle(dynamic agent, dynamic blackboard)
        {
            // Simple idle behavior - could play animation, look around, etc.
            return true;
        }

        // Default Condition Implementations

        private bool CheckHealth(dynamic agent, dynamic blackboard)
        {
            float threshold = blackboard.parameters?.threshold ?? 50f;
            float health = GetMemory<float>("health");
            return health > threshold;
        }

        private bool DetectEnemy(dynamic agent, dynamic blackboard)
        {
            GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");

            foreach (var enemy in enemies)
            {
                float distance = Vector3.Distance(transform.position, enemy.transform.position);
                if (distance <= detectionRadius)
                {
                    SetMemory("target", new {
                        x = enemy.transform.position.x,
                        y = enemy.transform.position.y,
                        z = enemy.transform.position.z
                    });
                    return true;
                }
            }

            return false;
        }

        private bool InAttackRange(dynamic agent, dynamic blackboard)
        {
            var target = blackboard.data.Get("target");
            if (target == null) return false;

            Vector3 targetPos = new Vector3(target.x, target.y, target.z);
            float distance = Vector3.Distance(transform.position, targetPos);
            return distance <= 2f; // Attack range
        }

        private bool HasTarget(dynamic agent, dynamic blackboard)
        {
            var target = blackboard.data.Get("target");
            return target != null;
        }

        private bool AtPatrolPoint(dynamic agent, dynamic blackboard)
        {
            if (patrolPoints == null || patrolPoints.Length == 0) return true;

            int currentIndex = GetMemory<int>("currentPatrolIndex");
            if (currentIndex >= patrolPoints.Length) return false;

            Transform targetPoint = patrolPoints[currentIndex];
            float distance = Vector3.Distance(transform.position, targetPoint.position);
            return distance < 1f;
        }

        // Unity Inspector Methods

        void OnDrawGizmos()
        {
            if (!enableDebugDraw) return;

            // Draw detection radius
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, detectionRadius);

            // Draw patrol points
            if (patrolPoints != null)
            {
                Gizmos.color = Color.blue;
                for (int i = 0; i < patrolPoints.Length; i++)
                {
                    if (patrolPoints[i] != null)
                    {
                        Gizmos.DrawWireSphere(patrolPoints[i].position, 0.5f);

                        // Draw lines between patrol points
                        if (i < patrolPoints.Length - 1 && patrolPoints[i + 1] != null)
                        {
                            Gizmos.DrawLine(patrolPoints[i].position, patrolPoints[i + 1].position);
                        }
                        else if (i == patrolPoints.Length - 1 && patrolPoints[0] != null)
                        {
                            Gizmos.DrawLine(patrolPoints[i].position, patrolPoints[0].position);
                        }
                    }
                }
            }

            // Draw current target
            if (memory.TryGetValue("target", out object targetObj) && targetObj != null)
            {
                try
                {
                    dynamic target = targetObj;
                    Vector3 targetPos = new Vector3(target.x, target.y, target.z);
                    Gizmos.color = Color.red;
                    Gizmos.DrawLine(transform.position, targetPos);
                    Gizmos.DrawWireSphere(targetPos, 1f);
                }
                catch { }
            }
        }

        void OnValidate()
        {
            if (string.IsNullOrEmpty(agentId))
            {
                agentId = $"agent_{GetInstanceID()}";
            }
        }

        // Cleanup
        void OnDestroy()
        {
            if (JavaScriptBridge.Instance != null && isInitialized)
            {
                try
                {
                    string script = $@"
                        if (window.agentManager && window.agents && window.agents['{agentId}']) {{
                            window.agentManager.removeAgent('{agentId}');
                            delete window.agents['{agentId}'];
                        }}
                    ";
                    JavaScriptBridge.Instance.ExecuteScript(script);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Error cleaning up agent: {ex.Message}");
                }
            }
        }
    }

    /// <summary>
    /// Example AI Manager for coordinating multiple AI agents
    /// </summary>
    public class AIManager : MonoBehaviour
    {
        [Header("Manager Settings")]
        [SerializeField] private float globalUpdateInterval = 0.1f;
        [SerializeField] private int maxAgentsPerFrame = 5;
        [SerializeField] private bool enableGlobalEvents = true;

        private List<AIAgent> agents = new List<AIAgent>();
        private int currentAgentIndex = 0;
        private float lastUpdateTime = 0f;

        void Start()
        {
            // Find all AI agents in the scene
            agents.AddRange(FindObjectsOfType<AIAgent>());

            if (enableGlobalEvents)
            {
                SetupGlobalEventHandlers();
            }

            Debug.Log($"AI Manager initialized with {agents.Count} agents");
        }

        void Update()
        {
            if (Time.time - lastUpdateTime >= globalUpdateInterval)
            {
                UpdateAgentsBatch();
                lastUpdateTime = Time.time;
            }
        }

        /// <summary>
        /// Update agents in batches for better performance
        /// </summary>
        private void UpdateAgentsBatch()
        {
            int agentsUpdated = 0;
            int startIndex = currentAgentIndex;

            while (agentsUpdated < maxAgentsPerFrame && agents.Count > 0)
            {
                if (currentAgentIndex >= agents.Count)
                {
                    currentAgentIndex = 0;
                }

                if (agents[currentAgentIndex] != null)
                {
                    // Agent updates are handled in their own Update methods
                    // This is where you could add global coordination logic
                }

                currentAgentIndex = (currentAgentIndex + 1) % agents.Count;
                agentsUpdated++;

                // Prevent infinite loop
                if (currentAgentIndex == startIndex && agentsUpdated > 0)
                {
                    break;
                }
            }
        }

        /// <summary>
        /// Set up global event handlers for AI coordination
        /// </summary>
        private void SetupGlobalEventHandlers()
        {
            if (JavaScriptBridge.Instance != null)
            {
                JavaScriptBridge.Instance.OnEngineInitialized += () =>
                {
                    string script = @"
                        // Global AI coordination events
                        window.globalAIEvents = {
                            agents: {},
                            events: [],

                            addEvent: function(eventType, data) {
                                this.events.push({
                                    type: eventType,
                                    data: data,
                                    timestamp: Date.now()
                                });

                                // Keep only recent events
                                if (this.events.length > 100) {
                                    this.events.shift();
                                }
                            },

                            getRecentEvents: function(eventType, maxAge) {
                                const cutoff = Date.now() - (maxAge || 5000);
                                return this.events.filter(e =>
                                    (!eventType || e.type === eventType) &&
                                    e.timestamp > cutoff
                                );
                            }
                        };
                    ";

                    JavaScriptBridge.Instance.ExecuteScript(script);
                };
            }
        }

        /// <summary>
        /// Add an agent to the manager
        /// </summary>
        public void RegisterAgent(AIAgent agent)
        {
            if (agent != null && !agents.Contains(agent))
            {
                agents.Add(agent);
                Debug.Log($"Registered agent: {agent.name}");
            }
        }

        /// <summary>
        /// Remove an agent from the manager
        /// </summary>
        public void UnregisterAgent(AIAgent agent)
        {
            if (agents.Remove(agent))
            {
                Debug.Log($"Unregistered agent: {agent.name}");
            }
        }

        /// <summary>
        /// Get all agents within a radius of a position
        /// </summary>
        public List<AIAgent> GetAgentsInRadius(Vector3 center, float radius)
        {
            List<AIAgent> nearbyAgents = new List<AIAgent>();

            foreach (var agent in agents)
            {
                if (agent != null)
                {
                    float distance = Vector3.Distance(center, agent.transform.position);
                    if (distance <= radius)
                    {
                        nearbyAgents.Add(agent);
                    }
                }
            }

            return nearbyAgents;
        }

        /// <summary>
        /// Force garbage collection across all JavaScript engines
        /// </summary>
        [ContextMenu("Force Garbage Collection")]
        public void ForceGarbageCollection()
        {
            if (JavaScriptBridge.Instance != null)
            {
                JavaScriptBridge.Instance.ForceGarbageCollection();
            }
        }

        public int AgentCount => agents.Count;
        public List<AIAgent> Agents => new List<AIAgent>(agents);
    }
}