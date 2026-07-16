CREATE TABLE "session_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"date" varchar(32),
	"note" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "headline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "price_per_session" jsonb;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "rating" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "reviews_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "clients_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "gym_id" uuid;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD COLUMN "social_links" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sr_coach_idx" ON "session_requests" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "sr_client_idx" ON "session_requests" USING btree ("client_id");