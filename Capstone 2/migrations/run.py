import asyncio
import asyncpg
from pathlib import Path
from app.config import get_settings


async def run_migrations():
    settings = get_settings()
    conn = await asyncpg.connect(settings.database_url)

    migration_files = sorted(Path(__file__).parent.glob("*.sql"))

    for migration_file in migration_files:
        print(f"Applying {migration_file.name}...")
        sql = migration_file.read_text()
        await conn.execute(sql)
        print(f"  ✓ {migration_file.name}")

    await conn.close()
    print("All migrations applied successfully!")


if __name__ == "__main__":
    asyncio.run(run_migrations())