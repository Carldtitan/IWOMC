CREATE TABLE "configuration_revisions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "document_kind" text NOT NULL,
  "object_id" text NOT NULL,
  "version" integer NOT NULL,
  "document" jsonb NOT NULL,
  "protected_constraint_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "document_digest" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "configuration_revisions_project_kind_version_uq"
    UNIQUE("workspace_id", "project_id", "document_kind", "version"),
  CONSTRAINT "configuration_revisions_object_version_uq"
    UNIQUE("workspace_id", "project_id", "document_kind", "object_id", "version"),
  CONSTRAINT "configuration_revisions_kind_ck"
    CHECK ("document_kind" in ('project_goal', 'behavior_contract', 'optimality_policy')),
  CONSTRAINT "configuration_revisions_version_ck" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "configuration_revisions_ws_id_uq"
  ON "configuration_revisions" USING btree ("workspace_id", "id");
--> statement-breakpoint
CREATE INDEX "configuration_revisions_current_idx"
  ON "configuration_revisions" USING btree (
    "workspace_id", "project_id", "document_kind", "version" DESC
  );
--> statement-breakpoint
ALTER TABLE "configuration_revisions"
  ADD CONSTRAINT "configuration_revisions_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "configuration_revisions"
  ADD CONSTRAINT "configuration_revisions_project_fk"
  FOREIGN KEY ("workspace_id", "project_id")
  REFERENCES "public"."projects"("workspace_id", "id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "configuration_revisions"
  ADD CONSTRAINT "configuration_revisions_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "candidate_configuration_bindings" (
  "workspace_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "binding_kind" text NOT NULL,
  "binding_object_id" text NOT NULL,
  "binding_version" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_configuration_bindings_pk"
    PRIMARY KEY("workspace_id", "candidate_id", "binding_kind"),
  CONSTRAINT "candidate_configuration_bindings_kind_ck"
    CHECK ("binding_kind" in ('project_goal', 'behavior_contract', 'optimality_policy')),
  CONSTRAINT "candidate_configuration_bindings_version_ck"
    CHECK ("binding_version" > 0)
);
--> statement-breakpoint
CREATE INDEX "candidate_configuration_bindings_lookup_idx"
  ON "candidate_configuration_bindings" USING btree (
    "workspace_id", "binding_kind", "binding_object_id", "binding_version"
  );
--> statement-breakpoint
ALTER TABLE "candidate_configuration_bindings"
  ADD CONSTRAINT "candidate_configuration_bindings_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_configuration_bindings"
  ADD CONSTRAINT "candidate_configuration_bindings_candidate_fk"
  FOREIGN KEY ("workspace_id", "candidate_id")
  REFERENCES "public"."candidates"("workspace_id", "id")
  ON DELETE cascade ON UPDATE no action;
