ALTER TABLE "github_user_credentials"
  ADD COLUMN "refresh_lease_id" uuid,
  ADD COLUMN "refresh_lease_expires_at" timestamp with time zone,
  ADD COLUMN "revoked_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "github_user_credentials_refresh_lease_idx"
  ON "github_user_credentials" ("refresh_lease_expires_at")
  WHERE "refresh_lease_id" IS NOT NULL;
