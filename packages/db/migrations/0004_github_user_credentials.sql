CREATE TABLE "github_user_credentials" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "encrypted_credentials" text NOT NULL,
  "token_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_user_credentials"
  ADD CONSTRAINT "github_user_credentials_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
