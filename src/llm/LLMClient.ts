export interface ClassifyRequest {
  noticeId: string;
  text: string;
}

export interface ClassifyResult {
  noticeId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

/**
 * The model boundary your pipeline depends on. Depend on this interface,
 * not on FakeLLMClient directly - grading may swap in a different
 * implementation with the same contract.
 */
export interface LLMClient {
  /**
   * Classify a single notice. Must respect `signal`: if it aborts, stop
   * waiting on this call. The fake implementation includes a request
   * that never resolves on its own - only an abort ends it.
   */
  classify(req: ClassifyRequest, signal: AbortSignal): Promise<ClassifyResult>;
}
