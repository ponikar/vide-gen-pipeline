import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const connection = neon(process.env.POSTGRES_URL!);
export const db = drizzle(connection, { schema });
export { schema };
