CREATE TABLE "food_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL,
	"calories" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbody_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight" double precision,
	"muscle_mass" double precision,
	"body_fat" double precision,
	"body_water" double precision,
	"bmi" double precision,
	"bmr" double precision,
	"visceral_fat" double precision,
	"skeletal_muscle" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_protein" double precision DEFAULT 0 NOT NULL,
	"total_carbs" double precision DEFAULT 0 NOT NULL,
	"total_fat" double precision DEFAULT 0 NOT NULL,
	"total_calories" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_targets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"protein" integer DEFAULT 0 NOT NULL,
	"carbs" integer DEFAULT 0 NOT NULL,
	"fat" integer DEFAULT 0 NOT NULL,
	"calories" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_translations" ADD CONSTRAINT "food_translations_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbody_tests" ADD CONSTRAINT "inbody_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_days" ADD CONSTRAINT "nutrition_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_tr_uniq" ON "food_translations" USING btree ("food_id","locale");--> statement-breakpoint
CREATE INDEX "food_name_idx" ON "foods" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inbody_user_date_idx" ON "inbody_tests" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "nd_user_date_uniq" ON "nutrition_days" USING btree ("user_id","date");