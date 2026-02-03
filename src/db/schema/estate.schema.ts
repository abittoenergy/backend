import { AnyPgColumn, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const estate = pgTable("estate", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  createdBy: uuid("created_by").notNull().references((): AnyPgColumn => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  index("estate_id_idx").on(t.id),
  uniqueIndex("estate_longitude_latitude_idx").on(t.longitude, t.latitude),
]);

export type Estate = typeof estate.$inferSelect;
export type NewEstate = typeof estate.$inferInsert;
