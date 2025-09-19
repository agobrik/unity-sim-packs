export class PriorityQueue<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compareFunction: (a: T, b: T) => number) {
    this.compare = compareFunction;
  }

  public enqueue(item: T): void {
    this.items.push(item);
    this.heapifyUp(this.items.length - 1);
  }

  public dequeue(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    if (this.items.length === 1) {
      return this.items.pop();
    }

    const root = this.items[0];
    this.items[0] = this.items.pop()!;
    this.heapifyDown(0);

    return root;
  }

  public peek(): T | undefined {
    return this.items.length > 0 ? this.items[0] : undefined;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public size(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items = [];
  }

  public toArray(): T[] {
    return [...this.items];
  }

  private heapifyUp(index: number): void {
    if (index === 0) return;

    const parentIndex = Math.floor((index - 1) / 2);

    if (this.compare(this.items[index], this.items[parentIndex]) < 0) {
      this.swap(index, parentIndex);
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftChildIndex = 2 * index + 1;
    const rightChildIndex = 2 * index + 2;
    let smallestIndex = index;

    if (
      leftChildIndex < this.items.length &&
      this.compare(this.items[leftChildIndex], this.items[smallestIndex]) < 0
    ) {
      smallestIndex = leftChildIndex;
    }

    if (
      rightChildIndex < this.items.length &&
      this.compare(this.items[rightChildIndex], this.items[smallestIndex]) < 0
    ) {
      smallestIndex = rightChildIndex;
    }

    if (smallestIndex !== index) {
      this.swap(index, smallestIndex);
      this.heapifyDown(smallestIndex);
    }
  }

  private swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }
}

export class IndexedPriorityQueue<T> {
  private items: Array<{ item: T; priority: number; index: number }> = [];
  private indexMap: Map<number, number> = new Map(); // maps external index to internal position

  public insert(item: T, priority: number, index: number): void {
    const entry = { item, priority, index };
    this.items.push(entry);
    const position = this.items.length - 1;
    this.indexMap.set(index, position);
    this.heapifyUp(position);
  }

  public extractMin(): { item: T; priority: number; index: number } | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    if (this.items.length === 1) {
      const entry = this.items.pop()!;
      this.indexMap.delete(entry.index);
      return entry;
    }

    const root = this.items[0];
    const last = this.items.pop()!;

    this.items[0] = last;
    this.indexMap.set(last.index, 0);
    this.indexMap.delete(root.index);

    this.heapifyDown(0);

    return root;
  }

  public decreaseKey(index: number, newPriority: number): boolean {
    const position = this.indexMap.get(index);
    if (position === undefined) {
      return false;
    }

    const entry = this.items[position];
    if (newPriority >= entry.priority) {
      return false; // New priority is not smaller
    }

    entry.priority = newPriority;
    this.heapifyUp(position);
    return true;
  }

  public contains(index: number): boolean {
    return this.indexMap.has(index);
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public size(): number {
    return this.items.length;
  }

  public clear(): void {
    this.items = [];
    this.indexMap.clear();
  }

  private heapifyUp(position: number): void {
    if (position === 0) return;

    const parentPosition = Math.floor((position - 1) / 2);

    if (this.items[position].priority < this.items[parentPosition].priority) {
      this.swap(position, parentPosition);
      this.heapifyUp(parentPosition);
    }
  }

  private heapifyDown(position: number): void {
    const leftChild = 2 * position + 1;
    const rightChild = 2 * position + 2;
    let smallest = position;

    if (
      leftChild < this.items.length &&
      this.items[leftChild].priority < this.items[smallest].priority
    ) {
      smallest = leftChild;
    }

    if (
      rightChild < this.items.length &&
      this.items[rightChild].priority < this.items[smallest].priority
    ) {
      smallest = rightChild;
    }

    if (smallest !== position) {
      this.swap(position, smallest);
      this.heapifyDown(smallest);
    }
  }

  private swap(i: number, j: number): void {
    // Update index map
    this.indexMap.set(this.items[i].index, j);
    this.indexMap.set(this.items[j].index, i);

    // Swap items
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }
}

export class BinaryHeap<T> {
  private heap: T[] = [];
  private compareFn: (a: T, b: T) => number;

  constructor(compareFunction: (a: T, b: T) => number) {
    this.compareFn = compareFunction;
  }

  public insert(value: T): void {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }

  public extract(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return max;
  }

  public peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0] : undefined;
  }

  public size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public toArray(): T[] {
    return [...this.heap];
  }

  public clear(): void {
    this.heap = [];
  }

  private bubbleUp(index: number): void {
    if (index === 0) return;

    const parentIndex = Math.floor((index - 1) / 2);
    if (this.compareFn(this.heap[index], this.heap[parentIndex]) < 0) {
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      this.bubbleUp(parentIndex);
    }
  }

  private bubbleDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let targetIndex = index;

    if (
      leftChild < this.heap.length &&
      this.compareFn(this.heap[leftChild], this.heap[targetIndex]) < 0
    ) {
      targetIndex = leftChild;
    }

    if (
      rightChild < this.heap.length &&
      this.compareFn(this.heap[rightChild], this.heap[targetIndex]) < 0
    ) {
      targetIndex = rightChild;
    }

    if (targetIndex !== index) {
      [this.heap[index], this.heap[targetIndex]] = [this.heap[targetIndex], this.heap[index]];
      this.bubbleDown(targetIndex);
    }
  }
}