import os
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

app = FastAPI(title="BoardIQ API")


def configured_value(value: str | None) -> bool:
    """Return False for empty values and the common placeholder values in .env files."""
    if not value:
        return False

    normalized = value.strip().lower()
    return normalized not in {
        "",
        "your_supabase_url",
        "your_supabase_key",
        "paste-your-supabase-url-here",
        "paste-your-anon-key-here",
    }


SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()


def create_supabase_client() -> Client | None:
    """Create the official client only when usable credentials are available.

    Example query for a feature route:
        client = get_supabase_client()
        result = client.table("projects").select("*").limit(20).execute()
        return result.data
    """
    if not (configured_value(SUPABASE_URL) and configured_value(SUPABASE_KEY)):
        return None

    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        # A malformed URL/key should not prevent the workshop starter from booting.
        return None


supabase: Client | None = create_supabase_client()


def get_supabase_client() -> Client:
    if supabase is None:
        raise RuntimeError("Supabase is not configured. Add SUPABASE_URL and SUPABASE_KEY to .env.")
    return supabase


def cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "*")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()] or ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "Hello from the BoardIQ backend!"}


@app.get("/health")
async def health() -> dict[str, Any]:
    """Report app health and distinguish missing Supabase setup from a connectivity issue."""
    database: dict[str, str | bool] = {
        "configured": supabase is not None,
        "reachable": False,
        "message": "Add SUPABASE_URL and SUPABASE_KEY to .env to connect a database.",
    }

    if supabase is not None:
        try:
            # The PostgREST root is available in every Supabase project and does not
            # assume that a workshop participant has created a table yet.
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{SUPABASE_URL.rstrip('/')}/rest/v1/",
                    headers={"apikey": SUPABASE_KEY},
                )
            if response.is_success:
                database.update(reachable=True, message="Supabase is connected.")
            else:
                database["message"] = "Supabase responded, but rejected the connection details."
        except httpx.HTTPError:
            database["message"] = "Supabase could not be reached. Check the URL, key, and internet connection."

    return {
        "status": "ok",
        "backend": {"running": True},
        "supabase": database,
    }
