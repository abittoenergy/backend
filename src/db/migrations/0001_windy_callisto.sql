ALTER TABLE "meters" ADD COLUMN "meter_number" varchar(50);--> statement-breakpoint
CREATE INDEX "meters_meter_number_index" ON "meters" USING btree ("meter_number");--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_meter_number_unique" UNIQUE("meter_number");