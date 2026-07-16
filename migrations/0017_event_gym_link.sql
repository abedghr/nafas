ALTER TABLE "gym_classes" ALTER COLUMN "gym_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gym_classes" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "gym_id" uuid;--> statement-breakpoint
CREATE INDEX "gc_event_idx" ON "gym_classes" USING btree ("event_id");