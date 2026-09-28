from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field, BeforeValidator, EmailStr, ConfigDict
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("studymate")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "studymate")]

JWT_SECRET = os.environ.get("JWT_SECRET", "studymate-secret-key-production-change-me")
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MAX_NOTE_CHARS = int(os.environ.get("MAX_NOTE_CHARS", "8000"))

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------------- Models ----------------
PyObjectId = Annotated[str, BeforeValidator(str)]


class UserPublic(BaseModel):
    id: PyObjectId
    email: str
    name: str
    created_at: Optional[str] = None
    token: Optional[str] = None


class RegisterBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class GenerateBody(BaseModel):
    input_text: str
    type: str  # summary | flashcards | quiz


# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=604800, path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")


# ---------------- AI ----------------
SYSTEM_PROMPTS = {
    "summary": (
        "You are StudyMate, an academic study assistant. Summarise the student's lecture notes. "
        "Return ONLY valid JSON (no markdown fences) with this exact shape: "
        '{"overview": "a short 2-3 sentence overview", '
        '"concepts": ["important concept 1", "important concept 2", ...], '
        '"key_points": ["key point 1", "key point 2", ...]}. '
        "Base everything strictly on the supplied material. Keep it concise and student-friendly."
    ),
    "flashcards": (
        "You are StudyMate, an academic study assistant. Create useful study flashcards from the notes. "
        "Return ONLY valid JSON (no markdown fences) with this exact shape: "
        '{"cards": [{"question": "front side question or term", "answer": "back side answer or explanation"}, ...]}. '
        "Create between 5 and 10 cards derived strictly from the supplied material."
    ),
    "quiz": (
        "You are StudyMate, an academic study assistant. Generate a short quiz from the notes. "
        "Return ONLY valid JSON (no markdown fences) with this exact shape: "
        '{"questions": [{"question": "the question text", '
        '"options": ["option A", "option B", "option C", "option D"], '
        '"correct_index": 0, "explanation": "why the answer is correct"}, ...]}. '
        "Create between 4 and 8 multiple-choice questions based primarily on the supplied material. "
        "correct_index is the zero-based index of the correct option."
    ),
}


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("`").strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in AI response")
    return json.loads(text[start:end + 1])


async def run_ai(gen_type: str, input_text: str) -> dict:
    if EMERGENT_LLM_KEY:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"studymate-{gen_type}",
            system_message=SYSTEM_PROMPTS[gen_type],
        ).with_model("anthropic", "claude-sonnet-4-6")
        resp = await chat.send_message(UserMessage(text=input_text))
        return _extract_json(resp if isinstance(resp, str) else str(resp))
    elif GEMINI_API_KEY:
        import asyncio
        import requests
        prompt = f"{SYSTEM_PROMPTS[gen_type]}\n\nStudent lecture notes:\n{input_text}"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        def _call_gemini():
            res = requests.post(url, json=payload, timeout=45)
            res.raise_for_status()
            return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        raw = await asyncio.to_thread(_call_gemini)
        return _extract_json(raw)
    elif OPENAI_API_KEY:
        import asyncio
        import requests
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPTS[gen_type]},
                {"role": "user", "content": input_text},
            ],
            "response_format": {"type": "json_object"},
        }
        def _call_openai():
            res = requests.post(url, headers=headers, json=payload, timeout=45)
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        raw = await asyncio.to_thread(_call_openai)
        return _extract_json(raw)
    else:
        raise ValueError("No AI API key found. Set EMERGENT_LLM_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in environment variables.")


# ---------------- Auth routes ----------------
@api_router.post("/auth/register", response_model=UserPublic)
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    token = create_access_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    return UserPublic(id=str(res.inserted_id), email=email, name=doc["name"], created_at=doc["created_at"], token=token)


@api_router.post("/auth/login", response_model=UserPublic)
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return UserPublic(id=str(user["_id"]), email=user["email"], name=user["name"], created_at=user.get("created_at"), token=token)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite="none", secure=True)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(id=str(user["_id"]), email=user["email"], name=user["name"], created_at=user.get("created_at"))


# ---------------- Generation routes ----------------
def serialize_generation(doc: dict, include_input: bool = True) -> dict:
    out = {
        "id": str(doc["_id"]),
        "type": doc["type"],
        "title": doc.get("title", ""),
        "result": doc["result"],
        "created_at": doc["created_at"],
    }
    if include_input:
        out["input_text"] = doc["input_text"]
    else:
        out["preview"] = doc["input_text"][:140]
    return out


def make_title(gen_type: str, input_text: str) -> str:
    label = {"summary": "Summary", "flashcards": "Flashcards", "quiz": "Quiz"}[gen_type]
    snippet = " ".join(input_text.strip().split())[:48]
    return f"{label}: {snippet}" if snippet else label


@api_router.post("/generate")
async def generate(body: GenerateBody, user: dict = Depends(get_current_user)):
    gen_type = body.type
    if gen_type not in SYSTEM_PROMPTS:
        raise HTTPException(status_code=400, detail="Unsupported action.")
    text = (body.input_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Please paste some notes before generating.")
    if len(text) > MAX_NOTE_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Your notes are {len(text)} characters. The limit is {MAX_NOTE_CHARS}. Please shorten them and try again.",
        )
    try:
        result = await run_ai(gen_type, text)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error(f"AI parse error: {e}")
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response. Please try again.")
    except Exception as e:
        logger.error(f"AI provider error: {e}")
        raise HTTPException(status_code=502, detail="We couldn't reach the AI service right now. Please try again in a moment.")

    doc = {
        "user_id": str(user["_id"]),
        "type": gen_type,
        "title": make_title(gen_type, text),
        "input_text": text,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.generations.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_generation(doc)


@api_router.get("/generations")
async def list_generations(user: dict = Depends(get_current_user)):
    cursor = db.generations.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return [serialize_generation(d, include_input=False) for d in docs]


@api_router.get("/generations/{gen_id}")
async def get_generation(gen_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(gen_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Generation not found.")
    doc = await db.generations.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Generation not found.")
    return serialize_generation(doc)


@api_router.delete("/generations/{gen_id}")
async def delete_generation(gen_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(gen_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Generation not found.")
    res = await db.generations.delete_one({"_id": oid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Generation not found.")
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "StudyMate API"}


app.include_router(api_router)

frontend_env = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [url.strip().rstrip("/") for url in frontend_env.split(",") if url.strip()]
if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https:\/\/.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.generations.create_index([("user_id", 1), ("created_at", -1)])


@app.on_event("shutdown")
async def shutdown():
    client.close()
