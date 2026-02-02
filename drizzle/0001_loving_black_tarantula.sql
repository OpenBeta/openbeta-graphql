ALTER TYPE "public"."climbing_discipline" ADD VALUE 'top_rope' BEFORE 'trad';--> statement-breakpoint
CREATE TABLE "area_grade_context" (
	"area" integer NOT NULL,
	"context" integer NOT NULL,
	CONSTRAINT "duplicate_grade_context" UNIQUE("area","context")
);
--> statement-breakpoint
ALTER TABLE "climb" ALTER COLUMN "type" SET DATA TYPE "public"."climbing_discipline" USING "type"::"public"."climbing_discipline";--> statement-breakpoint
ALTER TABLE "climb" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "area_grade_context" ADD CONSTRAINT "area_grade_context_area_area_id_fk" FOREIGN KEY ("area") REFERENCES "public"."area"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_grade_context" ADD CONSTRAINT "area_grade_context_context_grade_system_id_fk" FOREIGN KEY ("context") REFERENCES "public"."grade_system"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area" DROP COLUMN "gradeContext";