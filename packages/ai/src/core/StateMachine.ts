import { EventEmitter } from '../utils/EventEmitter';
import {
  StateMachine,
  State,
  Transition,
  StateCondition,
  ConditionType,
  ComparisonOperator,
  Agent
} from '../types';

export class StateMachineEngine extends EventEmitter {
  private stateMachines: Map<string, StateMachine> = new Map();

  public createStateMachine(id: string, initialState: string): StateMachine {
    const stateMachine: StateMachine = {
      currentState: initialState,
      states: new Map(),
      transitions: [],
      globalVariables: {}
    };

    this.stateMachines.set(id, stateMachine);
    this.emit('state_machine_created', { id, stateMachine });
    return stateMachine;
  }

  public addState(machineId: string, state: State): boolean {
    const machine = this.stateMachines.get(machineId);
    if (!machine) return false;

    machine.states.set(state.id, state);
    this.emit('state_added', { machineId, state });
    return true;
  }

  public addTransition(machineId: string, transition: Transition): boolean {
    const machine = this.stateMachines.get(machineId);
    if (!machine) return false;

    machine.transitions.push(transition);
    machine.transitions.sort((a, b) => b.priority - a.priority);
    this.emit('transition_added', { machineId, transition });
    return true;
  }

  public updateStateMachine(machineId: string, agent: Agent, deltaTime: number): boolean {
    const machine = this.stateMachines.get(machineId);
    if (!machine) return false;

    const currentState = machine.states.get(machine.currentState);
    if (!currentState) return false;

    if (currentState.onUpdate) {
      currentState.onUpdate(agent, deltaTime);
    }

    const validTransition = this.findValidTransition(machine, agent);
    if (validTransition && validTransition.toState !== machine.currentState) {
      this.transitionToState(machine, validTransition.toState, agent);

      if (validTransition.action) {
        validTransition.action(agent);
      }
    }

    this.emit('state_machine_updated', {
      machineId,
      agentId: agent.id,
      currentState: machine.currentState,
      deltaTime,
      timestamp: Date.now()
    });

    return true;
  }

  private findValidTransition(machine: StateMachine, agent: Agent): Transition | null {
    for (const transition of machine.transitions) {
      if (transition.fromState === machine.currentState && transition.condition(agent)) {
        return transition;
      }
    }
    return null;
  }

  private transitionToState(machine: StateMachine, newStateId: string, agent: Agent): void {
    const currentState = machine.states.get(machine.currentState);
    const newState = machine.states.get(newStateId);

    if (!newState) return;

    if (currentState && currentState.onExit) {
      currentState.onExit(agent);
    }

    const previousState = machine.currentState;
    machine.currentState = newStateId;

    if (newState.onEnter) {
      newState.onEnter(agent);
    }

    this.emit('state_changed', {
      agentId: agent.id,
      previousState,
      newState: newStateId,
      timestamp: Date.now()
    });
  }

  public getCurrentState(machineId: string): string | null {
    const machine = this.stateMachines.get(machineId);
    return machine ? machine.currentState : null;
  }

  public setGlobalVariable(machineId: string, key: string, value: any): boolean {
    const machine = this.stateMachines.get(machineId);
    if (!machine) return false;

    machine.globalVariables[key] = value;
    return true;
  }

  public getGlobalVariable(machineId: string, key: string): any {
    const machine = this.stateMachines.get(machineId);
    return machine ? machine.globalVariables[key] : undefined;
  }

  public createStandardStates(): {
    idle: State;
    patrol: State;
    chase: State;
    attack: State;
    flee: State;
    search: State;
    dead: State;
  } {
    return {
      idle: {
        id: 'idle',
        name: 'Idle',
        onEnter: (agent) => {
          this.emit('agent_idle', { agentId: agent.id, timestamp: Date.now() });
        },
        onUpdate: (agent, deltaTime) => {
          const restTimeItem = agent.memory.shortTerm.get('restTime');
          const restTime = (typeof restTimeItem === 'number') ? restTimeItem : (restTimeItem?.data || 0);
          agent.memory.shortTerm.set('restTime', {
            id: 'restTime',
            type: 'action' as any,
            data: restTime + deltaTime,
            timestamp: Date.now(),
            importance: 1,
            accessed: 1,
            strength: 1
          });
        },
        conditions: []
      },

      patrol: {
        id: 'patrol',
        name: 'Patrol',
        onEnter: (agent) => {
          this.emit('agent_patrolling', { agentId: agent.id, timestamp: Date.now() });
          agent.memory.shortTerm.set('patrolStartTime', {
            id: 'patrolStartTime',
            type: 'action' as any,
            data: Date.now(),
            timestamp: Date.now(),
            importance: 1,
            accessed: 1,
            strength: 1
          });
        },
        onUpdate: (agent, deltaTime) => {
          const waypoints = agent.memory.longTerm.get('waypoints')?.data || [];
          if (waypoints.length === 0) return;

          const currentWaypointIndex = agent.memory.shortTerm.get('currentWaypoint')?.data || 0;
          const targetWaypoint = waypoints[currentWaypointIndex];

          const distance = this.calculateDistance(agent.position, targetWaypoint);
          if (distance < 1.0) {
            const nextIndex = (currentWaypointIndex + 1) % waypoints.length;
            agent.memory.shortTerm.set('currentWaypoint', {
              id: 'currentWaypoint',
              type: 'action' as any,
              data: nextIndex,
              timestamp: Date.now(),
              importance: 1,
              accessed: 1,
              strength: 1
            });
          } else {
            const direction = this.normalize(this.subtract(targetWaypoint, agent.position));
            const speed = 0.1;
            agent.position.x += direction.x * speed;
            agent.position.y += direction.y * speed;
            agent.position.z += direction.z * speed;
          }
        },
        conditions: []
      },

      chase: {
        id: 'chase',
        name: 'Chase',
        onEnter: (agent) => {
          this.emit('agent_chasing', { agentId: agent.id, timestamp: Date.now() });
        },
        onUpdate: (agent, deltaTime) => {
          const target = agent.memory.shortTerm.get('chaseTarget')?.data;
          if (!target) return;

          const distance = this.calculateDistance(agent.position, target.position);
          if (distance > 0.5) {
            const direction = this.normalize(this.subtract(target.position, agent.position));
            const speed = 0.15;
            agent.position.x += direction.x * speed;
            agent.position.y += direction.y * speed;
            agent.position.z += direction.z * speed;
          }
        },
        conditions: []
      },

      attack: {
        id: 'attack',
        name: 'Attack',
        onEnter: (agent) => {
          this.emit('agent_attacking', { agentId: agent.id, timestamp: Date.now() });
          agent.memory.shortTerm.set('lastAttackTime', {
            id: 'lastAttackTime',
            type: 'action' as any,
            data: Date.now(),
            timestamp: Date.now(),
            importance: 1,
            accessed: 1,
            strength: 1
          });
        },
        onUpdate: (agent, deltaTime) => {
          const target = agent.memory.shortTerm.get('attackTarget')?.data;
          if (!target) return;

          const lastAttack = agent.memory.shortTerm.get('lastAttackTime')?.data || 0;
          const attackCooldown = 1000;

          if (Date.now() - lastAttack > attackCooldown) {
            const damage = agent.memory.longTerm.get('attackPower')?.data || 10;
            this.emit('agent_deals_damage', {
              attacker: agent.id,
              target: target.id,
              damage,
              timestamp: Date.now()
            });

            agent.memory.shortTerm.set('lastAttackTime', {
              id: 'lastAttackTime',
              type: 'action' as any,
              data: Date.now(),
              timestamp: Date.now(),
              importance: 1,
              accessed: 1,
              strength: 1
            });
          }
        },
        conditions: []
      },

      flee: {
        id: 'flee',
        name: 'Flee',
        onEnter: (agent) => {
          this.emit('agent_fleeing', { agentId: agent.id, timestamp: Date.now() });
        },
        onUpdate: (agent, deltaTime) => {
          const threats = agent.memory.shortTerm.get('threats')?.data || [];
          if (threats.length === 0) return;

          const averageThreatPosition = threats.reduce((sum: any, threat: any) => ({
            x: sum.x + threat.position.x,
            y: sum.y + threat.position.y,
            z: sum.z + threat.position.z
          }), { x: 0, y: 0, z: 0 });

          averageThreatPosition.x /= threats.length;
          averageThreatPosition.y /= threats.length;
          averageThreatPosition.z /= threats.length;

          const fleeDirection = this.normalize(this.subtract(agent.position, averageThreatPosition));
          const speed = 0.2;
          agent.position.x += fleeDirection.x * speed;
          agent.position.y += fleeDirection.y * speed;
          agent.position.z += fleeDirection.z * speed;
        },
        conditions: []
      },

      search: {
        id: 'search',
        name: 'Search',
        onEnter: (agent) => {
          this.emit('agent_searching', { agentId: agent.id, timestamp: Date.now() });
          agent.memory.shortTerm.set('searchStartTime', {
            id: 'searchStartTime',
            type: 'action' as any,
            data: Date.now(),
            timestamp: Date.now(),
            importance: 1,
            accessed: 1,
            strength: 1
          });
        },
        onUpdate: (agent, deltaTime) => {
          const searchPattern = agent.memory.longTerm.get('searchPattern')?.data || 'random';
          const searchTime = Date.now() - (agent.memory.shortTerm.get('searchStartTime')?.data || 0);

          if (searchPattern === 'random') {
            const randomDirection = {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2,
              z: (Math.random() - 0.5) * 2
            };
            const normalized = this.normalize(randomDirection);
            const speed = 0.05;
            agent.position.x += normalized.x * speed;
            agent.position.y += normalized.y * speed;
            agent.position.z += normalized.z * speed;
          }

          if (searchTime > 5000) {
            agent.memory.shortTerm.delete('searchStartTime');
          }
        },
        conditions: []
      },

      dead: {
        id: 'dead',
        name: 'Dead',
        onEnter: (agent) => {
          this.emit('agent_died', { agentId: agent.id, timestamp: Date.now() });
          agent.state = 'dead' as any;
        },
        onUpdate: () => {

        },
        conditions: []
      }
    };
  }

  public createStandardTransitions(): Transition[] {
    return [
      {
        id: 'idle_to_patrol',
        fromState: 'idle',
        toState: 'patrol',
        condition: (agent) => {
          const restTime = agent.memory.shortTerm.get('restTime')?.data || 0;
          return restTime > 3000;
        },
        priority: 1
      },
      {
        id: 'patrol_to_chase',
        fromState: 'patrol',
        toState: 'chase',
        condition: (agent) => {
          const nearbyEnemies = agent.memory.shortTerm.get('nearbyEnemies')?.data || [];
          return nearbyEnemies.length > 0;
        },
        action: (agent) => {
          const enemies = agent.memory.shortTerm.get('nearbyEnemies')?.data || [];
          if (enemies.length > 0) {
            agent.memory.shortTerm.set('chaseTarget', {
              id: 'chaseTarget',
              type: 'perception' as any,
              data: enemies[0],
              timestamp: Date.now(),
              importance: 5,
              accessed: 1,
              strength: 1
            });
          }
        },
        priority: 3
      },
      {
        id: 'chase_to_attack',
        fromState: 'chase',
        toState: 'attack',
        condition: (agent) => {
          const target = agent.memory.shortTerm.get('chaseTarget')?.data;
          if (!target) return false;
          const distance = this.calculateDistance(agent.position, target.position);
          return distance <= 2.0;
        },
        action: (agent) => {
          const target = agent.memory.shortTerm.get('chaseTarget')?.data;
          if (target) {
            agent.memory.shortTerm.set('attackTarget', {
              id: 'attackTarget',
              type: 'perception' as any,
              data: target,
              timestamp: Date.now(),
              importance: 5,
              accessed: 1,
              strength: 1
            });
          }
        },
        priority: 4
      },
      {
        id: 'any_to_flee',
        fromState: '*',
        toState: 'flee',
        condition: (agent) => {
          const health = agent.memory.shortTerm.get('health')?.data || 100;
          const threats = agent.memory.shortTerm.get('threats')?.data || [];
          return health < 30 && threats.length > 0;
        },
        priority: 5
      },
      {
        id: 'flee_to_search',
        fromState: 'flee',
        toState: 'search',
        condition: (agent) => {
          const threats = agent.memory.shortTerm.get('threats')?.data || [];
          return threats.length === 0;
        },
        priority: 2
      },
      {
        id: 'search_to_idle',
        fromState: 'search',
        toState: 'idle',
        condition: (agent) => {
          const searchTime = Date.now() - (agent.memory.shortTerm.get('searchStartTime')?.data || Date.now());
          return searchTime > 5000;
        },
        priority: 1
      },
      {
        id: 'any_to_dead',
        fromState: '*',
        toState: 'dead',
        condition: (agent) => {
          const health = agent.memory.shortTerm.get('health')?.data || 100;
          return health <= 0;
        },
        priority: 10
      }
    ];
  }

  public evaluateCondition(condition: StateCondition, agent: Agent): boolean {
    let value: any;

    switch (condition.type) {
      case ConditionType.HEALTH:
        value = agent.memory.shortTerm.get('health')?.data || 100;
        break;
      case ConditionType.DISTANCE:
        const target = agent.memory.shortTerm.get('target')?.data;
        if (!target) return false;
        value = this.calculateDistance(agent.position, target.position);
        break;
      case ConditionType.TIME:
        value = Date.now();
        break;
      case ConditionType.RESOURCE:
        value = agent.memory.shortTerm.get(condition.parameter)?.data || 0;
        break;
      case ConditionType.CUSTOM:
        value = agent.memory.shortTerm.get(condition.parameter)?.data;
        break;
      default:
        return false;
    }

    let result = false;

    switch (condition.operator) {
      case ComparisonOperator.EQUALS:
        result = value === condition.value;
        break;
      case ComparisonOperator.NOT_EQUALS:
        result = value !== condition.value;
        break;
      case ComparisonOperator.GREATER_THAN:
        result = value > condition.value;
        break;
      case ComparisonOperator.LESS_THAN:
        result = value < condition.value;
        break;
      case ComparisonOperator.GREATER_EQUAL:
        result = value >= condition.value;
        break;
      case ComparisonOperator.LESS_EQUAL:
        result = value <= condition.value;
        break;
    }

    return condition.inverse ? !result : result;
  }

  private calculateDistance(a: any, b: any): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: any, b: any): any {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    };
  }

  private normalize(v: any): any {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }

  public getStateMachine(id: string): StateMachine | undefined {
    return this.stateMachines.get(id);
  }

  public removeStateMachine(id: string): boolean {
    return this.stateMachines.delete(id);
  }

  public getAllStateMachines(): StateMachine[] {
    return Array.from(this.stateMachines.values());
  }
}