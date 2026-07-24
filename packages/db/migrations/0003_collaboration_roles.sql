ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_role_ck";
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_role_ck" CHECK ("workspace_members"."role" in ('owner', 'maintainer', 'developer', 'reviewer', 'observer', 'member'));
--> statement-breakpoint
ALTER TABLE "workspace_invitations" DROP CONSTRAINT "workspace_invitations_role_ck";
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_role_ck" CHECK ("workspace_invitations"."role" in ('owner', 'maintainer', 'developer', 'reviewer', 'observer', 'member'));
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_category_ck";
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_category_ck" CHECK ("audit_log"."category" in ('authentication', 'installation', 'policy', 'behavior_contract', 'approval', 'collaboration', 'membership', 'device', 'integration', 'privacy', 'external_side_effect', 'github_write', 'retention', 'export', 'deletion', 'cleanup'));
