from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
import io
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

# Email service imports
from services.email import (
    send_payment_submitted_email,
    send_payment_approved_email,
    send_payment_rejected_email
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'kantik-tracks-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Kantik Tracks Studio API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    displayName: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    displayName: str
    plan: Literal["FREE", "STANDARD", "TEAM"] = "FREE"
    planExpiresAt: Optional[str] = None
    graceUntil: Optional[str] = None
    teamId: Optional[str] = None
    roleInTeam: Optional[Literal["OWNER", "ADMIN", "MEMBER"]] = None
    role: Literal["USER", "ADMIN"] = "USER"
    isAdmin: bool = False  # Keep for backward compatibility
    createdAt: str

class UserAdminUpdate(BaseModel):
    role: Optional[Literal["USER", "ADMIN"]] = None
    plan: Optional[Literal["FREE", "STANDARD", "TEAM"]] = None
    planExpiresAt: Optional[str] = None
    graceUntil: Optional[str] = None

class SongCreate(BaseModel):
    number: int
    title: str
    language: Literal["fr", "ht"] = "fr"
    keyOriginal: Optional[str] = None
    tempo: Optional[int] = None
    tags: List[str] = []
    accessTier: Literal["STANDARD", "PREMIUM"] = "STANDARD"

class SongUpdate(BaseModel):
    number: Optional[int] = None
    title: Optional[str] = None
    language: Optional[Literal["fr", "ht"]] = None
    keyOriginal: Optional[str] = None
    tempo: Optional[int] = None
    tags: Optional[List[str]] = None
    accessTier: Optional[Literal["STANDARD", "PREMIUM"]] = None
    active: Optional[bool] = None

class SongResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    number: int
    title: str
    language: str
    keyOriginal: Optional[str] = None
    tempo: Optional[int] = None
    tags: List[str] = []
    accessTier: str
    active: bool = True
    createdAt: str
    updatedAt: str
    downloadsCount: int = 0
    favoritesCount: int = 0
    resources: List[dict] = []

class PlaylistCreate(BaseModel):
    name: str
    ownerType: Literal["USER", "TEAM"] = "USER"

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    songIds: Optional[List[str]] = None

class PlaylistResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    ownerType: str
    ownerId: str
    songIds: List[str] = []
    createdAt: str
    updatedAt: str

class TeamCreate(BaseModel):
    name: str

class TeamInvite(BaseModel):
    email: EmailStr
    role: Literal["ADMIN", "MEMBER"] = "MEMBER"

class TeamResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    ownerUid: str
    maxMembers: int = 7
    members: List[dict] = []
    createdAt: str

class PaymentCreate(BaseModel):
    planRequested: Literal["STANDARD", "TEAM"]
    provider: Literal["MONCASH", "BANK_TRANSFER"]
    bankName: Optional[str] = None
    amount: float
    currency: Literal["HTG", "USD"] = "HTG"
    billingMonth: str  # YYYY-MM format
    reference: str

class PaymentReview(BaseModel):
    decision: Literal["APPROVED", "REJECTED"]
    note: Optional[str] = None

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    uid: str
    userEmail: Optional[str] = None
    teamId: Optional[str] = None
    planRequested: str
    provider: str
    bankName: Optional[str] = None
    amount: float
    currency: str
    billingMonth: str
    reference: str
    receiptPath: Optional[str] = None
    status: str
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None
    note: Optional[str] = None
    createdAt: str

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        return user
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await require_auth(credentials)
    # Check both role field and legacy isAdmin field
    if user.get("role") != "ADMIN" and not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def is_plan_active(user: dict) -> bool:
    """Check if user's plan is active (not expired or within grace period)"""
    if user.get("plan") == "FREE":
        return True
    
    expires_at = user.get("planExpiresAt")
    grace_until = user.get("graceUntil")
    now = datetime.now(timezone.utc).isoformat()
    
    if expires_at and expires_at >= now:
        return True
    if grace_until and grace_until >= now:
        return True
    return False

def can_download(user: dict, access_tier: str) -> bool:
    """Check if user can download a song based on their plan and song tier"""
    if not is_plan_active(user):
        return False
    
    plan = user.get("plan", "FREE")
    if plan == "FREE":
        return False
    if plan == "STANDARD" and access_tier == "PREMIUM":
        return False
    return True

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "displayName": data.displayName,
        "plan": "FREE",
        "planExpiresAt": None,
        "graceUntil": None,
        "teamId": None,
        "roleInTeam": None,
        "role": "USER",
        "isAdmin": False,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id, data.email)
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return {"token": token, "user": user_response}

@api_router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user.get("isAdmin", False))
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return {"token": token, "user": user_response}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    return user

# ============ SONGS ROUTES ============

@api_router.get("/songs", response_model=List[SongResponse])
async def get_songs(
    search: Optional[str] = None,
    language: Optional[str] = None,
    accessTier: Optional[str] = None,
    tags: Optional[str] = None,
    sort: Optional[str] = "number"
):
    query = {"active": True}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"number": {"$regex": search, "$options": "i"} if not search.isdigit() else int(search)}
        ]
        if search.isdigit():
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"number": int(search)}
            ]
    
    if language:
        query["language"] = language
    
    if accessTier:
        query["accessTier"] = accessTier
    
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    sort_field = "number" if sort == "number" else "downloadsCount" if sort == "popular" else "createdAt"
    sort_order = -1 if sort in ["popular", "newest"] else 1
    
    songs = await db.songs.find(query, {"_id": 0}).sort(sort_field, sort_order).to_list(1000)
    
    # Attach resources to each song
    for song in songs:
        resources = await db.resources.find({"songId": song["id"]}, {"_id": 0}).to_list(100)
        song["resources"] = resources
    
    return songs

@api_router.get("/songs/featured", response_model=List[SongResponse])
async def get_featured_songs():
    songs = await db.songs.find({"active": True}, {"_id": 0}).sort("downloadsCount", -1).limit(6).to_list(6)
    for song in songs:
        resources = await db.resources.find({"songId": song["id"]}, {"_id": 0}).to_list(100)
        song["resources"] = resources
    return songs

@api_router.get("/songs/{song_id}", response_model=SongResponse)
async def get_song(song_id: str):
    song = await db.songs.find_one({"id": song_id, "active": True}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    resources = await db.resources.find({"songId": song_id}, {"_id": 0}).to_list(100)
    song["resources"] = resources
    
    return song

@api_router.post("/songs", response_model=SongResponse)
async def create_song(data: SongCreate, user: dict = Depends(require_admin)):
    title_slug = data.title.lower().replace(' ', '-').replace(',', '').replace("'", '')[:40]
    song_id = f"{data.number:02d}-{title_slug}"
    now = datetime.now(timezone.utc).isoformat()
    
    song = {
        "id": song_id,
        **data.model_dump(),
        "active": True,
        "createdAt": now,
        "updatedAt": now,
        "downloadsCount": 0,
        "favoritesCount": 0
    }
    
    await db.songs.insert_one(song)
    song["resources"] = []
    return {k: v for k, v in song.items() if k != "_id"}

@api_router.put("/songs/{song_id}", response_model=SongResponse)
async def update_song(song_id: str, data: SongUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.songs.update_one({"id": song_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    resources = await db.resources.find({"songId": song_id}, {"_id": 0}).to_list(100)
    song["resources"] = resources
    return song

@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, user: dict = Depends(require_admin)):
    result = await db.songs.update_one({"id": song_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Song deleted"}

# ============ RESOURCES ROUTES ============

# ============ PDF PREVIEW GENERATION ============

def generate_pdf_preview(pdf_data: bytes, add_watermark: bool = True) -> bytes:
    """
    Generate a preview image from the first page of a PDF.
    Returns JPEG image bytes.
    """
    try:
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_data, filetype="pdf")
        
        # Get first page
        page = pdf_document[0]
        
        # Render page to image at 150 DPI for good quality
        # Calculate zoom to get approximately 1000px width
        zoom = 1000 / page.rect.width
        matrix = fitz.Matrix(zoom, zoom)
        
        # Render to pixmap
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        
        # Convert to PIL Image
        img = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
        
        # Add watermark if requested
        if add_watermark:
            draw = ImageDraw.Draw(img)
            watermark_text = "PREVIEW"
            
            # Calculate font size based on image width
            font_size = int(img.width / 8)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            # Get text bounding box
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Position text in center
            x = (img.width - text_width) / 2
            y = (img.height - text_height) / 2
            
            # Draw semi-transparent watermark (gray with low opacity effect)
            draw.text((x, y), watermark_text, font=font, fill=(200, 200, 200, 80))
        
        # Convert to JPEG bytes
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=80)
        output.seek(0)
        
        pdf_document.close()
        return output.getvalue()
        
    except Exception as e:
        logging.error(f"Failed to generate PDF preview: {e}")
        return None

async def save_preview_resource(song_id: str, preview_data: bytes):
    """Save the generated preview as a resource in the database."""
    resource_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resource = {
        "id": resource_id,
        "songId": song_id,
        "type": "PREVIEW_IMAGE",
        "filename": "preview.jpg",
        "contentType": "image/jpeg",
        "data": base64.b64encode(preview_data).decode(),
        "autoGenerated": True,
        "updatedAt": now
    }
    
    # Remove existing auto-generated preview
    await db.resources.delete_many({"songId": song_id, "type": "PREVIEW_IMAGE", "autoGenerated": True})
    await db.resources.insert_one(resource)
    
    logging.info(f"Auto-generated preview saved for song {song_id}")

# ============ RESOURCES ROUTES ============

@api_router.post("/songs/{song_id}/resources")
async def upload_resource(
    song_id: str,
    background_tasks: BackgroundTasks,
    resourceType: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Store file as base64 in MongoDB for MVP (in production, use cloud storage)
    content = await file.read()
    resource_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    resource = {
        "id": resource_id,
        "songId": song_id,
        "type": resourceType,
        "filename": file.filename,
        "contentType": file.content_type,
        "data": base64.b64encode(content).decode(),
        "updatedAt": now
    }
    
    # Remove existing resource of same type
    await db.resources.delete_many({"songId": song_id, "type": resourceType})
    await db.resources.insert_one(resource)
    
    # If this is a CHORDS_PDF, automatically generate preview
    if resourceType == "CHORDS_PDF":
        # Generate preview synchronously for immediate feedback
        preview_data = generate_pdf_preview(content, add_watermark=True)
        if preview_data:
            await save_preview_resource(song_id, preview_data)
            return {
                "message": "Resource uploaded and preview generated", 
                "id": resource_id,
                "previewGenerated": True
            }
    
    return {"message": "Resource uploaded", "id": resource_id, "previewGenerated": False}

# Public endpoint for preview images (no auth required)
@api_router.get("/songs/{song_id}/preview")
async def get_preview_image(song_id: str):
    """
    Public endpoint to get preview image for a song.
    This allows the preview to be displayed without authentication.
    """
    song = await db.songs.find_one({"id": song_id, "active": True})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    resource = await db.resources.find_one(
        {"songId": song_id, "type": "PREVIEW_IMAGE"}, 
        {"_id": 0}
    )
    
    if not resource:
        raise HTTPException(status_code=404, detail="Preview not available")
    
    # Decode and return image
    image_data = base64.b64decode(resource["data"])
    return Response(
        content=image_data,
        media_type=resource.get("contentType", "image/jpeg"),
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": f"inline; filename={resource.get('filename', 'preview.jpg')}"
        }
    )

# Check if preview exists for a song
@api_router.get("/songs/{song_id}/preview/status")
async def get_preview_status(song_id: str):
    """Check if a preview exists for a song."""
    resource = await db.resources.find_one(
        {"songId": song_id, "type": "PREVIEW_IMAGE"}, 
        {"_id": 0, "data": 0}
    )
    
    return {
        "hasPreview": resource is not None,
        "autoGenerated": resource.get("autoGenerated", False) if resource else False,
        "updatedAt": resource.get("updatedAt") if resource else None
    }

@api_router.get("/songs/{song_id}/download/{resource_type}")
async def download_resource(
    song_id: str,
    resource_type: str,
    user: dict = Depends(require_auth)
):
    song = await db.songs.find_one({"id": song_id, "active": True})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check entitlement
    if not can_download(user, song["accessTier"]):
        raise HTTPException(status_code=403, detail="Upgrade your plan to download this song")
    
    resource = await db.resources.find_one({"songId": song_id, "type": resource_type}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Record download
    download_record = {
        "id": str(uuid.uuid4()),
        "uid": user["id"],
        "songId": song_id,
        "resourceType": resource_type,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.downloads.insert_one(download_record)
    
    # Increment download count
    await db.songs.update_one({"id": song_id}, {"$inc": {"downloadsCount": 1}})
    
    return {
        "filename": resource["filename"],
        "contentType": resource["contentType"],
        "data": resource["data"]
    }

# ============ LIBRARY ROUTES ============

@api_router.get("/library", response_model=List[dict])
async def get_library(user: dict = Depends(require_auth)):
    # Get user's downloads
    downloads = await db.downloads.find({"uid": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Get unique song IDs
    song_ids = list(set([d["songId"] for d in downloads]))
    
    # Get songs
    songs = await db.songs.find({"id": {"$in": song_ids}, "active": True}, {"_id": 0}).to_list(1000)
    
    for song in songs:
        resources = await db.resources.find({"songId": song["id"]}, {"_id": 0, "data": 0}).to_list(100)
        song["resources"] = resources
        song["downloadedAt"] = next((d["createdAt"] for d in downloads if d["songId"] == song["id"]), None)
    
    return songs

# ============ PLAYLISTS ROUTES ============

@api_router.get("/playlists", response_model=List[PlaylistResponse])
async def get_playlists(user: dict = Depends(require_auth)):
    query = {"$or": [{"ownerId": user["id"], "ownerType": "USER"}]}
    
    # If user is in a team, also get team playlists
    if user.get("teamId"):
        query["$or"].append({"ownerId": user["teamId"], "ownerType": "TEAM"})
    
    playlists = await db.playlists.find(query, {"_id": 0}).to_list(100)
    return playlists

@api_router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(data: PlaylistCreate, user: dict = Depends(require_auth)):
    playlist_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    owner_id = user["id"]
    if data.ownerType == "TEAM":
        if not user.get("teamId"):
            raise HTTPException(status_code=400, detail="You are not part of a team")
        owner_id = user["teamId"]
    
    playlist = {
        "id": playlist_id,
        "name": data.name,
        "ownerType": data.ownerType,
        "ownerId": owner_id,
        "songIds": [],
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.playlists.insert_one(playlist)
    return {k: v for k, v in playlist.items() if k != "_id"}

@api_router.get("/playlists/{playlist_id}", response_model=dict)
async def get_playlist(playlist_id: str, user: dict = Depends(require_auth)):
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check access
    if playlist["ownerType"] == "USER" and playlist["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if playlist["ownerType"] == "TEAM" and playlist["ownerId"] != user.get("teamId"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get songs in playlist
    songs = []
    for song_id in playlist["songIds"]:
        song = await db.songs.find_one({"id": song_id, "active": True}, {"_id": 0})
        if song:
            resources = await db.resources.find({"songId": song_id}, {"_id": 0, "data": 0}).to_list(100)
            song["resources"] = resources
            songs.append(song)
    
    playlist["songs"] = songs
    return playlist

@api_router.put("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(playlist_id: str, data: PlaylistUpdate, user: dict = Depends(require_auth)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check ownership
    if playlist["ownerType"] == "USER" and playlist["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if playlist["ownerType"] == "TEAM" and playlist["ownerId"] != user.get("teamId"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.playlists.update_one({"id": playlist_id}, {"$set": update_data})
    
    updated = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    return updated

@api_router.post("/playlists/{playlist_id}/songs/{song_id}")
async def add_song_to_playlist(playlist_id: str, song_id: str, user: dict = Depends(require_auth)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check ownership
    if playlist["ownerType"] == "USER" and playlist["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if playlist["ownerType"] == "TEAM" and playlist["ownerId"] != user.get("teamId"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    song = await db.songs.find_one({"id": song_id, "active": True})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song_id not in playlist["songIds"]:
        await db.playlists.update_one(
            {"id": playlist_id},
            {"$push": {"songIds": song_id}, "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Song added to playlist"}

@api_router.delete("/playlists/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(playlist_id: str, song_id: str, user: dict = Depends(require_auth)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist["ownerType"] == "USER" and playlist["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if playlist["ownerType"] == "TEAM" and playlist["ownerId"] != user.get("teamId"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$pull": {"songIds": song_id}, "$set": {"updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Song removed from playlist"}

@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, user: dict = Depends(require_auth)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if playlist["ownerType"] == "USER" and playlist["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if playlist["ownerType"] == "TEAM" and playlist["ownerId"] != user.get("teamId"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.playlists.delete_one({"id": playlist_id})
    return {"message": "Playlist deleted"}

# ============ TEAMS ROUTES ============

@api_router.get("/teams/my-team", response_model=Optional[TeamResponse])
async def get_my_team(user: dict = Depends(require_auth)):
    if not user.get("teamId"):
        return None
    
    team = await db.teams.find_one({"id": user["teamId"]}, {"_id": 0})
    if not team:
        return None
    
    # Get members
    members = await db.team_members.find({"teamId": team["id"]}, {"_id": 0}).to_list(10)
    team["members"] = members
    
    return team

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(data: TeamCreate, user: dict = Depends(require_auth)):
    if user.get("plan") != "TEAM":
        raise HTTPException(status_code=403, detail="Team plan required to create a team")
    
    if user.get("teamId"):
        raise HTTPException(status_code=400, detail="You are already part of a team")
    
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    team = {
        "id": team_id,
        "name": data.name,
        "ownerUid": user["id"],
        "maxMembers": 7,
        "createdAt": now
    }
    
    await db.teams.insert_one(team)
    
    # Add owner as member
    member = {
        "id": str(uuid.uuid4()),
        "teamId": team_id,
        "uid": user["id"],
        "email": user["email"],
        "role": "OWNER",
        "joinedAt": now
    }
    await db.team_members.insert_one(member)
    
    # Update user
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"teamId": team_id, "roleInTeam": "OWNER"}}
    )
    
    team["members"] = [{k: v for k, v in member.items() if k != "_id"}]
    return {k: v for k, v in team.items() if k != "_id"}

@api_router.post("/teams/{team_id}/invite")
async def invite_team_member(team_id: str, data: TeamInvite, user: dict = Depends(require_auth)):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is owner or admin
    if user.get("teamId") != team_id or user.get("roleInTeam") not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only team owner or admin can invite members")
    
    # Check max members
    member_count = await db.team_members.count_documents({"teamId": team_id})
    if member_count >= 7:
        raise HTTPException(status_code=400, detail="Team has reached maximum capacity (7 members)")
    
    # Check if already a member
    existing = await db.team_members.find_one({"teamId": team_id, "email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User is already a team member")
    
    # Create invitation
    invite_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    invitation = {
        "id": invite_id,
        "teamId": team_id,
        "email": data.email,
        "role": data.role,
        "status": "PENDING",
        "createdAt": now,
        "expiresAt": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
    
    await db.team_invitations.insert_one(invitation)
    
    return {"message": "Invitation created", "inviteId": invite_id}

@api_router.post("/teams/accept-invite/{invite_id}")
async def accept_team_invite(invite_id: str, user: dict = Depends(require_auth)):
    invitation = await db.team_invitations.find_one({"id": invite_id, "status": "PENDING"})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or expired")
    
    if invitation["email"] != user["email"]:
        raise HTTPException(status_code=403, detail="This invitation is for another email")
    
    if user.get("teamId"):
        raise HTTPException(status_code=400, detail="You are already part of a team")
    
    # Check max members
    member_count = await db.team_members.count_documents({"teamId": invitation["teamId"]})
    if member_count >= 7:
        raise HTTPException(status_code=400, detail="Team has reached maximum capacity")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Add as member
    member = {
        "id": str(uuid.uuid4()),
        "teamId": invitation["teamId"],
        "uid": user["id"],
        "email": user["email"],
        "role": invitation["role"],
        "joinedAt": now
    }
    await db.team_members.insert_one(member)
    
    # Update user - inherit team's plan
    team = await db.teams.find_one({"id": invitation["teamId"]})
    owner = await db.users.find_one({"id": team["ownerUid"]})
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "teamId": invitation["teamId"],
            "roleInTeam": invitation["role"],
            "plan": "TEAM",
            "planExpiresAt": owner.get("planExpiresAt"),
            "graceUntil": owner.get("graceUntil")
        }}
    )
    
    # Mark invitation as accepted
    await db.team_invitations.update_one(
        {"id": invite_id},
        {"$set": {"status": "ACCEPTED"}}
    )
    
    return {"message": "You have joined the team"}

@api_router.delete("/teams/{team_id}/members/{member_uid}")
async def remove_team_member(team_id: str, member_uid: str, user: dict = Depends(require_auth)):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is owner or admin
    if user.get("teamId") != team_id or user.get("roleInTeam") not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only team owner or admin can remove members")
    
    # Cannot remove owner
    if member_uid == team["ownerUid"]:
        raise HTTPException(status_code=400, detail="Cannot remove team owner")
    
    # Remove member
    await db.team_members.delete_one({"teamId": team_id, "uid": member_uid})
    
    # Update user
    await db.users.update_one(
        {"id": member_uid},
        {"$set": {"teamId": None, "roleInTeam": None, "plan": "FREE", "planExpiresAt": None, "graceUntil": None}}
    )
    
    return {"message": "Member removed from team"}

# ============ PAYMENTS ROUTES ============

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_my_payments(user: dict = Depends(require_auth)):
    payments = await db.payments.find({"uid": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return payments

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate, background_tasks: BackgroundTasks, user: dict = Depends(require_auth)):
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    payment = {
        "id": payment_id,
        "uid": user["id"],
        "userEmail": user["email"],
        "teamId": user.get("teamId"),
        "planRequested": data.planRequested,
        "provider": data.provider,
        "bankName": data.bankName,
        "amount": data.amount,
        "currency": data.currency,
        "billingMonth": data.billingMonth,
        "reference": data.reference,
        "receiptPath": None,
        "status": "PENDING",
        "reviewedBy": None,
        "reviewedAt": None,
        "note": None,
        "createdAt": now
    }
    
    await db.payments.insert_one(payment)
    
    # Send email notification (non-blocking)
    background_tasks.add_task(
        send_payment_submitted_email,
        user_email=user["email"],
        plan_requested=data.planRequested,
        provider=data.provider,
        amount=data.amount,
        currency=data.currency,
        billing_month=data.billingMonth,
        reference=data.reference,
        payment_id=payment_id
    )
    
    return {k: v for k, v in payment.items() if k != "_id"}

@api_router.post("/payments/{payment_id}/receipt")
async def upload_receipt(payment_id: str, file: UploadFile = File(...), user: dict = Depends(require_auth)):
    payment = await db.payments.find_one({"id": payment_id, "uid": user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Store receipt as base64
    content = await file.read()
    receipt_data = base64.b64encode(content).decode()
    
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {"receiptPath": receipt_data, "receiptFilename": file.filename, "receiptContentType": file.content_type}}
    )
    
    return {"message": "Receipt uploaded"}

# ============ ADMIN ROUTES ============

@api_router.get("/admin/stats")
async def admin_get_stats(user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    
    total_users = await db.users.count_documents({})
    
    # Active subscriptions (planExpiresAt >= now)
    active_standard = await db.users.count_documents({
        "plan": "STANDARD",
        "planExpiresAt": {"$gte": now}
    })
    active_team = await db.users.count_documents({
        "plan": "TEAM", 
        "planExpiresAt": {"$gte": now}
    })
    
    # Include grace period users
    grace_standard = await db.users.count_documents({
        "plan": "STANDARD",
        "planExpiresAt": {"$lt": now},
        "graceUntil": {"$gte": now}
    })
    grace_team = await db.users.count_documents({
        "plan": "TEAM",
        "planExpiresAt": {"$lt": now},
        "graceUntil": {"$gte": now}
    })
    
    total_songs = await db.songs.count_documents({"active": True})
    inactive_songs = await db.songs.count_documents({"active": False})
    total_downloads = await db.downloads.count_documents({})
    pending_payments = await db.payments.count_documents({"status": "PENDING"})
    total_teams = await db.teams.count_documents({})
    
    return {
        "totalUsers": total_users,
        "activeStandard": active_standard + grace_standard,
        "activeTeam": active_team + grace_team,
        "standardUsers": await db.users.count_documents({"plan": "STANDARD"}),
        "teamUsers": await db.users.count_documents({"plan": "TEAM"}),
        "totalSongs": total_songs,
        "inactiveSongs": inactive_songs,
        "totalDownloads": total_downloads,
        "pendingPayments": pending_payments,
        "totalTeams": total_teams
    }

@api_router.get("/admin/payments", response_model=List[PaymentResponse])
async def admin_get_payments(status: Optional[str] = None, user: dict = Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return payments

@api_router.get("/admin/payments/{payment_id}")
async def admin_get_payment_detail(payment_id: str, user: dict = Depends(require_admin)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get user info
    payer = await db.users.find_one({"id": payment["uid"]}, {"_id": 0, "password": 0})
    payment["user"] = payer
    
    return payment

@api_router.get("/admin/payments/{payment_id}/receipt")
async def admin_get_receipt(payment_id: str, user: dict = Depends(require_admin)):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.get("receiptPath"):
        raise HTTPException(status_code=404, detail="No receipt uploaded")
    
    return {
        "data": payment["receiptPath"],
        "filename": payment.get("receiptFilename", "receipt"),
        "contentType": payment.get("receiptContentType", "application/octet-stream")
    }

@api_router.post("/admin/payments/{payment_id}/review")
async def admin_review_payment(payment_id: str, data: PaymentReview, background_tasks: BackgroundTasks, admin: dict = Depends(require_admin)):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Payment has already been reviewed")
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        "status": data.decision,
        "reviewedBy": admin["id"],
        "reviewedAt": now.isoformat(),
        "note": data.note
    }
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    
    # Get user email for notification
    user_email = payment.get("userEmail")
    
    if data.decision == "APPROVED":
        # Get the user
        target_user = await db.users.find_one({"id": payment["uid"]})
        
        # Calculate new expiration date
        current_expires = None
        if target_user.get("planExpiresAt"):
            try:
                current_expires = datetime.fromisoformat(target_user["planExpiresAt"].replace("Z", "+00:00"))
            except:
                current_expires = None
        
        base_date = max(now, current_expires) if current_expires and current_expires > now else now
        new_expires = base_date + timedelta(days=30)
        grace_until = new_expires + timedelta(days=3)
        
        # Update user plan
        user_update = {
            "plan": payment["planRequested"],
            "planExpiresAt": new_expires.isoformat(),
            "graceUntil": grace_until.isoformat()
        }
        
        await db.users.update_one({"id": payment["uid"]}, {"$set": user_update})
        
        # If TEAM plan and user has a team, update all team members
        if payment["planRequested"] == "TEAM" and target_user.get("teamId"):
            team_members = await db.team_members.find({"teamId": target_user["teamId"]}).to_list(10)
            for member in team_members:
                if member["uid"] != payment["uid"]:
                    await db.users.update_one(
                        {"id": member["uid"]},
                        {"$set": {
                            "plan": "TEAM",
                            "planExpiresAt": new_expires.isoformat(), 
                            "graceUntil": grace_until.isoformat()
                        }}
                    )
        
        # Send approval email (non-blocking)
        if user_email:
            background_tasks.add_task(
                send_payment_approved_email,
                user_email=user_email,
                plan_name=payment["planRequested"],
                expires_at=new_expires.isoformat(),
                payment_id=payment_id
            )
    
    elif data.decision == "REJECTED":
        # Send rejection email (non-blocking)
        if user_email:
            background_tasks.add_task(
                send_payment_rejected_email,
                user_email=user_email,
                plan_requested=payment["planRequested"],
                rejection_note=data.note,
                payment_id=payment_id
            )
    
    return {"message": f"Payment {data.decision.lower()}"}

@api_router.get("/admin/users", response_model=List[UserResponse])
async def admin_get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Enrich with team member count
    for u in users:
        if u.get("teamId"):
            member_count = await db.team_members.count_documents({"teamId": u["teamId"]})
            u["teamMemberCount"] = member_count
        else:
            u["teamMemberCount"] = 0
    
    return users

@api_router.get("/admin/users/{user_id}")
async def admin_get_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get team info if applicable
    if user.get("teamId"):
        team = await db.teams.find_one({"id": user["teamId"]}, {"_id": 0})
        members = await db.team_members.find({"teamId": user["teamId"]}, {"_id": 0}).to_list(10)
        user["team"] = team
        user["teamMembers"] = members
    
    # Get payment history
    payments = await db.payments.find({"uid": user_id}, {"_id": 0}).sort("createdAt", -1).to_list(20)
    user["payments"] = payments
    
    return user

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: UserAdminUpdate, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    
    if data.role is not None:
        update_data["role"] = data.role
        update_data["isAdmin"] = data.role == "ADMIN"
    
    if data.plan is not None:
        update_data["plan"] = data.plan
        if data.plan == "FREE":
            update_data["planExpiresAt"] = None
            update_data["graceUntil"] = None
    
    if data.planExpiresAt is not None:
        update_data["planExpiresAt"] = data.planExpiresAt
        # Auto-calculate grace period
        try:
            expires = datetime.fromisoformat(data.planExpiresAt.replace("Z", "+00:00"))
            update_data["graceUntil"] = (expires + timedelta(days=3)).isoformat()
        except:
            pass
    
    if data.graceUntil is not None:
        update_data["graceUntil"] = data.graceUntil
    
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated_user

@api_router.post("/admin/users/{user_id}/promote-admin")
async def admin_promote_to_admin(user_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"role": "ADMIN", "isAdmin": True, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User promoted to admin"}

@api_router.post("/admin/users/{user_id}/demote-admin")
async def admin_demote_admin(user_id: str, admin: dict = Depends(require_admin)):
    # Prevent self-demotion
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"role": "USER", "isAdmin": False, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User demoted from admin"}

@api_router.post("/admin/users/{user_id}/reset-plan")
async def admin_reset_user_plan(user_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "plan": "FREE",
            "planExpiresAt": None,
            "graceUntil": None,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User plan reset to FREE"}

# ============ FIRST-TIME ADMIN SETUP ============

class AdminSetupRequest(BaseModel):
    email: EmailStr
    setupToken: str

@api_router.post("/setup/first-admin")
async def setup_first_admin(data: AdminSetupRequest):
    """
    One-time setup endpoint to promote a registered user to admin.
    Requires ADMIN_SETUP_TOKEN environment variable to be set.
    Only works if no admin users exist yet.
    """
    # Check if setup token is configured
    setup_token = os.environ.get('ADMIN_SETUP_TOKEN')
    if not setup_token:
        raise HTTPException(
            status_code=503, 
            detail="ADMIN_SETUP_TOKEN not configured. Set it in backend/.env"
        )
    
    # Verify the token
    if data.setupToken != setup_token:
        raise HTTPException(status_code=403, detail="Invalid setup token")
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"role": "ADMIN"})
    if existing_admin:
        raise HTTPException(
            status_code=400, 
            detail="Admin already exists. Use the admin panel to manage admins."
        )
    
    # Find the user by email
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="User not found. Register first, then use this endpoint."
        )
    
    # Promote to admin
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "role": "ADMIN",
            "isAdmin": True,
            "plan": "TEAM",
            "planExpiresAt": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "graceUntil": (datetime.now(timezone.utc) + timedelta(days=368)).isoformat(),
            "updatedAt": now
        }}
    )
    
    return {
        "message": f"User {data.email} has been promoted to admin",
        "note": "You can now login and access the admin dashboard at /admin"
    }

# Admin song management - get all songs including inactive
@api_router.get("/admin/songs")
async def admin_get_all_songs(user: dict = Depends(require_admin)):
    songs = await db.songs.find({}, {"_id": 0}).sort("number", 1).to_list(1000)
    
    for song in songs:
        resources = await db.resources.find({"songId": song["id"]}, {"_id": 0, "data": 0}).to_list(100)
        song["resources"] = resources
    
    return songs

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.songs.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    songs = [
        {"id": "02-grand-dieu-nous-te-benissons", "number": 2, "title": "Grand Dieu, nous te bénissons", "language": "fr", "keyOriginal": "G", "tags": ["louange", "adoration"], "accessTier": "STANDARD"},
        {"id": "03-adorons-le-pere", "number": 3, "title": "Adorons le Père", "language": "fr", "keyOriginal": "D", "tags": ["adoration"], "accessTier": "STANDARD"},
        {"id": "05-que-tout-genoux-flechisse", "number": 5, "title": "Que tout genoux fléchisse", "language": "fr", "keyOriginal": "C", "tags": ["adoration", "louange"], "accessTier": "STANDARD"},
        {"id": "08-dans-les-cieux-et-sur-la-terre", "number": 8, "title": "Dans les cieux et sur la terre", "language": "fr", "keyOriginal": "F", "tags": ["louange"], "accessTier": "PREMIUM"},
        {"id": "09-du-rocher-de-jacob", "number": 9, "title": "Du rocher de Jacob", "language": "fr", "keyOriginal": "G", "tags": ["foi", "confiance"], "accessTier": "PREMIUM"},
        {"id": "10-mon-coeur-joyeux-plein-desperance", "number": 10, "title": "Mon cœur joyeux, plein d'espérance", "language": "fr", "keyOriginal": "D", "tags": ["joie", "espérance"], "accessTier": "PREMIUM"},
        {"id": "11-chantons-du-sauveur-la-tendresse", "number": 11, "title": "Chantons du Sauveur la tendresse", "language": "fr", "keyOriginal": "A", "tags": ["louange", "gratitude"], "accessTier": "PREMIUM"},
        {"id": "12-ton-nom-soit-a-jamais-beni", "number": 12, "title": "Ton nom soit à jamais béni", "language": "fr", "keyOriginal": "E", "tags": ["adoration", "bénédiction"], "accessTier": "PREMIUM"},
        {"id": "15-que-ne-puis-je-o-mon-dieu", "number": 15, "title": "Que ne puis-je, ô mon Dieu", "language": "fr", "keyOriginal": "G", "tags": ["prière", "dévotion"], "accessTier": "PREMIUM"},
        {"id": "16-oui-je-veux-te-benir", "number": 16, "title": "Oui, je veux te bénir", "language": "fr", "keyOriginal": "C", "tags": ["louange", "bénédiction"], "accessTier": "PREMIUM"}
    ]
    
    for song in songs:
        song["active"] = True
        song["createdAt"] = now
        song["updatedAt"] = now
        song["downloadsCount"] = 0
        song["favoritesCount"] = 0
        song["tempo"] = None
    
    await db.songs.insert_many(songs)
    
    # Create initial admin user from environment variables (required for first setup)
    admin_email = os.environ.get('ADMIN_EMAIL')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    
    admin_created = False
    if admin_email and admin_password:
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "email": admin_email,
            "password": hash_password(admin_password),
            "displayName": "Admin",
            "plan": "TEAM",
            "planExpiresAt": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "graceUntil": (datetime.now(timezone.utc) + timedelta(days=368)).isoformat(),
            "teamId": None,
            "roleInTeam": None,
            "role": "ADMIN",
            "isAdmin": True,
            "createdAt": now,
            "updatedAt": now
        }
        await db.users.insert_one(admin_user)
        admin_created = True
    
    return {
        "message": "Data seeded successfully",
        "songsCount": len(songs),
        "adminCreated": admin_created,
        "note": "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create an admin user during seed" if not admin_created else None
    }

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Kantik Tracks Studio API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
