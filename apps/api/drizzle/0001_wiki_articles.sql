CREATE TABLE "wiki_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_content" jsonb NOT NULL,
	"published_content" jsonb,
	"revision" integer DEFAULT 1 NOT NULL,
	"published_revision" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
