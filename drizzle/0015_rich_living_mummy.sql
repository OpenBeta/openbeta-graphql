ALTER TABLE "grade_system" DROP CONSTRAINT "grade_system_name_unique";--> statement-breakpoint
ALTER TABLE "climb" ADD COLUMN "canonicalGradeUpper" integer;--> statement-breakpoint
ALTER TABLE "climb" ADD CONSTRAINT "climb_canonicalGradeUpper_grade_id_fk" FOREIGN KEY ("canonicalGradeUpper") REFERENCES "public"."grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_system" DROP COLUMN "discipline";--> statement-breakpoint
ALTER TABLE "grade_system" ADD CONSTRAINT "grade_system_name_unique" UNIQUE("name");