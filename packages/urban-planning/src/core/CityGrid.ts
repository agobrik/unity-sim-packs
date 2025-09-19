export interface Position {
  x: number;
  y: number;
}

export interface CityCell {
  position: Position;
  zoneType: ZoneType;
  buildingType: BuildingType | null;
  population: number;
  commercialValue: number;
  industrialValue: number;
  infrastructure: InfrastructureLevel;
  pollution: number;
  happiness: number;
  traffic: number;
}

export enum ZoneType {
  UNZONED = 'unzoned',
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  MIXED_USE = 'mixed_use',
  GREEN_SPACE = 'green_space',
  SPECIAL = 'special'
}

export enum BuildingType {
  HOUSE = 'house',
  APARTMENT = 'apartment',
  OFFICE = 'office',
  SHOP = 'shop',
  FACTORY = 'factory',
  PARK = 'park',
  SCHOOL = 'school',
  HOSPITAL = 'hospital'
}

export interface InfrastructureLevel {
  roads: number; // 0-1
  water: number; // 0-1
  power: number; // 0-1
  internet: number; // 0-1
  publicTransport: number; // 0-1
}

export class CityGrid {
  public readonly width: number;
  public readonly height: number;
  private cells: CityCell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.initializeGrid();
  }

  private initializeGrid(): void {
    for (let x = 0; x < this.width; x++) {
      this.cells[x] = [];
      for (let y = 0; y < this.height; y++) {
        this.cells[x][y] = {
          position: { x, y },
          zoneType: ZoneType.UNZONED,
          buildingType: null,
          population: 0,
          commercialValue: 0,
          industrialValue: 0,
          infrastructure: {
            roads: 0,
            water: 0,
            power: 0,
            internet: 0,
            publicTransport: 0
          },
          pollution: 0,
          happiness: 0.5,
          traffic: 0
        };
      }
    }
  }

  getCell(x: number, y: number): CityCell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.cells[x][y];
  }

  setZone(x: number, y: number, zoneType: ZoneType): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    cell.zoneType = zoneType;
    return true;
  }

  buildStructure(x: number, y: number, buildingType: BuildingType): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !this.canBuild(cell, buildingType)) return false;

    cell.buildingType = buildingType;
    this.updateCellProperties(cell, buildingType);
    return true;
  }

  private canBuild(cell: CityCell, buildingType: BuildingType): boolean {
    if (cell.buildingType !== null) return false;

    switch (buildingType) {
      case BuildingType.HOUSE:
      case BuildingType.APARTMENT:
        return cell.zoneType === ZoneType.RESIDENTIAL || cell.zoneType === ZoneType.MIXED_USE;
      case BuildingType.OFFICE:
      case BuildingType.SHOP:
        return cell.zoneType === ZoneType.COMMERCIAL || cell.zoneType === ZoneType.MIXED_USE;
      case BuildingType.FACTORY:
        return cell.zoneType === ZoneType.INDUSTRIAL;
      case BuildingType.PARK:
        return cell.zoneType === ZoneType.GREEN_SPACE;
      default:
        return cell.zoneType === ZoneType.SPECIAL;
    }
  }

  private updateCellProperties(cell: CityCell, buildingType: BuildingType): void {
    switch (buildingType) {
      case BuildingType.HOUSE:
        cell.population = Math.floor(Math.random() * 4) + 2;
        break;
      case BuildingType.APARTMENT:
        cell.population = Math.floor(Math.random() * 20) + 10;
        break;
      case BuildingType.OFFICE:
        cell.commercialValue = Math.random() * 0.8 + 0.2;
        break;
      case BuildingType.SHOP:
        cell.commercialValue = Math.random() * 0.6 + 0.4;
        break;
      case BuildingType.FACTORY:
        cell.industrialValue = Math.random() * 0.9 + 0.1;
        cell.pollution += Math.random() * 0.3 + 0.1;
        break;
      case BuildingType.PARK:
        cell.happiness += 0.2;
        cell.pollution = Math.max(0, cell.pollution - 0.1);
        break;
    }
  }

  upgradeInfrastructure(x: number, y: number, type: keyof InfrastructureLevel, level: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;

    cell.infrastructure[type] = Math.min(1, Math.max(0, level));
    this.updateHappiness(cell);
    return true;
  }

  private updateHappiness(cell: CityCell): void {
    const infraScore = Object.values(cell.infrastructure).reduce((sum, val) => sum + val, 0) / 5;
    const pollutionPenalty = cell.pollution * 0.3;
    const trafficPenalty = cell.traffic * 0.2;

    cell.happiness = Math.min(1, Math.max(0, infraScore - pollutionPenalty - trafficPenalty));
  }

  getNeighbors(x: number, y: number, radius: number = 1): CityCell[] {
    const neighbors: CityCell[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (dx === 0 && dy === 0) continue;
        const cell = this.getCell(x + dx, y + dy);
        if (cell) neighbors.push(cell);
      }
    }

    return neighbors;
  }

  getAllCells(): CityCell[][] {
    return this.cells.map(row => [...row]);
  }

  getCellsByZone(zoneType: ZoneType): CityCell[] {
    const result: CityCell[] = [];
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.cells[x][y].zoneType === zoneType) {
          result.push(this.cells[x][y]);
        }
      }
    }
    return result;
  }

  getTotalPopulation(): number {
    let total = 0;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        total += this.cells[x][y].population;
      }
    }
    return total;
  }

  getAverageHappiness(): number {
    let total = 0;
    let count = 0;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.cells[x][y].population > 0) {
          total += this.cells[x][y].happiness;
          count++;
        }
      }
    }
    return count > 0 ? total / count : 0.5;
  }
}