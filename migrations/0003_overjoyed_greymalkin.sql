CREATE TABLE "exercise_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "workout_type_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_type_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grp" varchar(48) NOT NULL,
	"key" varchar(64) NOT NULL,
	"locale" varchar(5) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(5) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"native_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_translations" ADD CONSTRAINT "exercise_translations_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_type_translations" ADD CONSTRAINT "workout_type_translations_workout_type_id_workout_types_id_fk" FOREIGN KEY ("workout_type_id") REFERENCES "public"."workout_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ex_tr_uniq" ON "exercise_translations" USING btree ("exercise_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "wt_tr_uniq" ON "workout_type_translations" USING btree ("workout_type_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_grp_key_locale_uniq" ON "labels" USING btree ("grp","key","locale");--> statement-breakpoint
CREATE INDEX "labels_grp_locale_idx" ON "labels" USING btree ("grp","locale");