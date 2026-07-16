CREATE TABLE "class_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"title" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "gym_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"coach_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"day_of_week" varchar(12),
	"start_time" varchar(8),
	"duration" varchar(32),
	"capacity" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_gym_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."gym_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_translations" ADD CONSTRAINT "class_translations_class_id_gym_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."gym_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_classes" ADD CONSTRAINT "gym_classes_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ce_class_idx" ON "class_enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "ce_user_idx" ON "class_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ce_user_class_uniq" ON "class_enrollments" USING btree ("user_id","class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_tr_uniq" ON "class_translations" USING btree ("class_id","locale");--> statement-breakpoint
CREATE INDEX "gc_gym_idx" ON "gym_classes" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "gc_coach_idx" ON "gym_classes" USING btree ("coach_id");