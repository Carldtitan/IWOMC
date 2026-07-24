CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"approval_policy_version" text NOT NULL,
	"object_digest" text NOT NULL,
	"reason_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "approvals_recommendation_user_uq" UNIQUE("workspace_id","recommendation_id","user_id"),
	CONSTRAINT "approvals_decision_ck" CHECK ("approvals"."decision" in ('approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "attestations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"validation_job_id" uuid NOT NULL,
	"attestation_digest" text NOT NULL,
	"object_metadata_id" uuid NOT NULL,
	"source_input_digest" text NOT NULL,
	"candidate_digest" text NOT NULL,
	"target_digest" text NOT NULL,
	"policy_digest" text NOT NULL,
	"behavior_contract_digest" text NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attestations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "attestations_digest_uq" UNIQUE("workspace_id","attestation_digest"),
	CONSTRAINT "attestations_job_uq" UNIQUE("workspace_id","validation_job_id"),
	CONSTRAINT "attestations_outcome_ck" CHECK ("attestations"."outcome" in ('passed', 'failed', 'inconclusive', 'infrastructure', 'unsupported', 'timed_out', 'security_blocked'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_type" text NOT NULL,
	"actor_user_id" uuid,
	"actor_device_id" uuid,
	"actor_pseudonym_digest" text,
	"category" text NOT NULL,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"object_digest" text NOT NULL,
	"outcome" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata_digest" text NOT NULL,
	CONSTRAINT "audit_log_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "audit_log_idempotency_uq" UNIQUE("workspace_id","idempotency_key"),
	CONSTRAINT "audit_log_actor_type_ck" CHECK ("audit_log"."actor_type" in ('user', 'device', 'system', 'provider')),
	CONSTRAINT "audit_log_actor_binding_ck" CHECK (("audit_log"."actor_type" = 'user' and "audit_log"."actor_user_id" is not null) or ("audit_log"."actor_type" = 'device' and "audit_log"."actor_device_id" is not null) or ("audit_log"."actor_type" in ('system', 'provider') and "audit_log"."actor_pseudonym_digest" is not null)),
	CONSTRAINT "audit_log_category_ck" CHECK ("audit_log"."category" in ('authentication', 'installation', 'policy', 'behavior_contract', 'approval', 'external_side_effect', 'github_write', 'retention', 'export', 'deletion', 'cleanup')),
	CONSTRAINT "audit_log_outcome_ck" CHECK ("audit_log"."outcome" in ('succeeded', 'failed', 'denied'))
);
--> statement-breakpoint
CREATE TABLE "behavior_contracts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"contract_digest" text NOT NULL,
	"command_set_digest" text NOT NULL,
	"schema_version" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "behavior_contracts_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "behavior_contracts_project_version_uq" UNIQUE("workspace_id","project_id","version"),
	CONSTRAINT "behavior_contracts_project_digest_uq" UNIQUE("workspace_id","project_id","contract_digest"),
	CONSTRAINT "behavior_contracts_version_ck" CHECK ("behavior_contracts"."version" > 0),
	CONSTRAINT "behavior_contracts_state_ck" CHECK ("behavior_contracts"."state" in ('draft', 'accepted', 'superseded', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "braintrust_trace_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"trace_id" text NOT NULL,
	"payload_object_metadata_id" uuid NOT NULL,
	"payload_digest" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"exported_at" timestamp with time zone,
	"failure_class" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "braintrust_trace_outbox_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "braintrust_trace_outbox_trace_uq" UNIQUE("workspace_id","trace_id"),
	CONSTRAINT "braintrust_trace_outbox_state_ck" CHECK ("braintrust_trace_outbox"."state" in ('pending', 'exporting', 'exported', 'failed', 'abandoned')),
	CONSTRAINT "braintrust_trace_outbox_attempt_ck" CHECK ("braintrust_trace_outbox"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "browser_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "browser_sessions_token_digest_uq" UNIQUE("token_digest"),
	CONSTRAINT "browser_sessions_expiry_ck" CHECK ("browser_sessions"."expires_at" > "browser_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "candidate_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"finding_evidence_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"adapter_id" text NOT NULL,
	"adapter_version" text NOT NULL,
	"operation_kind" text NOT NULL,
	"operation_digest" text NOT NULL,
	"native_manager" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_operations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "candidate_operations_ordinal_uq" UNIQUE("workspace_id","candidate_id","ordinal"),
	CONSTRAINT "candidate_operations_digest_uq" UNIQUE("workspace_id","candidate_id","operation_digest"),
	CONSTRAINT "candidate_operations_ordinal_ck" CHECK ("candidate_operations"."ordinal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"source_input_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"behavior_contract_id" uuid NOT NULL,
	"candidate_digest" text NOT NULL,
	"patch_object_metadata_id" uuid,
	"state" text DEFAULT 'draft' NOT NULL,
	"state_version" integer DEFAULT 0 NOT NULL,
	"last_transition_key" text,
	"generated_by" text NOT NULL,
	"generator_version" text NOT NULL,
	"stale_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "candidates_project_digest_uq" UNIQUE("workspace_id","project_id","candidate_digest"),
	CONSTRAINT "candidates_transition_key_uq" UNIQUE("workspace_id","last_transition_key"),
	CONSTRAINT "candidates_state_ck" CHECK ("candidates"."state" in ('draft', 'static_rejected', 'ready_for_validation', 'validating', 'validation_failed', 'inconclusive', 'verified', 'stale', 'approved', 'applied')),
	CONSTRAINT "candidates_state_version_ck" CHECK ("candidates"."state_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "capability_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"provider_session_id" uuid,
	"device_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"adapter_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"support_level" text NOT NULL,
	"capability_digest" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capability_reports_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "capability_reports_identity_uq" UNIQUE("workspace_id","project_id","device_id","provider","capability_digest"),
	CONSTRAINT "capability_reports_support_ck" CHECK ("capability_reports"."support_level" in ('full_native', 'observed_only', 'unsupported', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "capture_gaps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"provider_session_id" uuid,
	"capability_report_id" uuid,
	"gap_code" text NOT NULL,
	"realm_id" uuid,
	"severity" text NOT NULL,
	"first_observed_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"evidence_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_gaps_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "capture_gaps_severity_ck" CHECK ("capture_gaps"."severity" in ('info', 'warning', 'blocking'))
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"provider_session_id" uuid,
	"trigger" text NOT NULL,
	"source_commit_sha" text NOT NULL,
	"working_tree_digest" text,
	"state" text DEFAULT 'capturing' NOT NULL,
	"coverage_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "checkpoints_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "checkpoints_state_ck" CHECK ("checkpoints"."state" in ('capturing', 'complete', 'partial', 'failed', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "cleanup_leases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"validation_job_id" uuid NOT NULL,
	"external_operation_id" uuid,
	"sandbox_id" text NOT NULL,
	"lease_key" text NOT NULL,
	"holder_id" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_deleted_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cleanup_leases_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "cleanup_leases_key_uq" UNIQUE("workspace_id","lease_key"),
	CONSTRAINT "cleanup_leases_sandbox_uq" UNIQUE("workspace_id","sandbox_id"),
	CONSTRAINT "cleanup_leases_state_ck" CHECK ("cleanup_leases"."state" in ('active', 'released', 'confirmed_deleted', 'expired', 'failed', 'escalated')),
	CONSTRAINT "cleanup_leases_attempt_ck" CHECK ("cleanup_leases"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"body_digest" text NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "comments_body_ck" CHECK (length("comments"."body") between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "concurrency_leases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"lease_key" text NOT NULL,
	"holder_id" text NOT NULL,
	"resource_class" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"acquired_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concurrency_leases_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "concurrency_leases_key_uq" UNIQUE("workspace_id","lease_key"),
	CONSTRAINT "concurrency_leases_state_ck" CHECK ("concurrency_leases"."state" in ('active', 'released', 'expired')),
	CONSTRAINT "concurrency_leases_expiry_ck" CHECK ("concurrency_leases"."expires_at" > "concurrency_leases"."acquired_at")
);
--> statement-breakpoint
CREATE TABLE "consent_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"granted_by_user_id" uuid NOT NULL,
	"consent_class" text NOT NULL,
	"policy_version" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_grants_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "consent_grants_active_identity_uq" UNIQUE("workspace_id","project_id","granted_by_user_id","consent_class","policy_version"),
	CONSTRAINT "consent_grants_state_ck" CHECK ("consent_grants"."state" in ('active', 'revoked', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "deletion_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"scope_digest" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"deleted_object_count" integer DEFAULT 0 NOT NULL,
	"failure_digest" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deletion_jobs_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "deletion_jobs_idempotency_uq" UNIQUE("workspace_id","idempotency_key"),
	CONSTRAINT "deletion_jobs_state_ck" CHECK ("deletion_jobs"."state" in ('queued', 'running', 'complete', 'partial', 'failed', 'cancelled')),
	CONSTRAINT "deletion_jobs_count_ck" CHECK ("deletion_jobs"."deleted_object_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deletion_tombstones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"deletion_job_id" uuid NOT NULL,
	"object_type" text NOT NULL,
	"object_id_digest" text NOT NULL,
	"prior_content_digest" text,
	"reason_code" text NOT NULL,
	"deleted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deletion_tombstones_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "deletion_tombstones_object_uq" UNIQUE("workspace_id","object_type","object_id_digest")
);
--> statement-breakpoint
CREATE TABLE "device_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"public_key_fingerprint" text NOT NULL,
	"key_algorithm" text NOT NULL,
	"key_version" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_credentials_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "device_credentials_fingerprint_uq" UNIQUE("public_key_fingerprint"),
	CONSTRAINT "device_credentials_version_uq" UNIQUE("workspace_id","device_id","key_version"),
	CONSTRAINT "device_credentials_version_ck" CHECK ("device_credentials"."key_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"enrolled_by_user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"platform" text NOT NULL,
	"companion_version" text,
	"state" text DEFAULT 'unpaired' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "devices_state_ck" CHECK ("devices"."state" in ('unpaired', 'paired', 'online', 'offline', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "environment_layers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"realm_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"path_digest" text NOT NULL,
	"manager" text,
	"runtime" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "environment_layers_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "environment_layers_identity_uq" UNIQUE("workspace_id","realm_id","kind","path_digest"),
	CONSTRAINT "environment_layers_kind_ck" CHECK ("environment_layers"."kind" in ('system', 'user', 'project', 'virtual-environment', 'toolchain', 'container'))
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"model_prompt_version_id" uuid NOT NULL,
	"evaluation_suite_id" text NOT NULL,
	"evaluation_suite_version" text NOT NULL,
	"run_digest" text NOT NULL,
	"state" text DEFAULT 'running' NOT NULL,
	"case_count" integer DEFAULT 0 NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"result_object_metadata_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_runs_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "evaluation_runs_digest_uq" UNIQUE("workspace_id","run_digest"),
	CONSTRAINT "evaluation_runs_state_ck" CHECK ("evaluation_runs"."state" in ('running', 'passed', 'failed', 'cancelled')),
	CONSTRAINT "evaluation_runs_counts_ck" CHECK ("evaluation_runs"."case_count" >= 0 and "evaluation_runs"."passed_count" >= 0 and "evaluation_runs"."failed_count" >= 0 and "evaluation_runs"."passed_count" + "evaluation_runs"."failed_count" <= "evaluation_runs"."case_count")
);
--> statement-breakpoint
CREATE TABLE "event_anchors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_stream_id" uuid NOT NULL,
	"anchor_sequence" bigint NOT NULL,
	"event_digest" text NOT NULL,
	"signature_digest" text NOT NULL,
	"credential_version" integer NOT NULL,
	"anchored_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_anchors_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "event_anchors_stream_seq_uq" UNIQUE("workspace_id","event_stream_id","anchor_sequence"),
	CONSTRAINT "event_anchors_sequence_ck" CHECK ("event_anchors"."anchor_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_headers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"event_stream_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"ingest_batch_id" text NOT NULL,
	"batch_event_index" integer NOT NULL,
	"source_sequence" bigint,
	"monotonic_sequence" bigint NOT NULL,
	"event_type" text NOT NULL,
	"actor_kind" text NOT NULL,
	"actor_confidence" numeric(5, 4) NOT NULL,
	"payload_digest" text NOT NULL,
	"payload_object_id" uuid,
	"previous_event_digest" text,
	"event_digest" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_headers_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "event_headers_event_id_uq" UNIQUE("workspace_id","event_id"),
	CONSTRAINT "event_headers_stream_source_seq_uq" UNIQUE("workspace_id","event_stream_id","source_sequence"),
	CONSTRAINT "event_headers_stream_monotonic_uq" UNIQUE("workspace_id","event_stream_id","monotonic_sequence"),
	CONSTRAINT "event_headers_batch_index_uq" UNIQUE("workspace_id","ingest_batch_id","batch_event_index"),
	CONSTRAINT "event_headers_batch_index_ck" CHECK ("event_headers"."batch_event_index" >= 0),
	CONSTRAINT "event_headers_monotonic_ck" CHECK ("event_headers"."monotonic_sequence" >= 0),
	CONSTRAINT "event_headers_actor_kind_ck" CHECK ("event_headers"."actor_kind" in ('agent', 'human', 'mixed', 'unknown', 'system')),
	CONSTRAINT "event_headers_actor_confidence_ck" CHECK ("event_headers"."actor_confidence" >= 0 and "event_headers"."actor_confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "event_streams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"provider_session_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"realm_id" uuid NOT NULL,
	"stream_identity_digest" text NOT NULL,
	"schema_version" text NOT NULL,
	"last_source_sequence" bigint,
	"last_monotonic_sequence" bigint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_streams_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "event_streams_identity_uq" UNIQUE("workspace_id","stream_identity_digest")
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"scope_digest" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"output_object_metadata_id" uuid,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_jobs_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "export_jobs_idempotency_uq" UNIQUE("workspace_id","idempotency_key"),
	CONSTRAINT "export_jobs_state_ck" CHECK ("export_jobs"."state" in ('queued', 'running', 'complete', 'failed', 'expired', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "external_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"operation_key" text NOT NULL,
	"provider" text NOT NULL,
	"operation_kind" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"state" text DEFAULT 'reserved' NOT NULL,
	"provider_resource_id" text,
	"provider_request_id" text,
	"accepted_result_digest" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"reconciliation_state" text DEFAULT 'not_started' NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_operations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "external_operations_key_uq" UNIQUE("workspace_id","operation_key"),
	CONSTRAINT "external_operations_provider_ck" CHECK ("external_operations"."provider" in ('fireworks', 'daytona', 'braintrust', 'github', 'r2', 'queue')),
	CONSTRAINT "external_operations_state_ck" CHECK ("external_operations"."state" in ('reserved', 'in_progress', 'succeeded', 'failed', 'reconciling', 'cancelled')),
	CONSTRAINT "external_operations_reconciliation_ck" CHECK ("external_operations"."reconciliation_state" in ('not_started', 'not_supported', 'pending', 'matched', 'not_found', 'conflict', 'complete')),
	CONSTRAINT "external_operations_attempt_count_ck" CHECK ("external_operations"."attempt_count" >= 0),
	CONSTRAINT "external_operations_cost_ck" CHECK ("external_operations"."cost_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "finding_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"event_header_id" uuid,
	"snapshot_id" uuid,
	"evidence_type" text NOT NULL,
	"evidence_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finding_evidence_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "finding_evidence_identity_uq" UNIQUE("workspace_id","finding_id","evidence_digest")
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"rule_version" text NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"support_level" text NOT NULL,
	"confidence_evidence" numeric(5, 4) NOT NULL,
	"confidence_attribution" numeric(5, 4) NOT NULL,
	"confidence_completeness" numeric(5, 4) NOT NULL,
	"evidence_set_digest" text NOT NULL,
	"gap_set_digest" text NOT NULL,
	"superseded_by_finding_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "findings_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "findings_checkpoint_rule_uq" UNIQUE("workspace_id","checkpoint_id","rule_id","rule_version","evidence_set_digest"),
	CONSTRAINT "findings_state_ck" CHECK ("findings"."state" in ('open', 'needs_evidence', 'accepted', 'rejected', 'superseded')),
	CONSTRAINT "findings_support_ck" CHECK ("findings"."support_level" in ('full_native', 'observed_only', 'unsupported')),
	CONSTRAINT "findings_confidence_ck" CHECK ("findings"."confidence_evidence" between 0 and 1 and "findings"."confidence_attribution" between 0 and 1 and "findings"."confidence_completeness" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"installed_by_user_id" uuid NOT NULL,
	"github_installation_id" text NOT NULL,
	"account_id" text NOT NULL,
	"account_login" text NOT NULL,
	"permissions_digest" text NOT NULL,
	"suspended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "github_installations_provider_uq" UNIQUE("github_installation_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_facts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"realm_id" uuid NOT NULL,
	"environment_layer_id" uuid NOT NULL,
	"ecosystem" text NOT NULL,
	"package_name" text NOT NULL,
	"package_version" text,
	"package_identity_digest" text NOT NULL,
	"evidence_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_facts_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "inventory_facts_identity_uq" UNIQUE("workspace_id","snapshot_id","package_identity_digest")
);
--> statement-breakpoint
CREATE TABLE "job_dedup_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"validation_job_id" uuid NOT NULL,
	"dedup_key" text NOT NULL,
	"request_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_dedup_keys_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "job_dedup_keys_key_uq" UNIQUE("workspace_id","dedup_key")
);
--> statement-breakpoint
CREATE TABLE "model_prompt_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"template_id" text NOT NULL,
	"version" integer NOT NULL,
	"prompt_digest" text NOT NULL,
	"response_schema_digest" text NOT NULL,
	"model_id" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_prompt_versions_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "model_prompt_versions_identity_uq" UNIQUE("workspace_id","project_id","template_id","version"),
	CONSTRAINT "model_prompt_versions_version_ck" CHECK ("model_prompt_versions"."version" > 0),
	CONSTRAINT "model_prompt_versions_state_ck" CHECK ("model_prompt_versions"."state" in ('active', 'superseded', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state_digest" text NOT NULL,
	"redirect_path" text NOT NULL,
	"code_verifier_digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_states_state_digest_uq" UNIQUE("state_digest"),
	CONSTRAINT "oauth_states_expiry_ck" CHECK ("oauth_states"."expires_at" > "oauth_states"."created_at")
);
--> statement-breakpoint
CREATE TABLE "object_metadata" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"object_version_id" text NOT NULL,
	"object_type" text NOT NULL,
	"schema_version" text NOT NULL,
	"ciphertext_digest" text NOT NULL,
	"plaintext_digest" text,
	"ciphertext_bytes" bigint NOT NULL,
	"compression" text NOT NULL,
	"encryption_algorithm" text NOT NULL,
	"encryption_key_version" text NOT NULL,
	"nonce_digest" text NOT NULL,
	"authenticated_metadata_digest" text NOT NULL,
	"retention_class" text NOT NULL,
	"authorization_class" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"tombstone_digest" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "object_metadata_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "object_metadata_key_version_uq" UNIQUE("workspace_id","object_key","object_version_id"),
	CONSTRAINT "object_metadata_ciphertext_uq" UNIQUE("workspace_id","ciphertext_digest"),
	CONSTRAINT "object_metadata_bytes_ck" CHECK ("object_metadata"."ciphertext_bytes" >= 0),
	CONSTRAINT "object_metadata_type_ck" CHECK ("object_metadata"."object_type" in ('event-batch', 'inventory', 'source-bundle', 'candidate-patch', 'validation-diagnostic', 'attestation', 'braintrust-outbox', 'raw-opt-in')),
	CONSTRAINT "object_metadata_state_ck" CHECK ("object_metadata"."state" in ('pending', 'available', 'deleting', 'deleted', 'tombstoned')),
	CONSTRAINT "object_metadata_encryption_ck" CHECK ("object_metadata"."encryption_algorithm" = 'AES-256-GCM')
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"version" integer NOT NULL,
	"policy_digest" text NOT NULL,
	"schema_version" text NOT NULL,
	"hard_constraints_digest" text NOT NULL,
	"objectives_digest" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policies_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "policies_scope_version_uq" UNIQUE("workspace_id","project_id","version"),
	CONSTRAINT "policies_scope_digest_uq" UNIQUE("workspace_id","project_id","policy_digest"),
	CONSTRAINT "policies_version_ck" CHECK ("policies"."version" > 0),
	CONSTRAINT "policies_state_ck" CHECK ("policies"."state" in ('draft', 'active', 'superseded', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "projects_ws_slug_uq" UNIQUE("workspace_id","slug"),
	CONSTRAINT "projects_status_ck" CHECK ("projects"."status" in ('active', 'archived', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "provider_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"realm_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_session_id_digest" text NOT NULL,
	"state" text DEFAULT 'registered' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_sessions_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "provider_sessions_provider_id_uq" UNIQUE("workspace_id","provider","provider_session_id_digest"),
	CONSTRAINT "provider_sessions_provider_ck" CHECK ("provider_sessions"."provider" in ('codex', 'claude-code', 'cursor', 'unknown')),
	CONSTRAINT "provider_sessions_state_ck" CHECK ("provider_sessions"."state" in ('registered', 'observing', 'draining', 'checkpointing', 'partial_capture', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "raw_content_access_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"consent_grant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"object_metadata_id" uuid NOT NULL,
	"purpose_code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raw_content_access_grants_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "raw_content_access_grants_expiry_ck" CHECK ("raw_content_access_grants"."expires_at" > "raw_content_access_grants"."created_at")
);
--> statement-breakpoint
CREATE TABLE "realms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"stable_identity_digest" text NOT NULL,
	"display_name" text NOT NULL,
	"operating_system" text NOT NULL,
	"architecture" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "realms_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "realms_identity_uq" UNIQUE("workspace_id","device_id","stable_identity_digest"),
	CONSTRAINT "realms_kind_ck" CHECK ("realms"."kind" in ('host', 'wsl', 'container', 'remote', 'ide-host', 'sandbox'))
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"attestation_set_digest" text NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"state_version" integer DEFAULT 0 NOT NULL,
	"last_transition_key" text,
	"source_input_digest" text NOT NULL,
	"policy_digest" text NOT NULL,
	"behavior_contract_digest" text NOT NULL,
	"target_set_digest" text NOT NULL,
	"invalidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "recommendations_candidate_uq" UNIQUE("workspace_id","candidate_id"),
	CONSTRAINT "recommendations_transition_key_uq" UNIQUE("workspace_id","last_transition_key"),
	CONSTRAINT "recommendations_state_ck" CHECK ("recommendations"."state" in ('draft', 'reviewable', 'approved', 'applied', 'invalidated', 'rejected', 'superseded')),
	CONSTRAINT "recommendations_state_version_ck" CHECK ("recommendations"."state_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"github_installation_id" uuid NOT NULL,
	"provider_repository_id" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"default_branch" text NOT NULL,
	"visibility" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "repositories_ws_project_uq" UNIQUE("workspace_id","project_id"),
	CONSTRAINT "repositories_provider_id_uq" UNIQUE("workspace_id","provider_repository_id"),
	CONSTRAINT "repositories_visibility_ck" CHECK ("repositories"."visibility" in ('private', 'internal', 'public'))
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"retention_class" text NOT NULL,
	"version" integer NOT NULL,
	"duration_seconds" bigint NOT NULL,
	"object_type" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policies_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "retention_policies_class_version_uq" UNIQUE("workspace_id","retention_class","version"),
	CONSTRAINT "retention_policies_version_ck" CHECK ("retention_policies"."version" > 0),
	CONSTRAINT "retention_policies_duration_ck" CHECK ("retention_policies"."duration_seconds" > 0),
	CONSTRAINT "retention_policies_state_ck" CHECK ("retention_policies"."state" in ('draft', 'active', 'superseded', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "secret_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"reference_name" text NOT NULL,
	"provider" text NOT NULL,
	"provider_reference_digest" text NOT NULL,
	"secret_kind" text NOT NULL,
	"version_digest" text NOT NULL,
	"allowed_host_digests" jsonb NOT NULL,
	"allowed_target_digest" text,
	"state" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "secret_references_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "secret_references_name_uq" UNIQUE("workspace_id","project_id","reference_name"),
	CONSTRAINT "secret_references_state_ck" CHECK ("secret_references"."state" in ('active', 'rotated', 'revoked', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"realm_id" uuid NOT NULL,
	"environment_layer_id" uuid,
	"kind" text NOT NULL,
	"content_digest" text NOT NULL,
	"object_metadata_id" uuid,
	"stable" boolean NOT NULL,
	"stabilization_attempts" integer NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "snapshots_checkpoint_identity_uq" UNIQUE("workspace_id","checkpoint_id","realm_id","environment_layer_id","kind"),
	CONSTRAINT "snapshots_stabilization_ck" CHECK ("snapshots"."stabilization_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE "source_bundles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_input_id" uuid NOT NULL,
	"object_metadata_id" uuid NOT NULL,
	"bundle_digest" text NOT NULL,
	"ignore_policy_version" text NOT NULL,
	"secret_scan_version" text NOT NULL,
	"file_count" integer NOT NULL,
	"uncompressed_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_bundles_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "source_bundles_source_uq" UNIQUE("workspace_id","source_input_id"),
	CONSTRAINT "source_bundles_digest_uq" UNIQUE("workspace_id","bundle_digest"),
	CONSTRAINT "source_bundles_file_count_ck" CHECK ("source_bundles"."file_count" >= 0),
	CONSTRAINT "source_bundles_bytes_ck" CHECK ("source_bundles"."uncompressed_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "source_inputs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"checkpoint_id" uuid,
	"commit_sha" text NOT NULL,
	"tree_digest" text NOT NULL,
	"source_input_digest" text NOT NULL,
	"submodule_identity_digest" text,
	"lfs_identity_digest" text,
	"support_gap_digest" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "source_inputs_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "source_inputs_digest_uq" UNIQUE("workspace_id","source_input_digest"),
	CONSTRAINT "source_inputs_state_ck" CHECK ("source_inputs"."state" in ('pending', 'available', 'rejected', 'expired', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "support_registry_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"ecosystem" text NOT NULL,
	"tool" text NOT NULL,
	"format_version" text NOT NULL,
	"adapter_version" text NOT NULL,
	"support_level" text NOT NULL,
	"capability_digest" text NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_registry_entries_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "support_registry_entries_identity_uq" UNIQUE("workspace_id","project_id","ecosystem","tool","format_version","adapter_version"),
	CONSTRAINT "support_registry_entries_support_ck" CHECK ("support_registry_entries"."support_level" in ('full_native', 'observed_only', 'unsupported'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"github_user_id" text NOT NULL,
	"github_login" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_user_id_uq" UNIQUE("github_user_id"),
	CONSTRAINT "users_github_login_uq" UNIQUE("github_login")
);
--> statement-breakpoint
CREATE TABLE "validation_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"source_input_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"behavior_contract_id" uuid NOT NULL,
	"workflow_idempotency_key" text NOT NULL,
	"target_set_digest" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "validation_batches_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "validation_batches_workflow_key_uq" UNIQUE("workspace_id","workflow_idempotency_key"),
	CONSTRAINT "validation_batches_state_ck" CHECK ("validation_batches"."state" in ('queued', 'running', 'complete', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "validation_cache_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"cache_key_digest" text NOT NULL,
	"attestation_id" uuid,
	"state" text DEFAULT 'available' NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invalidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validation_cache_entries_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "validation_cache_entries_key_uq" UNIQUE("workspace_id","cache_key_digest"),
	CONSTRAINT "validation_cache_entries_state_ck" CHECK ("validation_cache_entries"."state" in ('available', 'invalidated', 'expired')),
	CONSTRAINT "validation_cache_entries_hit_count_ck" CHECK ("validation_cache_entries"."hit_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "validation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"validation_batch_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"validation_target_id" uuid NOT NULL,
	"source_input_id" uuid NOT NULL,
	"immutable_input_digest" text NOT NULL,
	"dedup_digest" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"state_version" integer DEFAULT 0 NOT NULL,
	"last_transition_key" text,
	"terminal_outcome" text,
	"sandbox_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "validation_jobs_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "validation_jobs_candidate_target_uq" UNIQUE("workspace_id","candidate_id","validation_target_id","immutable_input_digest"),
	CONSTRAINT "validation_jobs_dedup_uq" UNIQUE("workspace_id","dedup_digest"),
	CONSTRAINT "validation_jobs_transition_key_uq" UNIQUE("workspace_id","last_transition_key"),
	CONSTRAINT "validation_jobs_state_ck" CHECK ("validation_jobs"."state" in ('queued', 'provisioning', 'preflight', 'source_prepare', 'resolve', 'install', 'build', 'test', 'smoke', 'benchmark', 'evidence_persist', 'cleanup', 'terminal')),
	CONSTRAINT "validation_jobs_outcome_ck" CHECK ("validation_jobs"."terminal_outcome" is null or "validation_jobs"."terminal_outcome" in ('passed', 'failed', 'inconclusive', 'infrastructure', 'unsupported', 'timed_out', 'security_blocked', 'cancelled')),
	CONSTRAINT "validation_jobs_state_version_ck" CHECK ("validation_jobs"."state_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "validation_phases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"validation_job_id" uuid NOT NULL,
	"phase" text NOT NULL,
	"attempt" integer NOT NULL,
	"outcome" text NOT NULL,
	"input_digest" text NOT NULL,
	"output_digest" text NOT NULL,
	"diagnostic_object_metadata_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validation_phases_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "validation_phases_job_phase_attempt_uq" UNIQUE("workspace_id","validation_job_id","phase","attempt"),
	CONSTRAINT "validation_phases_attempt_ck" CHECK ("validation_phases"."attempt" > 0),
	CONSTRAINT "validation_phases_outcome_ck" CHECK ("validation_phases"."outcome" in ('running', 'passed', 'failed', 'inconclusive', 'skipped', 'timed_out', 'infrastructure', 'unsupported', 'security_blocked'))
);
--> statement-breakpoint
CREATE TABLE "validation_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"target_digest" text NOT NULL,
	"operating_system" text NOT NULL,
	"architecture" text NOT NULL,
	"image_reference" text NOT NULL,
	"image_digest" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"policy_id" uuid NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validation_targets_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "validation_targets_project_digest_uq" UNIQUE("workspace_id","project_id","target_digest"),
	CONSTRAINT "validation_targets_state_ck" CHECK ("validation_targets"."state" in ('active', 'superseded', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"github_installation_id" uuid NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"delivery_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_digest" text NOT NULL,
	"state" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "webhook_deliveries_provider_delivery_uq" UNIQUE("provider","delivery_id"),
	CONSTRAINT "webhook_deliveries_state_ck" CHECK ("webhook_deliveries"."state" in ('received', 'processing', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"github_user_id" text,
	"email_digest" text,
	"token_digest" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitations_ws_id_uq" UNIQUE("workspace_id","id"),
	CONSTRAINT "workspace_invitations_token_uq" UNIQUE("token_digest"),
	CONSTRAINT "workspace_invitations_role_ck" CHECK ("workspace_invitations"."role" in ('owner', 'member')),
	CONSTRAINT "workspace_invitations_state_ck" CHECK ("workspace_invitations"."state" in ('pending', 'accepted', 'revoked', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pk" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "workspace_members_role_ck" CHECK ("workspace_members"."role" in ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"raw_content_enabled" boolean DEFAULT false NOT NULL,
	"default_retention_class" text DEFAULT 'mvp-default' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_uq" UNIQUE("slug"),
	CONSTRAINT "workspaces_slug_ck" CHECK ("workspaces"."slug" ~ '^[a-z0-9][a-z0-9-]{1,62}$')
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_recommendation_fk" FOREIGN KEY ("workspace_id","recommendation_id") REFERENCES "public"."recommendations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_job_fk" FOREIGN KEY ("workspace_id","validation_job_id") REFERENCES "public"."validation_jobs"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_object_fk" FOREIGN KEY ("workspace_id","object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_device_fk" FOREIGN KEY ("workspace_id","actor_device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_contracts" ADD CONSTRAINT "behavior_contracts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_contracts" ADD CONSTRAINT "behavior_contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_contracts" ADD CONSTRAINT "behavior_contracts_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_contracts" ADD CONSTRAINT "behavior_contracts_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "braintrust_trace_outbox" ADD CONSTRAINT "braintrust_trace_outbox_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "braintrust_trace_outbox" ADD CONSTRAINT "braintrust_trace_outbox_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "braintrust_trace_outbox" ADD CONSTRAINT "braintrust_trace_outbox_object_fk" FOREIGN KEY ("workspace_id","payload_object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "browser_sessions" ADD CONSTRAINT "browser_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_operations" ADD CONSTRAINT "candidate_operations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_operations" ADD CONSTRAINT "candidate_operations_candidate_fk" FOREIGN KEY ("workspace_id","candidate_id") REFERENCES "public"."candidates"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_operations" ADD CONSTRAINT "candidate_operations_evidence_fk" FOREIGN KEY ("workspace_id","finding_evidence_id") REFERENCES "public"."finding_evidence"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_finding_fk" FOREIGN KEY ("workspace_id","finding_id") REFERENCES "public"."findings"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_source_fk" FOREIGN KEY ("workspace_id","source_input_id") REFERENCES "public"."source_inputs"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_policy_fk" FOREIGN KEY ("workspace_id","policy_id") REFERENCES "public"."policies"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_contract_fk" FOREIGN KEY ("workspace_id","behavior_contract_id") REFERENCES "public"."behavior_contracts"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_patch_object_fk" FOREIGN KEY ("workspace_id","patch_object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_reports" ADD CONSTRAINT "capability_reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_reports" ADD CONSTRAINT "capability_reports_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_reports" ADD CONSTRAINT "capability_reports_device_fk" FOREIGN KEY ("workspace_id","device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_reports" ADD CONSTRAINT "capability_reports_session_fk" FOREIGN KEY ("workspace_id","provider_session_id") REFERENCES "public"."provider_sessions"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_gaps" ADD CONSTRAINT "capture_gaps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_gaps" ADD CONSTRAINT "capture_gaps_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_gaps" ADD CONSTRAINT "capture_gaps_session_fk" FOREIGN KEY ("workspace_id","provider_session_id") REFERENCES "public"."provider_sessions"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_gaps" ADD CONSTRAINT "capture_gaps_capability_fk" FOREIGN KEY ("workspace_id","capability_report_id") REFERENCES "public"."capability_reports"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_repository_fk" FOREIGN KEY ("workspace_id","repository_id") REFERENCES "public"."repositories"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_session_fk" FOREIGN KEY ("workspace_id","provider_session_id") REFERENCES "public"."provider_sessions"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleanup_leases" ADD CONSTRAINT "cleanup_leases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleanup_leases" ADD CONSTRAINT "cleanup_leases_job_fk" FOREIGN KEY ("workspace_id","validation_job_id") REFERENCES "public"."validation_jobs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleanup_leases" ADD CONSTRAINT "cleanup_leases_operation_fk" FOREIGN KEY ("workspace_id","external_operation_id") REFERENCES "public"."external_operations"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_finding_fk" FOREIGN KEY ("workspace_id","finding_id") REFERENCES "public"."findings"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concurrency_leases" ADD CONSTRAINT "concurrency_leases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concurrency_leases" ADD CONSTRAINT "concurrency_leases_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_tombstones" ADD CONSTRAINT "deletion_tombstones_job_fk" FOREIGN KEY ("workspace_id","deletion_job_id") REFERENCES "public"."deletion_jobs"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_credentials" ADD CONSTRAINT "device_credentials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_credentials" ADD CONSTRAINT "device_credentials_device_fk" FOREIGN KEY ("workspace_id","device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_enrolled_by_user_id_users_id_fk" FOREIGN KEY ("enrolled_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_layers" ADD CONSTRAINT "environment_layers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_layers" ADD CONSTRAINT "environment_layers_realm_fk" FOREIGN KEY ("workspace_id","realm_id") REFERENCES "public"."realms"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_prompt_fk" FOREIGN KEY ("workspace_id","model_prompt_version_id") REFERENCES "public"."model_prompt_versions"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_object_fk" FOREIGN KEY ("workspace_id","result_object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_anchors" ADD CONSTRAINT "event_anchors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_anchors" ADD CONSTRAINT "event_anchors_stream_fk" FOREIGN KEY ("workspace_id","event_stream_id") REFERENCES "public"."event_streams"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_headers" ADD CONSTRAINT "event_headers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_headers" ADD CONSTRAINT "event_headers_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_headers" ADD CONSTRAINT "event_headers_stream_fk" FOREIGN KEY ("workspace_id","event_stream_id") REFERENCES "public"."event_streams"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_headers" ADD CONSTRAINT "event_headers_payload_object_fk" FOREIGN KEY ("workspace_id","payload_object_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_streams" ADD CONSTRAINT "event_streams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_streams" ADD CONSTRAINT "event_streams_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_streams" ADD CONSTRAINT "event_streams_session_fk" FOREIGN KEY ("workspace_id","provider_session_id") REFERENCES "public"."provider_sessions"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_streams" ADD CONSTRAINT "event_streams_device_fk" FOREIGN KEY ("workspace_id","device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_streams" ADD CONSTRAINT "event_streams_realm_fk" FOREIGN KEY ("workspace_id","realm_id") REFERENCES "public"."realms"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_object_fk" FOREIGN KEY ("workspace_id","output_object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_operations" ADD CONSTRAINT "external_operations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_operations" ADD CONSTRAINT "external_operations_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_finding_fk" FOREIGN KEY ("workspace_id","finding_id") REFERENCES "public"."findings"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_event_fk" FOREIGN KEY ("workspace_id","event_header_id") REFERENCES "public"."event_headers"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_snapshot_fk" FOREIGN KEY ("workspace_id","snapshot_id") REFERENCES "public"."snapshots"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_checkpoint_fk" FOREIGN KEY ("workspace_id","checkpoint_id") REFERENCES "public"."checkpoints"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_superseded_by_fk" FOREIGN KEY ("workspace_id","superseded_by_finding_id") REFERENCES "public"."findings"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_installed_by_user_id_users_id_fk" FOREIGN KEY ("installed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_facts" ADD CONSTRAINT "inventory_facts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_facts" ADD CONSTRAINT "inventory_facts_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_facts" ADD CONSTRAINT "inventory_facts_snapshot_fk" FOREIGN KEY ("workspace_id","snapshot_id") REFERENCES "public"."snapshots"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_facts" ADD CONSTRAINT "inventory_facts_realm_fk" FOREIGN KEY ("workspace_id","realm_id") REFERENCES "public"."realms"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_facts" ADD CONSTRAINT "inventory_facts_layer_fk" FOREIGN KEY ("workspace_id","environment_layer_id") REFERENCES "public"."environment_layers"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dedup_keys" ADD CONSTRAINT "job_dedup_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dedup_keys" ADD CONSTRAINT "job_dedup_keys_job_fk" FOREIGN KEY ("workspace_id","validation_job_id") REFERENCES "public"."validation_jobs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_prompt_versions" ADD CONSTRAINT "model_prompt_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_prompt_versions" ADD CONSTRAINT "model_prompt_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_prompt_versions" ADD CONSTRAINT "model_prompt_versions_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_metadata" ADD CONSTRAINT "object_metadata_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sessions" ADD CONSTRAINT "provider_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sessions" ADD CONSTRAINT "provider_sessions_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sessions" ADD CONSTRAINT "provider_sessions_device_fk" FOREIGN KEY ("workspace_id","device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sessions" ADD CONSTRAINT "provider_sessions_realm_fk" FOREIGN KEY ("workspace_id","realm_id") REFERENCES "public"."realms"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_content_access_grants" ADD CONSTRAINT "raw_content_access_grants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_content_access_grants" ADD CONSTRAINT "raw_content_access_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_content_access_grants" ADD CONSTRAINT "raw_content_access_grants_consent_fk" FOREIGN KEY ("workspace_id","consent_grant_id") REFERENCES "public"."consent_grants"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_content_access_grants" ADD CONSTRAINT "raw_content_access_grants_object_fk" FOREIGN KEY ("workspace_id","object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realms" ADD CONSTRAINT "realms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realms" ADD CONSTRAINT "realms_device_fk" FOREIGN KEY ("workspace_id","device_id") REFERENCES "public"."devices"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_candidate_fk" FOREIGN KEY ("workspace_id","candidate_id") REFERENCES "public"."candidates"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_installation_fk" FOREIGN KEY ("workspace_id","github_installation_id") REFERENCES "public"."github_installations"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_references" ADD CONSTRAINT "secret_references_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_references" ADD CONSTRAINT "secret_references_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_checkpoint_fk" FOREIGN KEY ("workspace_id","checkpoint_id") REFERENCES "public"."checkpoints"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_realm_fk" FOREIGN KEY ("workspace_id","realm_id") REFERENCES "public"."realms"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_layer_fk" FOREIGN KEY ("workspace_id","environment_layer_id") REFERENCES "public"."environment_layers"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_object_fk" FOREIGN KEY ("workspace_id","object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_bundles" ADD CONSTRAINT "source_bundles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_bundles" ADD CONSTRAINT "source_bundles_source_fk" FOREIGN KEY ("workspace_id","source_input_id") REFERENCES "public"."source_inputs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_bundles" ADD CONSTRAINT "source_bundles_object_fk" FOREIGN KEY ("workspace_id","object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_inputs" ADD CONSTRAINT "source_inputs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_inputs" ADD CONSTRAINT "source_inputs_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_inputs" ADD CONSTRAINT "source_inputs_repository_fk" FOREIGN KEY ("workspace_id","repository_id") REFERENCES "public"."repositories"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_inputs" ADD CONSTRAINT "source_inputs_checkpoint_fk" FOREIGN KEY ("workspace_id","checkpoint_id") REFERENCES "public"."checkpoints"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_registry_entries" ADD CONSTRAINT "support_registry_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_registry_entries" ADD CONSTRAINT "support_registry_entries_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_candidate_fk" FOREIGN KEY ("workspace_id","candidate_id") REFERENCES "public"."candidates"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_source_fk" FOREIGN KEY ("workspace_id","source_input_id") REFERENCES "public"."source_inputs"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_policy_fk" FOREIGN KEY ("workspace_id","policy_id") REFERENCES "public"."policies"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_batches" ADD CONSTRAINT "validation_batches_contract_fk" FOREIGN KEY ("workspace_id","behavior_contract_id") REFERENCES "public"."behavior_contracts"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_cache_entries" ADD CONSTRAINT "validation_cache_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_cache_entries" ADD CONSTRAINT "validation_cache_entries_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_batch_fk" FOREIGN KEY ("workspace_id","validation_batch_id") REFERENCES "public"."validation_batches"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_candidate_fk" FOREIGN KEY ("workspace_id","candidate_id") REFERENCES "public"."candidates"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_target_fk" FOREIGN KEY ("workspace_id","validation_target_id") REFERENCES "public"."validation_targets"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_jobs" ADD CONSTRAINT "validation_jobs_source_fk" FOREIGN KEY ("workspace_id","source_input_id") REFERENCES "public"."source_inputs"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_phases" ADD CONSTRAINT "validation_phases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_phases" ADD CONSTRAINT "validation_phases_job_fk" FOREIGN KEY ("workspace_id","validation_job_id") REFERENCES "public"."validation_jobs"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_phases" ADD CONSTRAINT "validation_phases_diagnostic_fk" FOREIGN KEY ("workspace_id","diagnostic_object_metadata_id") REFERENCES "public"."object_metadata"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_targets" ADD CONSTRAINT "validation_targets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_targets" ADD CONSTRAINT "validation_targets_project_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_targets" ADD CONSTRAINT "validation_targets_policy_fk" FOREIGN KEY ("workspace_id","policy_id") REFERENCES "public"."policies"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_installation_fk" FOREIGN KEY ("workspace_id","github_installation_id") REFERENCES "public"."github_installations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_object_idx" ON "audit_log" USING btree ("workspace_id","object_type","object_id","occurred_at");--> statement-breakpoint
CREATE INDEX "browser_sessions_user_idx" ON "browser_sessions" USING btree ("user_id");