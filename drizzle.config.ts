import type { Config } from 'drizzle-kit'
import 'dotenv/config';

export default {
	schema: './src/db/schema/*',
	out: './src/db/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DB_URL || process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
	},
	verbose: true,
	strict: true,
} satisfies Config