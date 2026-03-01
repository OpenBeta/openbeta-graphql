ALTER TABLE "tick" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "single_peg_index" ON "grade_peg_table" USING btree ("peg");--> statement-breakpoint
CREATE INDEX "grade_id_idx" ON "grade_peg_table" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "system_id_idx" ON "grade_peg_table" USING btree ("system");--> statement-breakpoint
CREATE INDEX "grade_system_index" ON "grade" USING btree ("system");--> statement-breakpoint
CREATE INDEX "grade_value_index" ON "grade" USING btree ("value");