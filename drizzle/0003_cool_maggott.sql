DROP INDEX "uuid_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "uuid_idx" ON "entity" USING btree ("uuid");