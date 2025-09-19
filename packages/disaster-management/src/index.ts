export { Disaster, DisasterConfig, DisasterImpact, DisasterWarning, DisasterType, DisasterPhase } from './core/Disaster';
export {
  EmergencyResponse,
  EmergencyResource,
  ResponseAction,
  EvacuationZone,
  CommunicationSystem,
  ResourceType,
  ActionType,
  Priority,
  ActionStatus
} from './core/EmergencyResponse';
export {
  DisasterVisualizer,
  DisasterVisualizationData,
  ResourceVisualizationData,
  ActionVisualizationData,
  EvacuationVisualizationData,
  IntensityMapData,
  HazardZoneData,
  RouteData,
  CommunicationVisualizationData
} from './utils/DisasterVisualizer';

import { Disaster, DisasterType, DisasterConfig } from './core/Disaster';
import { EmergencyResponse } from './core/EmergencyResponse';
import { DisasterVisualizer } from './utils/DisasterVisualizer';

// Main disaster management simulation class
export class DisasterManagementSimulation {
  private disaster: Disaster;
  private emergencyResponse: EmergencyResponse;
  private visualizer: DisasterVisualizer;
  private isRunning: boolean = false;
  private currentTime: number = 0;
  private simulationInterval?: NodeJS.Timeout;

  constructor(
    disasterType: DisasterType,
    disasterPosition: { x: number; y: number },
    disasterConfig: DisasterConfig,
    commandCenterPosition: { x: number; y: number } = { x: 0, y: 0 },
    gridSize: { width: number; height: number } = { width: 100, height: 100 }
  ) {
    this.disaster = new Disaster(
      `disaster-${Date.now()}`,
      disasterType,
      disasterPosition,
      disasterConfig,
      0 // Start time
    );

    this.emergencyResponse = new EmergencyResponse(
      `response-${Date.now()}`,
      this.disaster,
      commandCenterPosition
    );

    this.visualizer = new DisasterVisualizer(
      this.disaster,
      this.emergencyResponse,
      gridSize
    );
  }

  getDisaster(): Disaster {
    return this.disaster;
  }

  getEmergencyResponse(): EmergencyResponse {
    return this.emergencyResponse;
  }

  getVisualizer(): DisasterVisualizer {
    return this.visualizer;
  }

  start(updateIntervalMs: number = 1000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.simulationInterval = setInterval(() => {
      this.step();
    }, updateIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }

  step(): void {
    if (!this.isRunning) return;

    this.currentTime += 1; // Increment by 1 time unit

    // Update disaster
    this.disaster.update(this.currentTime);

    // Update emergency response
    this.emergencyResponse.updateActions(this.currentTime, 1);

    // Auto-escalate response if disaster is severe
    if (this.disaster.currentIntensity > this.disaster.config.intensity * 0.8 &&
        this.emergencyResponse.responseLevel < 3) {
      this.emergencyResponse.escalateResponse();
    }
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    // Reset disaster to initial state
    this.disaster.update(0);
  }

  // Scenario setup methods
  setupEarthquakeScenario(magnitude: number = 7.0): void {
    // Create evacuation zones around the epicenter
    const epicenter = this.disaster.position;
    const radius = this.disaster.config.affectedRadius;

    // High-risk zone
    this.emergencyResponse.createEvacuationZone(
      'high-risk-zone',
      { x: epicenter.x, y: epicenter.y, radius: radius * 0.5 },
      Math.floor(5000 * (magnitude / 10))
    );

    // Medium-risk zone
    this.emergencyResponse.createEvacuationZone(
      'medium-risk-zone',
      { x: epicenter.x, y: epicenter.y, radius: radius * 0.8 },
      Math.floor(10000 * (magnitude / 10))
    );

    // Create search and rescue actions
    this.emergencyResponse.createResponseAction(
      'search-rescue-primary',
      'search-rescue',
      ['search-rescue-1'],
      { x: epicenter.x, y: epicenter.y, radius: radius * 0.3 },
      'critical'
    );

    // Medical aid in affected areas
    this.emergencyResponse.createResponseAction(
      'medical-response',
      'medical-aid',
      ['ambulance-1'],
      { x: epicenter.x, y: epicenter.y, radius: radius * 0.6 },
      'high'
    );
  }

  setupFloodScenario(waterLevel: number = 5): void {
    const floodCenter = this.disaster.position;
    const affectedRadius = this.disaster.config.affectedRadius;

    // Create evacuation zones based on water level
    this.emergencyResponse.createEvacuationZone(
      'flood-evacuation-primary',
      { x: floodCenter.x, y: floodCenter.y, radius: affectedRadius },
      Math.floor(waterLevel * 1000)
    );

    // Setup boat rescue operations
    this.emergencyResponse.createResponseAction(
      'water-rescue',
      'search-rescue',
      ['boat-team-1'],
      { x: floodCenter.x, y: floodCenter.y, radius: affectedRadius },
      'critical'
    );

    // Evacuation assistance
    this.emergencyResponse.createResponseAction(
      'evacuation-assistance',
      'evacuation',
      ['police-1'],
      { x: floodCenter.x, y: floodCenter.y, radius: affectedRadius * 1.2 },
      'high'
    );
  }

  setupFireScenario(fireIntensity: number = 8): void {
    const fireCenter = this.disaster.position;
    const fireRadius = this.disaster.config.affectedRadius;

    // Create fire evacuation zone
    this.emergencyResponse.createEvacuationZone(
      'fire-evacuation',
      { x: fireCenter.x, y: fireCenter.y, radius: fireRadius * 1.5 },
      Math.floor(fireIntensity * 500)
    );

    // Firefighting operations
    this.emergencyResponse.createResponseAction(
      'firefighting-primary',
      'firefighting',
      ['fire-dept-1'],
      { x: fireCenter.x, y: fireCenter.y, radius: fireRadius },
      'critical'
    );

    // Hazmat cleanup if industrial fire
    if (fireIntensity > 7) {
      this.emergencyResponse.createResponseAction(
        'hazmat-response',
        'hazmat-cleanup',
        ['hazmat-1'],
        { x: fireCenter.x, y: fireCenter.y, radius: fireRadius * 0.5 },
        'high'
      );
    }
  }

  setupHurricaneScenario(category: number = 3): void {
    const hurricaneCenter = this.disaster.position;
    const impactRadius = this.disaster.config.affectedRadius;

    // Mass evacuation for Category 3+ hurricanes
    this.emergencyResponse.createEvacuationZone(
      'hurricane-evacuation-coastal',
      { x: hurricaneCenter.x, y: hurricaneCenter.y, radius: impactRadius },
      Math.floor(category * 20000)
    );

    // Pre-position resources
    this.emergencyResponse.createResponseAction(
      'pre-position-resources',
      'logistics',
      ['logistics-1'],
      { x: hurricaneCenter.x + impactRadius + 10, y: hurricaneCenter.y, radius: 5 },
      'high'
    );

    // Setup emergency shelters
    this.emergencyResponse.createResponseAction(
      'setup-shelters',
      'shelter-setup',
      ['shelter-1'],
      { x: hurricaneCenter.x + impactRadius + 15, y: hurricaneCenter.y, radius: 10 },
      'high'
    );
  }

  // Player interaction methods
  issueEvacuationOrder(zoneId: string): boolean {
    const zone = this.emergencyResponse.evacuationZones.find(z => z.id === zoneId);
    if (!zone) return false;

    // Create evacuation action
    return this.emergencyResponse.createResponseAction(
      `evacuation-${zoneId}`,
      'evacuation',
      ['police-1'],
      zone.area,
      'critical'
    );
  }

  deployResource(resourceId: string, targetLocation: { x: number; y: number }): boolean {
    const resource = this.emergencyResponse.resources.find(r => r.id === resourceId);
    if (!resource || !resource.isActive) return false;

    // Create deployment action
    return this.emergencyResponse.createResponseAction(
      `deploy-${resourceId}`,
      'transportation',
      [resourceId],
      { x: targetLocation.x, y: targetLocation.y, radius: 1 },
      'medium'
    );
  }

  requestAdditionalResources(): boolean {
    this.emergencyResponse.escalateResponse();
    return true;
  }

  getDisasterWarning(): any {
    const timeUntilImpact = Math.max(0, -this.currentTime); // If negative, disaster is happening
    return this.disaster.generateWarning(timeUntilImpact);
  }

  getDamageAssessment(): any {
    return this.emergencyResponse.getDamageAssessment();
  }

  getSimulationStatus(): {
    isRunning: boolean;
    currentTime: number;
    disasterPhase: string;
    responseLevel: number;
    effectiveness: number;
  } {
    return {
      isRunning: this.isRunning,
      currentTime: this.currentTime,
      disasterPhase: this.disaster.phase,
      responseLevel: this.emergencyResponse.responseLevel,
      effectiveness: this.emergencyResponse.getResponseEffectiveness()
    };
  }

  exportState(): string {
    return this.visualizer.exportToUnity();
  }
}