
export interface Variation {
  id: string;
  text: string;
  label: string;
  description: string;
  mood: string;
}

export interface AnalysisResult {
  original: string;
  variations: Variation[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
