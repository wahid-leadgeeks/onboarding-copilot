CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"row_number" integer NOT NULL,
	"week" text NOT NULL,
	"day" text NOT NULL,
	"date" text NOT NULL,
	"activity_count" integer,
	"pic" text NOT NULL,
	"topic" text NOT NULL,
	"main_media" text NOT NULL,
	"duration_minutes" integer,
	"start_time" text,
	"end_time" text,
	"progress" text DEFAULT '',
	"materials_link" text DEFAULT '',
	"notes" text DEFAULT '',
	"actual_start" text,
	"actual_end" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"row_number" integer NOT NULL,
	"learned" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "diary_entries_row_number_unique" UNIQUE("row_number")
);
--> statement-breakpoint
CREATE TABLE "diary_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"row_number" integer NOT NULL,
	"day" text NOT NULL,
	"week" text NOT NULL,
	"date" text NOT NULL,
	"activity_count" text,
	"pic" text NOT NULL,
	"topic" text NOT NULL,
	"default_learned" text,
	"default_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"date" text,
	"pic" text,
	"topic" text,
	"ratings" jsonb,
	"has_questions" boolean DEFAULT false,
	"question_explanation" text DEFAULT '',
	"question_addressing" text DEFAULT '',
	"suggestions" text DEFAULT '',
	"updated_at" text NOT NULL,
	CONSTRAINT "feedback_entries_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"pic" text NOT NULL,
	"row_number" integer NOT NULL,
	"department" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"achievements" text DEFAULT '' NOT NULL,
	"challenges" text DEFAULT '' NOT NULL,
	"goals_next_month" text DEFAULT '' NOT NULL,
	"technical_ratings" jsonb,
	"values_ratings" jsonb,
	"updated_at" text NOT NULL,
	CONSTRAINT "monthly_reviews_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "session_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"name" text NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint NOT NULL,
	"duration_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"stage_number" text NOT NULL,
	"stage_name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"objective" text NOT NULL,
	"key_activities" text NOT NULL,
	"outputs_evidence" text NOT NULL,
	"minimum_duration" text NOT NULL,
	"completed_evidence" jsonb,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "training_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"pic" text NOT NULL,
	"objectives" text NOT NULL,
	"framework_materials" text NOT NULL,
	"materials" text NOT NULL,
	"media" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"material_access" text,
	"material_links" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
