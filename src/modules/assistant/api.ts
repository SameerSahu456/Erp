// Thin typed wrapper over `/api/v1/assistant/*`. Goes through the shared
// `apiClient`, which unwraps the `ApiResponse` envelope.

import { apiClient } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";
import { API } from "@/shared/constants/api";

import type { AskAssistantRequest, AskAssistantResponse } from "./types";

export function askAssistant(request: AskAssistantRequest): Promise<AskAssistantResponse> {
  return apiClient.post<AskAssistantResponse>(endpoints.assistant.ask, request, {
    timeoutMs: API.ASSISTANT_TIMEOUT_MS,
  });
}
