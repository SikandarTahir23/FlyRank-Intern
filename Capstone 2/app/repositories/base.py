import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any
from app.config import get_settings


class DatabasePool:
    _pool: asyncpg.Pool | None = None

    @classmethod
    async def initialize(cls) -> None:
        settings = get_settings()
        cls._pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )

    @classmethod
    async def close(cls) -> None:
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    @asynccontextmanager
    async def acquire(cls) -> AsyncGenerator[asyncpg.Connection, None]:
        if cls._pool is None:
            await cls.initialize()
        async with cls._pool.acquire() as conn:
            yield conn


class BaseRepository:
    def __init__(self):
        self._pool = DatabasePool

    @asynccontextmanager
    async def _conn(self) -> AsyncGenerator[asyncpg.Connection, None]:
        async with self._pool.acquire() as conn:
            yield conn

    async def _execute(self, query: str, *args: Any) -> str:
        async with self._conn() as conn:
            return await conn.execute(query, *args)

    async def _fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        async with self._conn() as conn:
            return await conn.fetch(query, *args)

    async def _fetchrow(self, query: str, *args: Any) -> asyncpg.Record | None:
        async with self._conn() as conn:
            return await conn.fetchrow(query, *args)

    async def _fetchval(self, query: str, *args: Any) -> Any:
        async with self._conn() as conn:
            return await conn.fetchval(query, *args)