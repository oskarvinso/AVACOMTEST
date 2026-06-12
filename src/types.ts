export interface Evaluation {
  evaluationId: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string; // ISO 8601
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string; // ISO 8601
}

export interface CloudWatchLog {
  timestamp: string; // ISO 8601
  level: 'info' | 'warn' | 'error';
  message: string;
  requestId: string;
  executionTimeMs?: number;
}

export interface DynamoDBMetric {
  readUnits: number;
  writeUnits: number;
  tableSizeOk: boolean;
  totalRecords: number;
}
