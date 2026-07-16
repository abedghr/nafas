CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icon" varchar(48) DEFAULT 'checkmark-circle-outline' NOT NULL,
	"logo_url" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"title" text,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "facility_translations" ADD CONSTRAINT "facility_translations_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_tr_uniq" ON "facility_translations" USING btree ("facility_id","locale");