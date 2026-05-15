CREATE TYPE "public"."testament" AS ENUM('OT', 'NT');--> statement-breakpoint
CREATE TABLE "books" (
	"translation_id" varchar NOT NULL,
	"book_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"testament" "testament" NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "books_translation_id_book_id_pk" PRIMARY KEY("translation_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"abbreviation" varchar NOT NULL,
	"name" varchar NOT NULL,
	"language" varchar NOT NULL,
	"copyright" text NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_id" varchar NOT NULL,
	"book_id" varchar NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"reference" varchar NOT NULL,
	"text" text NOT NULL,
	"text_search" "tsvector",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verses_translation_reference_unique" UNIQUE("translation_id","reference")
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verses_text_search_gin_idx" ON "verses" USING gin ("text_search");