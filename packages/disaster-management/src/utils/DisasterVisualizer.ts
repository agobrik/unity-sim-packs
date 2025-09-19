import { Disaster, DisasterType } from '../core/Disaster';
import { EmergencyResponse, EmergencyResource, ResponseAction, EvacuationZone } from '../core/EmergencyResponse';

export interface DisasterVisualizationData {
  disaster: {
    id: string;
    type: DisasterType;
    phase: string;
    position: { x: number; y: number };
    currentRadius: number;
    intensity: number;
    affectedAreas: string[];
  };
  emergencyResponse: {
    commandCenter: { x: number; y: number };
    resources: ResourceVisualizationData[];
    actions: ActionVisualizationData[];
    evacuationZones: EvacuationVisualizationData[];
    responseLevel: number;
    effectiveness: number;
  };
  impactMap: IntensityMapData[][];
  hazardZones: HazardZoneData[];
  evacuationRoutes: RouteData[];
  communicationNetworks: CommunicationVisualizationData[];
}

export interface ResourceVisualizationData {
  id: string;
  type: string;
  position: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  status: 'available' | 'deployed' | 'returning' | 'maintenance';
  capacity: number;
  efficiency: number;
  personnel: number;
  equipment: string[];
  color: string;
  icon: string;
}

export interface ActionVisualizationData {
  id: string;
  type: string;
  targetArea: { x: number; y: number; radius: number };
  status: string;
  priority: string;
  progress: number;
  effectiveness: number;
  resourceCount: number;
  color: string;
  animation: string;
}

export interface EvacuationVisualizationData {
  id: string;
  area: { x: number; y: number; radius: number };
  population: number;
  evacuatedPopulation: number;
  progress: number;
  routes: { x: number; y: number }[][];
  shelterLocations: { x: number; y: number }[];
  status: 'planned' | 'active' | 'completed';
  color: string;
}

export interface IntensityMapData {
  x: number;
  y: number;
  intensity: number;
  disasterType: string;
  color: string;
  alpha: number;
}

export interface HazardZoneData {
  id: string;
  type: 'danger' | 'warning' | 'watch' | 'safe';
  area: { x: number; y: number; radius: number };
  level: number;
  color: string;
  message: string;
}

export interface RouteData {
  id: string;
  type: 'evacuation' | 'emergency-access' | 'supply-line';
  path: { x: number; y: number }[];
  status: 'open' | 'blocked' | 'congested';
  capacity: number;
  currentLoad: number;
  color: string;
  width: number;
}

export interface CommunicationVisualizationData {
  id: string;
  type: string;
  position: { x: number; y: number };
  coverage: { x: number; y: number; radius: number }[];
  isOperational: boolean;
  reliability: number;
  load: number;
  color: string;
}

export class DisasterVisualizer {
  private _disaster: Disaster;
  private _emergencyResponse: EmergencyResponse;
  private _gridSize: { width: number; height: number };

  constructor(
    disaster: Disaster,
    emergencyResponse: EmergencyResponse,
    gridSize: { width: number; height: number } = { width: 100, height: 100 }
  ) {
    this._disaster = disaster;
    this._emergencyResponse = emergencyResponse;
    this._gridSize = gridSize;
  }

  generateVisualizationData(): DisasterVisualizationData {
    return {
      disaster: this.generateDisasterVisualization(),
      emergencyResponse: this.generateResponseVisualization(),
      impactMap: this.generateImpactMap(),
      hazardZones: this.generateHazardZones(),
      evacuationRoutes: this.generateEvacuationRoutes(),
      communicationNetworks: this.generateCommunicationNetworks()
    };
  }

  private generateDisasterVisualization() {
    return {
      id: this._disaster.id,
      type: this._disaster.type,
      phase: this._disaster.phase,
      position: this._disaster.position,
      currentRadius: this._disaster.getCurrentRadius(),
      intensity: this._disaster.currentIntensity,
      affectedAreas: this._disaster.affectedAreas
    };
  }

  private generateResponseVisualization() {
    return {
      commandCenter: { x: 0, y: 0 }, // Would get from emergency response
      resources: this.generateResourceVisualizations(),
      actions: this.generateActionVisualizations(),
      evacuationZones: this.generateEvacuationZoneVisualizations(),
      responseLevel: this._emergencyResponse.responseLevel,
      effectiveness: this._emergencyResponse.getResponseEffectiveness()
    };
  }

  private generateResourceVisualizations(): ResourceVisualizationData[] {
    return this._emergencyResponse.resources.map(resource => {
      const status = this.getResourceStatus(resource);
      const color = this.getResourceColor(resource.type);
      const icon = this.getResourceIcon(resource.type);

      return {
        id: resource.id,
        type: resource.type,
        position: resource.currentLocation,
        targetPosition: resource.targetLocation,
        status,
        capacity: resource.capacity,
        efficiency: resource.efficiency,
        personnel: resource.personnel,
        equipment: resource.equipment,
        color,
        icon
      };
    });
  }

  private getResourceStatus(resource: EmergencyResource): 'available' | 'deployed' | 'returning' | 'maintenance' {
    if (!resource.isActive) return 'maintenance';
    if (resource.targetLocation) return 'deployed';
    if (resource.maintenanceLevel < 0.7) return 'maintenance';
    return 'available';
  }

  private getResourceColor(type: string): string {
    const colors: Record<string, string> = {
      'fire-department': '#FF4444',
      'police': '#4444FF',
      'ambulance': '#44FF44',
      'search-rescue': '#FFAA44',
      'military': '#444444',
      'medical-team': '#FF44AA',
      'hazmat': '#AAAA44',
      'engineering': '#44AAAA',
      'helicopter': '#AA44AA',
      'boat': '#4444AA',
      'heavy-equipment': '#AAAA44',
      'shelter': '#AA4444',
      'supply-distribution': '#44AA44',
      'communication': '#4488AA',
      'logistics': '#8844AA'
    };
    return colors[type] || '#888888';
  }

  private getResourceIcon(type: string): string {
    const icons: Record<string, string> = {
      'fire-department': 'fire-truck',
      'police': 'police-car',
      'ambulance': 'ambulance',
      'search-rescue': 'rescue-team',
      'military': 'military-vehicle',
      'medical-team': 'medical-cross',
      'hazmat': 'hazmat-suit',
      'engineering': 'construction',
      'helicopter': 'helicopter',
      'boat': 'boat',
      'heavy-equipment': 'excavator',
      'shelter': 'tent',
      'supply-distribution': 'truck',
      'communication': 'radio-tower',
      'logistics': 'cargo'
    };
    return icons[type] || 'generic-vehicle';
  }

  private generateActionVisualizations(): ActionVisualizationData[] {
    return this._emergencyResponse.actions.map(action => {
      const progress = action.estimatedDuration > 0 ?
        Math.min(1, action.actualDuration / action.estimatedDuration) : 0;

      return {
        id: action.id,
        type: action.type,
        targetArea: action.targetArea,
        status: action.status,
        priority: action.priority,
        progress,
        effectiveness: action.effectiveness,
        resourceCount: action.resourceIds.length,
        color: this.getActionColor(action.type),
        animation: this.getActionAnimation(action.type, action.status)
      };
    });
  }

  private getActionColor(type: string): string {
    const colors: Record<string, string> = {
      evacuation: '#FFD700',
      'search-rescue': '#FF6B35',
      firefighting: '#FF4444',
      'medical-aid': '#44FF88',
      'debris-removal': '#8B4513',
      'infrastructure-repair': '#4169E1',
      'supply-distribution': '#32CD32',
      security: '#4B0082',
      'hazmat-cleanup': '#FF8C00',
      'communication-setup': '#20B2AA',
      transportation: '#FF1493',
      'shelter-setup': '#8FBC8F',
      assessment: '#DDA0DD'
    };
    return colors[type] || '#888888';
  }

  private getActionAnimation(type: string, status: string): string {
    if (status === 'completed') return 'fade-out';
    if (status === 'in-progress') {
      const animations: Record<string, string> = {
        evacuation: 'pulsing-yellow',
        'search-rescue': 'rotating-spotlight',
        firefighting: 'water-spray',
        'medical-aid': 'cross-pulse',
        'debris-removal': 'digging',
        'infrastructure-repair': 'building',
        'supply-distribution': 'truck-movement',
        security: 'patrol-pattern',
        'hazmat-cleanup': 'decontamination',
        'communication-setup': 'signal-waves',
        transportation: 'vehicle-movement',
        'shelter-setup': 'construction',
        assessment: 'scanning'
      };
      return animations[type] || 'generic-activity';
    }
    return 'static';
  }

  private generateEvacuationZoneVisualizations(): EvacuationVisualizationData[] {
    return this._emergencyResponse.evacuationZones.map(zone => {
      const status = zone.evacuationProgress >= 1 ? 'completed' :
                    zone.evacuationProgress > 0 ? 'active' : 'planned';

      const shelterLocations = this.calculateShelterLocations(zone);

      return {
        id: zone.id,
        area: zone.area,
        population: zone.population,
        evacuatedPopulation: zone.evacuatedPopulation,
        progress: zone.evacuationProgress,
        routes: zone.evacuationRoutes,
        shelterLocations,
        status,
        color: this.getEvacuationZoneColor(status, zone.evacuationProgress)
      };
    });
  }

  private calculateShelterLocations(zone: EvacuationZone): { x: number; y: number }[] {
    // Calculate shelter locations outside the evacuation zone
    const shelters: { x: number; y: number }[] = [];
    const numShelters = Math.ceil(zone.population / 500); // 500 people per shelter

    for (let i = 0; i < numShelters; i++) {
      const angle = (i / numShelters) * 2 * Math.PI;
      const distance = zone.area.radius + 10; // 10 units outside the zone

      shelters.push({
        x: zone.area.x + Math.cos(angle) * distance,
        y: zone.area.y + Math.sin(angle) * distance
      });
    }

    return shelters;
  }

  private getEvacuationZoneColor(status: string, progress: number): string {
    if (status === 'completed') return '#00FF00';
    if (status === 'active') {
      const intensity = Math.floor(progress * 255);
      return `rgb(255, ${intensity}, 0)`; // Orange to yellow gradient
    }
    return '#FFFF00'; // Yellow for planned
  }

  private generateImpactMap(): IntensityMapData[][] {
    const map: IntensityMapData[][] = [];

    for (let x = 0; x < this._gridSize.width; x++) {
      map[x] = [];
      for (let y = 0; y < this._gridSize.height; y++) {
        const intensity = this._disaster.getIntensityAtPoint(x, y);
        const color = this.getIntensityColor(intensity, this._disaster.type);
        const alpha = Math.min(0.8, intensity / this._disaster.config.intensity);

        map[x][y] = {
          x,
          y,
          intensity,
          disasterType: this._disaster.type,
          color,
          alpha
        };
      }
    }

    return map;
  }

  private getIntensityColor(intensity: number, disasterType: DisasterType): string {
    if (intensity === 0) return '#FFFFFF';

    const colors: Record<DisasterType, string[]> = {
      earthquake: ['#8B4513', '#CD853F', '#F4A460'], // Brown gradient
      flood: ['#4169E1', '#1E90FF', '#87CEEB'], // Blue gradient
      fire: ['#FF4500', '#FF6347', '#FFA500'], // Red-orange gradient
      hurricane: ['#2F4F4F', '#708090', '#A9A9A9'], // Gray gradient
      tornado: ['#696969', '#A9A9A9', '#D3D3D3'], // Gray gradient
      volcanic: ['#8B0000', '#DC143C', '#FF4500'], // Dark red gradient
      tsunami: ['#191970', '#4169E1', '#87CEFA'], // Dark blue gradient
      blizzard: ['#E6E6FA', '#F0F8FF', '#FFFFFF'], // White gradient
      drought: ['#DEB887', '#D2B48C', '#F5DEB3'], // Tan gradient
      pandemic: ['#8A2BE2', '#9932CC', '#BA55D3'], // Purple gradient
      'industrial-accident': ['#FF8C00', '#FFA500', '#FFD700'], // Orange gradient
      'cyber-attack': ['#8B008B', '#9400D3', '#9932CC'], // Magenta gradient
      'power-outage': ['#2F2F2F', '#4F4F4F', '#696969'] // Dark gray gradient
    };

    const colorGradient = colors[disasterType] || ['#808080', '#A0A0A0', '#C0C0C0'];
    const maxIntensity = this._disaster.config.intensity;
    const ratio = intensity / maxIntensity;

    if (ratio < 0.33) return colorGradient[0];
    if (ratio < 0.67) return colorGradient[1];
    return colorGradient[2];
  }

  private generateHazardZones(): HazardZoneData[] {
    const zones: HazardZoneData[] = [];
    const disasterPos = this._disaster.position;
    const maxRadius = this._disaster.config.affectedRadius;

    // Danger zone (immediate area)
    zones.push({
      id: 'danger-zone',
      type: 'danger',
      area: { x: disasterPos.x, y: disasterPos.y, radius: maxRadius * 0.4 },
      level: 5,
      color: '#FF0000',
      message: 'IMMEDIATE DANGER - EVACUATE NOW'
    });

    // Warning zone
    zones.push({
      id: 'warning-zone',
      type: 'warning',
      area: { x: disasterPos.x, y: disasterPos.y, radius: maxRadius * 0.7 },
      level: 3,
      color: '#FFA500',
      message: 'WARNING - PREPARE FOR EVACUATION'
    });

    // Watch zone
    zones.push({
      id: 'watch-zone',
      type: 'watch',
      area: { x: disasterPos.x, y: disasterPos.y, radius: maxRadius },
      level: 2,
      color: '#FFFF00',
      message: 'WATCH - MONITOR SITUATION'
    });

    // Safe zone
    zones.push({
      id: 'safe-zone',
      type: 'safe',
      area: { x: disasterPos.x, y: disasterPos.y, radius: maxRadius * 1.5 },
      level: 1,
      color: '#00FF00',
      message: 'SAFE ZONE - EVACUATION ASSEMBLY AREA'
    });

    return zones;
  }

  private generateEvacuationRoutes(): RouteData[] {
    const routes: RouteData[] = [];

    // Generate routes from evacuation zones
    this._emergencyResponse.evacuationZones.forEach((zone, index) => {
      zone.evacuationRoutes.forEach((route, routeIndex) => {
        routes.push({
          id: `evacuation-${zone.id}-${routeIndex}`,
          type: 'evacuation',
          path: route,
          status: 'open',
          capacity: 1000,
          currentLoad: Math.floor(zone.evacuatedPopulation / zone.evacuationRoutes.length),
          color: '#FFD700',
          width: 3
        });
      });
    });

    // Generate emergency access routes
    const commandCenter = { x: 0, y: 0 }; // Would get from emergency response
    const disasterPos = this._disaster.position;

    // Direct route to disaster area
    routes.push({
      id: 'emergency-access-main',
      type: 'emergency-access',
      path: [
        commandCenter,
        { x: (commandCenter.x + disasterPos.x) / 2, y: (commandCenter.y + disasterPos.y) / 2 },
        disasterPos
      ],
      status: 'open',
      capacity: 100,
      currentLoad: this._emergencyResponse.resources.length,
      color: '#FF4444',
      width: 4
    });

    return routes;
  }

  private generateCommunicationNetworks(): CommunicationVisualizationData[] {
    // This would integrate with the emergency response communication systems
    const networks: CommunicationVisualizationData[] = [];

    // For now, generate basic command center communications
    const commandCenter = { x: 0, y: 0 };

    networks.push({
      id: 'command-communications',
      type: 'radio',
      position: commandCenter,
      coverage: [{ x: commandCenter.x, y: commandCenter.y, radius: 20 }],
      isOperational: true,
      reliability: 0.95,
      load: 0.3,
      color: '#00FFFF'
    });

    return networks;
  }

  exportToUnity(): string {
    const visualizationData = this.generateVisualizationData();

    const unityData = {
      currentTime: Date.now(),
      timestamp: Date.now(),
      disaster: visualizationData.disaster,
      emergencyResponse: visualizationData.emergencyResponse,
      visualization: {
        impactMap: visualizationData.impactMap,
        hazardZones: visualizationData.hazardZones,
        evacuationRoutes: visualizationData.evacuationRoutes,
        communicationNetworks: visualizationData.communicationNetworks
      },
      gameplayData: {
        playerActions: this.getAvailablePlayerActions(),
        objectives: this.getCurrentObjectives(),
        challenges: this.getCurrentChallenges(),
        score: this.calculateDisasterScore()
      },
      ui: {
        alerts: this.generateAlerts(),
        statistics: this.generateStatistics(),
        recommendations: this.generateRecommendations()
      }
    };

    return JSON.stringify(unityData, null, 2);
  }

  private getAvailablePlayerActions(): string[] {
    const actions = [];

    if (this._disaster.phase === 'warning') {
      actions.push('issue-evacuation-order', 'deploy-emergency-resources', 'setup-shelters');
    } else if (this._disaster.phase === 'impact') {
      actions.push('coordinate-rescue', 'fight-fire', 'provide-medical-aid');
    } else if (this._disaster.phase === 'recovery') {
      actions.push('assess-damage', 'restore-infrastructure', 'provide-assistance');
    }

    return actions;
  }

  private getCurrentObjectives(): string[] {
    const objectives = [];
    const phase = this._disaster.phase;

    if (phase === 'prediction' || phase === 'warning') {
      objectives.push('Minimize casualties through early warning');
      objectives.push('Coordinate evacuation of high-risk areas');
      objectives.push('Position emergency resources strategically');
    } else if (phase === 'impact') {
      objectives.push('Conduct search and rescue operations');
      objectives.push('Provide emergency medical care');
      objectives.push('Maintain critical infrastructure');
    } else if (phase === 'recovery') {
      objectives.push('Assess and document damage');
      objectives.push('Restore essential services');
      objectives.push('Support affected population');
    }

    return objectives;
  }

  private getCurrentChallenges(): string[] {
    const challenges = [];
    const impact = this._disaster.totalImpact;

    if (impact.infrastructureDisruption > 0.5) {
      challenges.push('Widespread infrastructure damage hampering response');
    }

    if (this._emergencyResponse.getResourceUtilization() > 0.8) {
      challenges.push('Limited emergency resources available');
    }

    if (this._disaster.currentIntensity > this._disaster.config.intensity * 0.8) {
      challenges.push('Extreme weather conditions affecting operations');
    }

    return challenges;
  }

  private calculateDisasterScore(): number {
    const effectiveness = this._emergencyResponse.getResponseEffectiveness();
    const evacuationScore = this.calculateEvacuationScore();
    const responseTime = this.calculateResponseTimeScore();

    return Math.round((effectiveness * 0.5 + evacuationScore * 0.3 + responseTime * 0.2) * 1000);
  }

  private calculateEvacuationScore(): number {
    const zones = this._emergencyResponse.evacuationZones;
    if (zones.length === 0) return 0;

    const totalProgress = zones.reduce((sum, zone) => sum + zone.evacuationProgress, 0);
    return totalProgress / zones.length;
  }

  private calculateResponseTimeScore(): number {
    // Score based on how quickly response was initiated
    const responseActions = this._emergencyResponse.actions.filter(a => a.status !== 'planned');
    if (responseActions.length === 0) return 0;

    // Simplified scoring - in real implementation would consider disaster start time
    return Math.min(1, responseActions.length / 5);
  }

  private generateAlerts(): string[] {
    const alerts = [];
    const disaster = this._disaster;

    if (disaster.phase === 'warning') {
      alerts.push(`${disaster.type.toUpperCase()} WARNING: Impact expected in ${this.formatTime(12)} hours`);
    } else if (disaster.phase === 'impact') {
      alerts.push(`${disaster.type.toUpperCase()} IN PROGRESS: Current intensity ${disaster.currentIntensity.toFixed(1)}`);
    }

    // Resource alerts
    const lowResources = this._emergencyResponse.resources.filter(r => r.efficiency < 0.5);
    if (lowResources.length > 0) {
      alerts.push(`${lowResources.length} emergency resources need maintenance`);
    }

    return alerts;
  }

  private generateStatistics(): Record<string, number | string> {
    const impact = this._disaster.totalImpact;
    const response = this._emergencyResponse;

    return {
      'People Affected': Math.round(impact.populationAffected),
      'Economic Loss': `$${(impact.economicLoss / 1000000).toFixed(1)}M`,
      'Response Cost': `$${(response.totalCost / 1000000).toFixed(1)}M`,
      'Infrastructure Damage': `${(impact.infrastructureDisruption * 100).toFixed(1)}%`,
      'Response Effectiveness': `${(response.getResponseEffectiveness() * 100).toFixed(1)}%`,
      'Active Resources': response.resources.filter(r => r.isActive).length,
      'Completed Actions': response.actions.filter(a => a.status === 'completed').length
    };
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    const effectiveness = this._emergencyResponse.getResponseEffectiveness();

    if (effectiveness < 0.5) {
      recommendations.push('Consider escalating response level for additional resources');
    }

    if (this._disaster.phase === 'warning') {
      recommendations.push('Issue evacuation orders for high-risk areas');
      recommendations.push('Pre-position emergency resources near likely impact zones');
    }

    const zones = this._emergencyResponse.evacuationZones;
    const incompleteEvacuations = zones.filter(z => z.evacuationProgress < 1);
    if (incompleteEvacuations.length > 0) {
      recommendations.push(`Prioritize evacuation completion in ${incompleteEvacuations.length} remaining zones`);
    }

    return recommendations;
  }

  private formatTime(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    return `${Math.round(hours / 24)} days`;
  }
}