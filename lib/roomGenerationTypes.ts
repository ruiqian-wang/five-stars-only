export type RoomItem = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomStructureElement = {
  id: string;
  elementType: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type RoomStructure = {
  roomId: string;
  roomType: string;
  width: number;
  height: number;
  frame: RoomStructureElement[];
};

export type RoomGenerationInput = {
  roomStructure: RoomStructure;
  roomItems: RoomItem[];
};
