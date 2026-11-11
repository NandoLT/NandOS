CREATE TABLE "admin_auth_limits" (
	"scope" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD COLUMN "last_seen_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "admin_sessions" SET "last_seen_at" = "created_at";
--> statement-breakpoint
ALTER TABLE "admin_sessions" ALTER COLUMN "last_seen_at" SET DEFAULT now(),
  ALTER COLUMN "last_seen_at" SET NOT NULL;