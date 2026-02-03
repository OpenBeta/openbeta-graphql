ALTER TABLE "media" RENAME COLUMN "userId" TO "author";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "mediaUrl" SET DATA TYPE varchar(2000);--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_author_user_id_fk" FOREIGN KEY ("author") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_idx" ON "entity" USING btree ("parent");--> statement-breakpoint
CREATE INDEX "uuid_idx" ON "entity" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "entity_kind_idx" ON "entity" USING btree ("entityType");--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "uploadTime";