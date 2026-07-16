CREATE TABLE "gym_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "reviews_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_reviews" ADD CONSTRAINT "gym_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gr_gym_idx" ON "gym_reviews" USING btree ("gym_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gr_user_gym_uniq" ON "gym_reviews" USING btree ("user_id","gym_id");