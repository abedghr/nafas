CREATE TABLE "gym_membership_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" varchar(64),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "gym_membership_requests" ADD CONSTRAINT "gym_membership_requests_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_membership_requests" ADD CONSTRAINT "gym_membership_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gmr_gym_idx" ON "gym_membership_requests" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "gmr_user_idx" ON "gym_membership_requests" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "gyms" ADD CONSTRAINT "gyms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;