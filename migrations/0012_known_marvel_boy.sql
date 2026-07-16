CREATE TABLE "coach_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"name" text NOT NULL,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration" varchar(64),
	"price" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_transformations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"before_image" text,
	"after_image" text,
	"duration" varchar(64),
	"target" varchar(96),
	"client_name" varchar(96),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "whatsapp" varchar(32);--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "whatsapp" varchar(32);--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "head_coach_id" uuid;--> statement-breakpoint
ALTER TABLE "session_requests" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "coach_plans" ADD CONSTRAINT "coach_plans_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_transformations" ADD CONSTRAINT "coach_transformations_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cp_coach_idx" ON "coach_plans" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "ct_coach_idx" ON "coach_transformations" USING btree ("coach_id");