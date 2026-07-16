CREATE TABLE "gym_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(64),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gm_gym_idx" ON "gym_memberships" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "gm_user_idx" ON "gym_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gm_user_gym_uniq" ON "gym_memberships" USING btree ("user_id","gym_id");