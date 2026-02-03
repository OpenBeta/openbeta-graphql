CREATE TABLE "content" (
	"id" integer PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"language" varchar(2) DEFAULT 'EN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "entity_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"author" integer NOT NULL,
	"entity" integer NOT NULL,
	"editTime" timestamp DEFAULT now() NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"commitMessage" varchar(500)
);
--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_id_entity_id_fk" FOREIGN KEY ("id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entity_history" ADD CONSTRAINT "entity_history_author_user_id_fk" FOREIGN KEY ("author") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_history" ADD CONSTRAINT "entity_history_entity_entity_id_fk" FOREIGN KEY ("entity") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_history_author_index" ON "entity_history" USING btree ("author");--> statement-breakpoint
CREATE INDEX "entity_history_entity_index" ON "entity_history" USING btree ("entity");