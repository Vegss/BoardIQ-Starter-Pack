from fastapi import FastAPI

app = FastAPI(title="BoardIQ API")


@app.get("/api/hello")
async def hello() -> dict[str, str]:
    return {"message": "Hello from the BoardIQ backend!"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
