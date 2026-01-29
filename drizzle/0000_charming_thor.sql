CREATE TYPE "public"."climb_safety_enum" AS ENUM('UNSPECIFIED', 'PG', 'PG13', 'runout', 'terrain', 'R', 'X');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('area', 'climb', 'pitch', 'content');--> statement-breakpoint
CREATE TYPE "public"."climbing_discipline" AS ENUM('bouldering', 'sport', 'trad', 'dws', 'ice', 'aid');--> statement-breakpoint
CREATE TYPE "public"."tick_attempt_type" AS ENUM('Onsight', 'Flash', 'Pinkpoint', 'Frenchfree', 'Attempt', 'Send', 'Redpoint', 'Repeat');--> statement-breakpoint
CREATE TYPE "public"."tick_source" AS ENUM('OB', 'MP');--> statement-breakpoint
CREATE TYPE "public"."tick_style" AS ENUM('Lead', 'Solo', 'TR', 'Follow', 'Aid', 'Boulder');--> statement-breakpoint
CREATE TABLE "area" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"shortCode" varchar(50),
	"gradeContext" varchar(50) NOT NULL,
	"density" real DEFAULT 0 NOT NULL,
	"totalClimbs" integer DEFAULT 0 NOT NULL,
	"imageByteSum" integer DEFAULT 0 NOT NULL,
	"isLeaf" boolean DEFAULT true NOT NULL,
	"isDestination" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climb" (
	"id" integer PRIMARY KEY NOT NULL,
	"fa" varchar(255),
	"length" integer NOT NULL,
	"boltsCount" integer,
	"type" jsonb NOT NULL,
	"safety" "climb_safety_enum",
	"canonicalGrade" integer
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "entity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"entityType" "entity_type" NOT NULL,
	"name" varchar(255),
	"created" timestamp DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"parent" integer,
	CONSTRAINT "no_entity_self_reference" CHECK ("entity"."parent" is null or "entity"."id" != "entity"."parent")
);
--> statement-breakpoint
CREATE TABLE "grade_peg_table" (
	"system" integer NOT NULL,
	"grade" integer NOT NULL,
	"peg" integer NOT NULL,
	CONSTRAINT "grade_peg_table_system_grade_pk" PRIMARY KEY("system","grade")
);
--> statement-breakpoint
CREATE TABLE "grade_system" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grade_system_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"discipline" "climbing_discipline" NOT NULL,
	CONSTRAINT "grade_system_name_unique" UNIQUE("name","discipline")
);
--> statement-breakpoint
CREATE TABLE "grade" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grade_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"system" integer NOT NULL,
	"value" varchar(50) NOT NULL,
	CONSTRAINT "grade_value_duplicate" UNIQUE("system","value")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" integer,
	"username" varchar(50),
	"mediaUrl" varchar(500) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"format" varchar(10) NOT NULL,
	"size" integer NOT NULL,
	"uploadTime" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"orgId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"orgType" varchar(50) NOT NULL,
	"associatedAreaIds" uuid,
	"excludedAreaIds" uuid,
	"displayName" varchar(255) NOT NULL,
	"content" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" uuid,
	CONSTRAINT "organization_orgId_unique" UNIQUE("orgId")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tag_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"mediaId" integer,
	"targetId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tick" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tick_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"name" varchar(255) NOT NULL,
	"notes" text,
	"climbId" varchar(255) NOT NULL,
	"style" "tick_style",
	"attemptType" "tick_attempt_type",
	"dateClimbed" timestamp NOT NULL,
	"grade" varchar(50),
	"source" "tick_source" DEFAULT 'OB' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"displayName" varchar(255),
	"bio" text,
	"website" varchar(500),
	"email" varchar(255) NOT NULL,
	"avatar" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "area" ADD CONSTRAINT "area_id_entity_id_fk" FOREIGN KEY ("id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "climb" ADD CONSTRAINT "climb_id_entity_id_fk" FOREIGN KEY ("id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "climb" ADD CONSTRAINT "climb_canonicalGrade_grade_id_fk" FOREIGN KEY ("canonicalGrade") REFERENCES "public"."grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity" ADD CONSTRAINT "entity_parent_entity_id_fk" FOREIGN KEY ("parent") REFERENCES "public"."entity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_peg_table" ADD CONSTRAINT "grade_peg_table_system_grade_system_id_fk" FOREIGN KEY ("system") REFERENCES "public"."grade_system"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_peg_table" ADD CONSTRAINT "grade_peg_table_grade_grade_id_fk" FOREIGN KEY ("grade") REFERENCES "public"."grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_system_grade_system_id_fk" FOREIGN KEY ("system") REFERENCES "public"."grade_system"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_mediaId_media_id_fk" FOREIGN KEY ("mediaId") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_targetId_entity_id_fk" FOREIGN KEY ("targetId") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tick" ADD CONSTRAINT "tick_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;