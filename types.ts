export interface AlchemyElement {
  id: string;
  name: string;
  emoji: string;
  isNew?: boolean; // To highlight newly discovered items
}

export interface CombinationResult {
  name: string;
  emoji: string;
}

export interface DragItem {
  type: 'ELEMENT';
  element: AlchemyElement;
  source: 'INVENTORY' | 'WORKBENCH';
  instanceId?: string; // For workbench items to differentiate multiple copies
}

export interface WorkbenchItem extends AlchemyElement {
  x: number;
  y: number;
  instanceId: string;
}
