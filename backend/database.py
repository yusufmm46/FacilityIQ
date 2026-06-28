import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

_raw_url = os.getenv("SUPABASE_DB_URL", "")

# Convert postgresql:// to postgresql+asyncpg:// and URL-encode password
def _build_async_url(raw: str) -> str:
    if not raw:
        raise ValueError("SUPABASE_DB_URL not set in .env")
    if raw.startswith("postgresql+asyncpg://"):
        return raw
    raw = raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    # URL-encode the @ in the password (between : and @host)
    # Format: postgresql+asyncpg://user:password@host/db
    prefix = "postgresql+asyncpg://"
    rest = raw[len(prefix):]
    user_pass, host_rest = rest.split("@", 1)
    # Find last @ that separates credentials from host
    # user_pass might contain @ if password has it
    parts = rest.split("@")
    host_rest = parts[-1]
    user_pass = "@".join(parts[:-1])
    user, password = user_pass.split(":", 1)
    return f"{prefix}{user}:{quote_plus(password)}@{host_rest}"

ASYNC_DB_URL = _build_async_url(_raw_url)

# When running behind Supabase's transaction pooler (Supavisor, port 6543),
# server-side prepared statements are not supported. Disable asyncpg's
# statement cache and give prepared statements unique names so the pooler
# doesn't choke. Safe to leave on for direct/session connections too.
_is_pooler = "pooler.supabase.com" in ASYNC_DB_URL

_connect_args = {}
if _is_pooler:
    import uuid as _uuid
    _connect_args = {
        # Disable asyncpg's prepared-statement cache (unsupported in tx pooler)
        "statement_cache_size": 0,
        # Unique prepared-statement names so pooled backends never collide
        "prepared_statement_name_func": lambda: f"__asyncpg_{_uuid.uuid4()}__",
    }

engine = create_async_engine(
    ASYNC_DB_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    import models as _models  # noqa: F401 — registers all ORM classes
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
