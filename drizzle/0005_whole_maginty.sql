ALTER TABLE "tag" ADD COLUMN "targetEntityKind" "entity_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "area" DROP COLUMN "isLeaf";