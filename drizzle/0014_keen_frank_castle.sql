ALTER TABLE "grade" ADD COLUMN "pegValueLow" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_value_peg_low" UNIQUE("system","pegValueLow");