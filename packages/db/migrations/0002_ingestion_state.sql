ALTER TABLE "device_REDACTEDs" ADD COLUMN "REDACTED_digest" text;
--> statement-breakpoint
ALTER TABLE "device_REDACTEDs" ADD COLUMN "public_signing_key" text;
--> statement-breakpoint
ALTER TABLE "event_streams" ADD COLUMN "chain_head" text;
--> statement-breakpoint
ALTER TABLE "device_REDACTEDs" ADD CONSTRAINT "device_REDACTEDs_REDACTED_digest_uq" UNIQUE("REDACTED_digest");
--> statement-breakpoint
ALTER TABLE "device_REDACTEDs" ADD CONSTRAINT "device_REDACTEDs_material_ck"
CHECK (
  ("REDACTED_digest" IS NULL AND "public_signing_key" IS NULL)
  OR (
    "REDACTED_digest" IS NOT NULL
    AND "public_signing_key" IS NOT NULL
    AND "key_algorithm" = 'Ed25519'
  )
);
--> statement-breakpoint
ALTER TABLE "device_REDACTEDs" ADD CONSTRAINT "device_REDACTEDs_public_key_ck"
CHECK (
  "public_signing_key" IS NULL
  OR octet_length(decode("public_signing_key", 'base64')) = 32
);
--> statement-breakpoint
CREATE TABLE "ingest_batches" (
  "id" uuid PRIMARY KEY NOT NULL,
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "device_id" uuid NOT NULL,
  "event_stream_id" uuid NOT NULL,
  "batch_id" text NOT NULL,
  "logical_digest" text NOT NULL,
  "object_metadata_id" uuid NOT NULL,
  "object_key" text NOT NULL,
  "object_version_id" text NOT NULL,
  "first_sequence" bigint NOT NULL,
  "last_sequence" bigint NOT NULL,
  "chain_head" text NOT NULL,
  "state" text DEFAULT 'stored_not_enqueued' NOT NULL,
  "enqueued_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ingest_batches_ws_id_uq" UNIQUE("workspace_id", "id"),
  CONSTRAINT "ingest_batches_identity_uq" UNIQUE("workspace_id", "batch_id"),
  CONSTRAINT "ingest_batches_object_uq" UNIQUE("workspace_id", "object_metadata_id"),
  CONSTRAINT "ingest_batches_stream_sequence_uq" UNIQUE(
    "workspace_id",
    "event_stream_id",
    "first_sequence",
    "last_sequence"
  ),
  CONSTRAINT "ingest_batches_sequence_ck" CHECK (
    "first_sequence" > 0
    AND "last_sequence" >= "first_sequence"
  ),
  CONSTRAINT "ingest_batches_state_ck" CHECK (
    "state" IN ('stored_not_enqueued', 'enqueued')
  )
);
--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_workspace_id_workspaces_id_fk"
FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_project_fk"
FOREIGN KEY ("workspace_id", "project_id")
REFERENCES "public"."projects"("workspace_id", "id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_device_fk"
FOREIGN KEY ("workspace_id", "device_id")
REFERENCES "public"."devices"("workspace_id", "id")
ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_stream_fk"
FOREIGN KEY ("workspace_id", "event_stream_id")
REFERENCES "public"."event_streams"("workspace_id", "id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_object_fk"
FOREIGN KEY ("workspace_id", "object_metadata_id")
REFERENCES "public"."object_metadata"("workspace_id", "id")
ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ingest_batches_project_created_idx"
ON "ingest_batches" USING btree ("workspace_id", "project_id", "created_at");
--> statement-breakpoint
CREATE INDEX "ingest_batches_delivery_idx"
ON "ingest_batches" USING btree ("workspace_id", "state", "created_at");
