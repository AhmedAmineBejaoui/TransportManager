import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const databaseUrl = process.env.DATABASE_URL;
export const hasDatabase = Boolean(databaseUrl);

if (!hasDatabase) {
  console.warn(
    "[db] DATABASE_URL manquante : les routes API nécessitant la base seront désactivées. Ajoutez DATABASE_URL à votre fichier .env pour réactiver les fonctionnalités complètes.",
  );
}

// Un pool est toujours instancié pour satisfaire les dépendances de drizzle,
// mais il n'est utilisé que lorsque DATABASE_URL est fourni.
export const pool = hasDatabase
  ? new Pool({
      connectionString: databaseUrl,
    })
  : undefined;

export const db = (pool ? drizzle(pool) : null) as unknown as ReturnType<typeof drizzle>;

