ALTER TYPE "public"."entity_type" ADD VALUE 'organization';--> statement-breakpoint
CREATE TABLE "organization_area" (
	"organization_id" integer NOT NULL,
	"area_id" integer NOT NULL,
	"is_exclusion" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_area_organization_id_area_id_pk" PRIMARY KEY("organization_id","area_id")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_orgId_unique";--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "tick" ADD COLUMN "climb" integer;--> statement-breakpoint
ALTER TABLE "organization_area" ADD CONSTRAINT "organization_area_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_area" ADD CONSTRAINT "organization_area_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_id_entity_id_fk" FOREIGN KEY ("id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tick" ADD CONSTRAINT "tick_climb_climb_id_fk" FOREIGN KEY ("climb") REFERENCES "public"."climb"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "orgId";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "associatedAreaIds";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "excludedAreaIds";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "updatedBy";