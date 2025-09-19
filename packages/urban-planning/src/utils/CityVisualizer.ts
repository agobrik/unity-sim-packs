import { CityGrid, ZoneType, BuildingType, CityCell } from '../core/CityGrid';
import { CityMetrics } from './CityAnalytics';

export interface VisualizationLayer {
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number;
  colorScheme: ColorScheme;
  data: VisualizationData[];
}

export enum LayerType {
  ZONES = 'zones',
  BUILDINGS = 'buildings',
  POPULATION = 'population',
  TRAFFIC = 'traffic',
  POLLUTION = 'pollution',
  HAPPINESS = 'happiness',
  INFRASTRUCTURE = 'infrastructure',
  HEATMAP = 'heatmap'
}

export interface ColorScheme {
  [key: string]: string;
}

export interface VisualizationData {
  position: { x: number; y: number };
  value: number;
  color: string;
  label?: string;
  metadata?: Record<string, any>;
}

export interface UnityVisualizationData {
  gridWidth: number;
  gridHeight: number;
  layers: {
    name: string;
    type: string;
    cells: Array<{
      x: number;
      y: number;
      value: number;
      color: string;
      metadata: Record<string, any>;
    }>;
  }[];
  legend: {
    [layerName: string]: {
      title: string;
      colorMap: { value: number; color: string; label: string }[];
    };
  };
}

export class CityVisualizer {
  private cityGrid: CityGrid;
  private layers: Map<LayerType, VisualizationLayer>;
  private colorSchemes: Map<LayerType, ColorScheme>;

  constructor(cityGrid: CityGrid) {
    this.cityGrid = cityGrid;
    this.layers = new Map();
    this.colorSchemes = new Map();
    this.initializeColorSchemes();
    this.initializeLayers();
  }

  private initializeColorSchemes(): void {
    this.colorSchemes.set(LayerType.ZONES, {
      [ZoneType.UNZONED]: '#808080',
      [ZoneType.RESIDENTIAL]: '#90EE90',
      [ZoneType.COMMERCIAL]: '#87CEEB',
      [ZoneType.INDUSTRIAL]: '#DDA0DD',
      [ZoneType.MIXED_USE]: '#F0E68C',
      [ZoneType.GREEN_SPACE]: '#228B22',
      [ZoneType.SPECIAL]: '#FFB6C1'
    });

    this.colorSchemes.set(LayerType.BUILDINGS, {
      [BuildingType.HOUSE]: '#8FBC8F',
      [BuildingType.APARTMENT]: '#32CD32',
      [BuildingType.OFFICE]: '#4682B4',
      [BuildingType.SHOP]: '#20B2AA',
      [BuildingType.FACTORY]: '#9370DB',
      [BuildingType.PARK]: '#228B22',
      [BuildingType.SCHOOL]: '#FFD700',
      [BuildingType.HOSPITAL]: '#DC143C'
    });

    this.colorSchemes.set(LayerType.POPULATION, {
      'low': '#FFFFE0',
      'medium': '#FFD700',
      'high': '#FF8C00',
      'very_high': '#FF4500'
    });

    this.colorSchemes.set(LayerType.TRAFFIC, {
      'none': '#90EE90',
      'light': '#FFFF00',
      'moderate': '#FFA500',
      'heavy': '#FF4500',
      'severe': '#FF0000'
    });

    this.colorSchemes.set(LayerType.POLLUTION, {
      'clean': '#90EE90',
      'moderate': '#FFFF00',
      'unhealthy': '#FFA500',
      'hazardous': '#FF0000'
    });

    this.colorSchemes.set(LayerType.HAPPINESS, {
      'very_unhappy': '#FF0000',
      'unhappy': '#FF4500',
      'neutral': '#FFFF00',
      'happy': '#9ACD32',
      'very_happy': '#00FF00'
    });
  }

  private initializeLayers(): void {
    Object.values(LayerType).forEach(layerType => {
      this.layers.set(layerType, {
        name: this.getLayerDisplayName(layerType),
        type: layerType,
        visible: false,
        opacity: 1.0,
        colorScheme: this.colorSchemes.get(layerType) || {},
        data: []
      });
    });

    // Set default visible layers
    this.setLayerVisible(LayerType.ZONES, true);
    this.setLayerVisible(LayerType.BUILDINGS, true);
  }

  private getLayerDisplayName(layerType: LayerType): string {
    const names = {
      [LayerType.ZONES]: 'Zoning',
      [LayerType.BUILDINGS]: 'Buildings',
      [LayerType.POPULATION]: 'Population Density',
      [LayerType.TRAFFIC]: 'Traffic Flow',
      [LayerType.POLLUTION]: 'Air Quality',
      [LayerType.HAPPINESS]: 'Citizen Happiness',
      [LayerType.INFRASTRUCTURE]: 'Infrastructure',
      [LayerType.HEATMAP]: 'Heat Map'
    };
    return names[layerType];
  }

  updateLayer(layerType: LayerType): void {
    const layer = this.layers.get(layerType);
    if (!layer) return;

    layer.data = [];

    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (!cell) continue;

        const visualData = this.createVisualizationData(cell, layerType);
        if (visualData) {
          layer.data.push(visualData);
        }
      }
    }
  }

  private createVisualizationData(cell: CityCell, layerType: LayerType): VisualizationData | null {
    const position = { x: cell.position.x, y: cell.position.y };

    switch (layerType) {
      case LayerType.ZONES:
        return {
          position,
          value: this.getZoneValue(cell.zoneType),
          color: this.colorSchemes.get(LayerType.ZONES)![cell.zoneType],
          label: cell.zoneType,
          metadata: { zoneType: cell.zoneType }
        };

      case LayerType.BUILDINGS:
        if (!cell.buildingType) return null;
        return {
          position,
          value: this.getBuildingValue(cell.buildingType),
          color: this.colorSchemes.get(LayerType.BUILDINGS)![cell.buildingType],
          label: cell.buildingType,
          metadata: { buildingType: cell.buildingType, population: cell.population }
        };

      case LayerType.POPULATION:
        if (cell.population === 0) return null;
        const popCategory = this.getPopulationCategory(cell.population);
        return {
          position,
          value: cell.population,
          color: this.colorSchemes.get(LayerType.POPULATION)![popCategory],
          label: `${cell.population} people`,
          metadata: { population: cell.population, category: popCategory }
        };

      case LayerType.TRAFFIC:
        const trafficCategory = this.getTrafficCategory(cell.traffic);
        return {
          position,
          value: cell.traffic,
          color: this.colorSchemes.get(LayerType.TRAFFIC)![trafficCategory],
          label: `Traffic: ${(cell.traffic * 100).toFixed(1)}%`,
          metadata: { traffic: cell.traffic, category: trafficCategory }
        };

      case LayerType.POLLUTION:
        const pollutionCategory = this.getPollutionCategory(cell.pollution);
        return {
          position,
          value: cell.pollution,
          color: this.colorSchemes.get(LayerType.POLLUTION)![pollutionCategory],
          label: `Pollution: ${(cell.pollution * 100).toFixed(1)}%`,
          metadata: { pollution: cell.pollution, category: pollutionCategory }
        };

      case LayerType.HAPPINESS:
        if (cell.population === 0) return null;
        const happinessCategory = this.getHappinessCategory(cell.happiness);
        return {
          position,
          value: cell.happiness,
          color: this.colorSchemes.get(LayerType.HAPPINESS)![happinessCategory],
          label: `Happiness: ${(cell.happiness * 100).toFixed(1)}%`,
          metadata: { happiness: cell.happiness, category: happinessCategory }
        };

      case LayerType.INFRASTRUCTURE:
        const infraScore = this.calculateInfrastructureScore(cell);
        return {
          position,
          value: infraScore,
          color: this.interpolateColor('#FF0000', '#00FF00', infraScore),
          label: `Infrastructure: ${(infraScore * 100).toFixed(1)}%`,
          metadata: { infrastructure: cell.infrastructure, score: infraScore }
        };

      default:
        return null;
    }
  }

  private getZoneValue(zoneType: ZoneType): number {
    const values = {
      [ZoneType.UNZONED]: 0,
      [ZoneType.RESIDENTIAL]: 1,
      [ZoneType.COMMERCIAL]: 2,
      [ZoneType.INDUSTRIAL]: 3,
      [ZoneType.MIXED_USE]: 4,
      [ZoneType.GREEN_SPACE]: 5,
      [ZoneType.SPECIAL]: 6
    };
    return values[zoneType];
  }

  private getBuildingValue(buildingType: BuildingType): number {
    const values = {
      [BuildingType.HOUSE]: 1,
      [BuildingType.APARTMENT]: 2,
      [BuildingType.OFFICE]: 3,
      [BuildingType.SHOP]: 4,
      [BuildingType.FACTORY]: 5,
      [BuildingType.PARK]: 6,
      [BuildingType.SCHOOL]: 7,
      [BuildingType.HOSPITAL]: 8
    };
    return values[buildingType];
  }

  private getPopulationCategory(population: number): string {
    if (population === 0) return 'none';
    if (population <= 5) return 'low';
    if (population <= 15) return 'medium';
    if (population <= 30) return 'high';
    return 'very_high';
  }

  private getTrafficCategory(traffic: number): string {
    if (traffic <= 0.2) return 'none';
    if (traffic <= 0.4) return 'light';
    if (traffic <= 0.6) return 'moderate';
    if (traffic <= 0.8) return 'heavy';
    return 'severe';
  }

  private getPollutionCategory(pollution: number): string {
    if (pollution <= 0.25) return 'clean';
    if (pollution <= 0.5) return 'moderate';
    if (pollution <= 0.75) return 'unhealthy';
    return 'hazardous';
  }

  private getHappinessCategory(happiness: number): string {
    if (happiness <= 0.2) return 'very_unhappy';
    if (happiness <= 0.4) return 'unhappy';
    if (happiness <= 0.6) return 'neutral';
    if (happiness <= 0.8) return 'happy';
    return 'very_happy';
  }

  private calculateInfrastructureScore(cell: CityCell): number {
    const values = Object.values(cell.infrastructure);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    // Simple color interpolation between two hex colors
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  createHeatMap(metric: keyof CityCell | 'infrastructure'): void {
    const heatmapLayer = this.layers.get(LayerType.HEATMAP);
    if (!heatmapLayer) return;

    heatmapLayer.data = [];
    let minValue = Infinity;
    let maxValue = -Infinity;
    const values: Array<{ position: { x: number; y: number }; value: number }> = [];

    // Collect values
    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (!cell) continue;

        let value: number;
        if (metric === 'infrastructure') {
          value = this.calculateInfrastructureScore(cell);
        } else {
          value = cell[metric] as number;
        }

        values.push({ position: { x, y }, value });
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }

    // Normalize and create visualization data
    const range = maxValue - minValue;
    for (const item of values) {
      const normalizedValue = range > 0 ? (item.value - minValue) / range : 0;
      heatmapLayer.data.push({
        position: item.position,
        value: item.value,
        color: this.interpolateColor('#0000FF', '#FF0000', normalizedValue),
        label: `${metric}: ${item.value.toFixed(2)}`,
        metadata: { metric, normalizedValue }
      });
    }
  }

  setLayerVisible(layerType: LayerType, visible: boolean): void {
    const layer = this.layers.get(layerType);
    if (layer) {
      layer.visible = visible;
      if (visible) {
        this.updateLayer(layerType);
      }
    }
  }

  setLayerOpacity(layerType: LayerType, opacity: number): void {
    const layer = this.layers.get(layerType);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  getLayer(layerType: LayerType): VisualizationLayer | undefined {
    return this.layers.get(layerType);
  }

  getAllLayers(): VisualizationLayer[] {
    return Array.from(this.layers.values());
  }

  getVisibleLayers(): VisualizationLayer[] {
    return Array.from(this.layers.values()).filter(layer => layer.visible);
  }

  exportToUnity(): string {
    const unityData: UnityVisualizationData = {
      gridWidth: this.cityGrid.width,
      gridHeight: this.cityGrid.height,
      layers: [],
      legend: {}
    };

    for (const layer of this.getVisibleLayers()) {
      unityData.layers.push({
        name: layer.name,
        type: layer.type,
        cells: layer.data.map(data => ({
          x: data.position.x,
          y: data.position.y,
          value: data.value,
          color: data.color,
          metadata: data.metadata || {}
        }))
      });

      // Create legend for this layer
      unityData.legend[layer.name] = this.createLegend(layer);
    }

    return JSON.stringify(unityData, null, 2);
  }

  private createLegend(layer: VisualizationLayer): { title: string; colorMap: Array<{ value: number; color: string; label: string }> } {
    const colorMap: Array<{ value: number; color: string; label: string }> = [];

    switch (layer.type) {
      case LayerType.ZONES:
        Object.entries(layer.colorScheme).forEach(([key, color], index) => {
          colorMap.push({ value: index, color, label: key });
        });
        break;

      case LayerType.BUILDINGS:
        Object.entries(layer.colorScheme).forEach(([key, color], index) => {
          colorMap.push({ value: index, color, label: key });
        });
        break;

      case LayerType.POPULATION:
        colorMap.push(
          { value: 0, color: layer.colorScheme['low'], label: '1-5 people' },
          { value: 1, color: layer.colorScheme['medium'], label: '6-15 people' },
          { value: 2, color: layer.colorScheme['high'], label: '16-30 people' },
          { value: 3, color: layer.colorScheme['very_high'], label: '30+ people' }
        );
        break;

      case LayerType.TRAFFIC:
        colorMap.push(
          { value: 0, color: layer.colorScheme['none'], label: 'No traffic' },
          { value: 0.3, color: layer.colorScheme['light'], label: 'Light traffic' },
          { value: 0.5, color: layer.colorScheme['moderate'], label: 'Moderate traffic' },
          { value: 0.7, color: layer.colorScheme['heavy'], label: 'Heavy traffic' },
          { value: 0.9, color: layer.colorScheme['severe'], label: 'Severe congestion' }
        );
        break;

      default:
        // For other layers, create a simple gradient legend
        colorMap.push(
          { value: 0, color: '#FF0000', label: 'Low' },
          { value: 0.5, color: '#FFFF00', label: 'Medium' },
          { value: 1, color: '#00FF00', label: 'High' }
        );
    }

    return {
      title: layer.name,
      colorMap
    };
  }

  updateAllLayers(): void {
    for (const layerType of this.layers.keys()) {
      if (this.layers.get(layerType)?.visible) {
        this.updateLayer(layerType);
      }
    }
  }

  exportVisualizationData(): string {
    const data = {
      layers: Array.from(this.layers.entries()),
      colorSchemes: Array.from(this.colorSchemes.entries())
    };
    return JSON.stringify(data, null, 2);
  }
}