export type ChatRole = "user" | "assistant";

export type ChatMessageStatus = "streaming" | "done" | "error";

export interface ChatIntermediateStep {
  id: string;
  title?: string;
  content: string;
  status: "running" | "streaming" | "done";
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  intermediateSteps?: ChatIntermediateStep[];
  status: ChatMessageStatus;
  createdAt: number;
}

export interface ChatStreamRequest {
  message: string;
  convUid?: string;
}

export interface ChatConversationResponse {
  convUid: string;
}

export interface ChatHealth {
  available: boolean;
  message: string;
}

export interface ChatStreamChunk {
  event: "chunk" | "step" | "error" | "done";
  content?: string;
  convUid?: string;
  raw?: string;
  stepId?: string;
  stepTitle?: string;
  stepStatus?: "running" | "streaming" | "done";
}

export interface ChatProfile {
  province: string;
  examYear: number;
  subjectType: string;
  totalScore: number;
  rankPosition: number;
  preferredCities: string[];
  preferredMajors: string[];
  schoolLevelRange: string;
}
