CREATE TABLE "gym_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"rating" double precision DEFAULT 0 NOT NULL,
	"phone" varchar(32),
	"working_hours" varchar(128),
	"member_count" integer DEFAULT 0 NOT NULL,
	"types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"facilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subscriptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gym_translations" ADD CONSTRAINT "gym_translations_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gyms" ADD CONSTRAINT "gyms_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gym_tr_uniq" ON "gym_translations" USING btree ("gym_id","locale");--> statement-breakpoint
CREATE INDEX "gym_country_idx" ON "gyms" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "gym_name_idx" ON "gyms" USING btree ("name");