CREATE TABLE "gym_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(16) DEFAULT 'manager' NOT NULL,
	"added_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gym_team" ADD CONSTRAINT "gym_team_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_team" ADD CONSTRAINT "gym_team_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gt_gym_idx" ON "gym_team" USING btree ("gym_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gt_user_gym_uniq" ON "gym_team" USING btree ("user_id","gym_id");