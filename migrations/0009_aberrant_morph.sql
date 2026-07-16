CREATE TABLE "reservation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" varchar(32),
	"party_size" integer DEFAULT 1 NOT NULL,
	"note" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid,
	"owner_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"address" text DEFAULT '' NOT NULL,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"rating" double precision DEFAULT 0 NOT NULL,
	"phone" varchar(32),
	"working_hours" varchar(128),
	"price_range" varchar(8),
	"cuisines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"menu" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservation_requests" ADD CONSTRAINT "reservation_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_requests" ADD CONSTRAINT "reservation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_translations" ADD CONSTRAINT "restaurant_translations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rr_rest_idx" ON "reservation_requests" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "rr_user_idx" ON "reservation_requests" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rest_tr_uniq" ON "restaurant_translations" USING btree ("restaurant_id","locale");--> statement-breakpoint
CREATE INDEX "rest_country_idx" ON "restaurants" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "rest_name_idx" ON "restaurants" USING btree ("name");