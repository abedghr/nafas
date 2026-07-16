ALTER TABLE "coach_profiles" DROP CONSTRAINT "coach_profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "active_sessions" DROP CONSTRAINT "active_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_templates" DROP CONSTRAINT "workout_templates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_email_purpose_idx" ON "otp_codes" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "rt_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "rt_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ebt_ex_idx" ON "exercise_body_targets" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ebt_ex_target_uniq" ON "exercise_body_targets" USING btree ("exercise_id","body_target");--> statement-breakpoint
CREATE INDEX "ewt_type_idx" ON "exercise_workout_types" USING btree ("workout_type_id");--> statement-breakpoint
CREATE INDEX "ex_name_idx" ON "exercises" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ex_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wl_user_date_idx" ON "workout_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "wl_user_name_idx" ON "workout_logs" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "wt_user_idx" ON "workout_templates" USING btree ("user_id");