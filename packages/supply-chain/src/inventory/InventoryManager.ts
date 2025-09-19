/**
 * Inventory Manager - Core inventory management system
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import { TimeStamp, ResourceId, InventoryLevel, StockStatus } from '../core/types';

export interface InventoryItem {
  resourceId: ResourceId;
  quantity: number;
  reservedQuantity: number;
  location: string;
  lastUpdated: TimeStamp;
}

export class InventoryManager extends EventEmitter {
  private inventory: Map<string, InventoryItem> = new Map();
  private eventBus: EventBus;
  private initialized = false;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('inventory-initialized');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.inventory.clear();
  }

  async update(currentTime: TimeStamp): Promise<void> {
    // Update inventory levels and check alerts
    for (const item of this.inventory.values()) {
      if (item.quantity < 10) { // Low stock threshold
        this.emit('low-stock-alert', { resourceId: item.resourceId, quantity: item.quantity });
      }
    }
  }

  addStock(resourceId: ResourceId, quantity: number, location: string): void {
    const key = `${resourceId}-${location}`;
    const existing = this.inventory.get(key);

    if (existing) {
      existing.quantity += quantity;
      existing.lastUpdated = { gameTime: 0, realTime: Date.now() };
    } else {
      this.inventory.set(key, {
        resourceId,
        quantity,
        reservedQuantity: 0,
        location,
        lastUpdated: { gameTime: 0, realTime: Date.now() }
      });
    }

    this.emit('stock-added', { resourceId, quantity, location });
  }

  consumeStock(resourceId: ResourceId, quantity: number, location: string): boolean {
    const key = `${resourceId}-${location}`;
    const item = this.inventory.get(key);

    if (!item || item.quantity < quantity) {
      return false;
    }

    item.quantity -= quantity;
    item.lastUpdated = { gameTime: 0, realTime: Date.now() };

    this.emit('stock-consumed', { resourceId, quantity, location });
    return true;
  }

  getStockLevel(resourceId: ResourceId, location?: string): number {
    if (location) {
      const key = `${resourceId}-${location}`;
      return this.inventory.get(key)?.quantity || 0;
    }

    let total = 0;
    for (const [key, item] of this.inventory) {
      if (item.resourceId === resourceId) {
        total += item.quantity;
      }
    }
    return total;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.inventory.clear();
    this.removeAllListeners();
  }
}