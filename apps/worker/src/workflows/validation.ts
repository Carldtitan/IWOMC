import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

export interface ValidationWorkflowParams {
  readonly candidateId: string;
  readonly validationBatchId: string;
}

export interface ValidationWorkflowResult {
  readonly status: "foundation_only";
  readonly candidateId: string;
  readonly validationBatchId: string;
}

export class ValidationWorkflow extends WorkflowEntrypoint<Env, ValidationWorkflowParams> {
  override async run(
    event: WorkflowEvent<ValidationWorkflowParams>,
    step: WorkflowStep
  ): Promise<ValidationWorkflowResult> {
    return step.do("record foundation invocation", async () => ({
      status: "foundation_only",
      candidateId: event.payload.candidateId,
      validationBatchId: event.payload.validationBatchId
    }));
  }
}
