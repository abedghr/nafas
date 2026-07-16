CREATE TYPE "public"."body_target" AS ENUM('chest', 'shoulders_anterior', 'shoulders_lateral', 'shoulders_posterior', 'triceps', 'biceps', 'forearms', 'lats', 'upper_back', 'mid_back', 'lower_back', 'traps', 'erector_spinae', 'core_abs', 'core_deep', 'obliques', 'hip_flexors', 'glutes', 'hamstrings', 'quadriceps', 'adductors', 'calves', 'cardiovascular', 'flexibility', 'balance', 'endurance');--> statement-breakpoint
CREATE TYPE "public"."measurement_type" AS ENUM('reps', 'time_hold', 'distance_duration');--> statement-breakpoint
CREATE TABLE "active_sessions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_body_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"body_target" "body_target" NOT NULL,
	"percentage" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_workout_types" (
	"exercise_id" uuid NOT NULL,
	"workout_type_id" uuid NOT NULL,
	CONSTRAINT "exercise_workout_types_exercise_id_workout_type_id_pk" PRIMARY KEY("exercise_id","workout_type_id")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(96) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"measurement_type" "measurement_type" DEFAULT 'reps' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"name" varchar(96) NOT NULL,
	"workout_type_id" uuid,
	"date" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"pre_workout" boolean DEFAULT false NOT NULL,
	"total_volume_kg" numeric DEFAULT '0' NOT NULL,
	"total_sets" integer DEFAULT 0 NOT NULL,
	"completed_sets" integer DEFAULT 0 NOT NULL,
	"skipped_sets" integer DEFAULT 0 NOT NULL,
	"total_reps" integer DEFAULT 0 NOT NULL,
	"ai_insight" text DEFAULT '' NOT NULL,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(96) NOT NULL,
	"workout_type_id" uuid,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(64) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_body_targets" ADD CONSTRAINT "exercise_body_targets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_workout_types" ADD CONSTRAINT "exercise_workout_types_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_workout_types" ADD CONSTRAINT "exercise_workout_types_workout_type_id_workout_types_id_fk" FOREIGN KEY ("workout_type_id") REFERENCES "public"."workout_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workout_type_id_workout_types_id_fk" FOREIGN KEY ("workout_type_id") REFERENCES "public"."workout_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_workout_type_id_workout_types_id_fk" FOREIGN KEY ("workout_type_id") REFERENCES "public"."workout_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_types" ADD CONSTRAINT "workout_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;