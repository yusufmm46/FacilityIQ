export type ViewType =
  | 'signin'
  | 'dashboard'
  | 'floor-plan'
  | 'analytics'
  | 'buildings'
  | 'data-import'
  | 'area-setup'
  | 'settings';

export interface Building {
  id: string;
  name: string;
  location: string;
  floors: number;
  occupancyPercent: number;
  status: 'OPTIMAL' | 'CROWDED' | 'MAINTENANCE';
  imageUrl: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  occupancyPercent: number;
  capacityText: string;
  devices: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'QUIET' | 'BUSY' | 'MODERATE';
}

export interface LogMessage {
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'sync';
  text: string;
}

export interface AccessPoint {
  id: string;
  name: string;
  type: 'IQ-GATEWAY' | 'CO2-MONITOR';
  x: number; // percentage width
  y: number; // percentage height
  status: 'online' | 'offline';
}
