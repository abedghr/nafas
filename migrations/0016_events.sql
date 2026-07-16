CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text,
	"description" text,
	"venue" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid,
	"owner_id" uuid,
	"type" varchar(16) DEFAULT 'tournament' NOT NULL,
	"category" varchar(48),
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"venue" text DEFAULT '' NOT NULL,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"capacity" integer DEFAULT 0 NOT NULL,
	"registered_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'upcoming' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ereg_event_idx" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ereg_user_idx" ON "event_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ereg_user_event_uniq" ON "event_registrations" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_tr_uniq" ON "event_translations" USING btree ("event_id","locale");--> statement-breakpoint
CREATE INDEX "event_country_idx" ON "events" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "event_starts_idx" ON "events" USING btree ("starts_at");