import os
import uuid
import datetime
from typing import List, Optional

# Fix passlib compatibility with modern bcrypt
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = getattr(bcrypt, "__version__", "4.1.3")
    bcrypt.__about__ = About()

from fastapi import FastAPI, HTTPException, Depends, status, Query, Body, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, HTMLResponse
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt

# Environment & Config
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "icon_library_db"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qxgatyonynkrovlhvqej.supabase.co")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_M1atyJ71590zKMq-M6WtDg_gxZN2a52")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")


SECRET_KEY = SUPABASE_SECRET_KEY or "glyphcraft-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="GlyphCraft Icon Library API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models
class AdminLogin(BaseModel):
    email: str
    password: str

class IconCreate(BaseModel):
    name: str  # unique slug/name e.g. "home", "user-circle"
    category: str  # "colorful" or "outline"
    svg_code: str  # raw SVG markup
    tags: Optional[List[str]] = []

class IconUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    svg_code: Optional[str] = None
    tags: Optional[List[str]] = None

class BulkIconUpload(BaseModel):
    icons: List[IconCreate]

# Startup Event: Seed Admin and Initial Icons
@app.on_event("startup")
async def startup_db():
    # 1. Seed Admin user if not exists
    admin_email = "roshankumarbgp1520@gmail.com"
    admin_password_plain = "673771494800"
    existing_admin = await db.admins.find_one({"email": admin_email})
    if not existing_admin:
        hashed_pw = pwd_context.hash(admin_password_plain)
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": hashed_pw,
            "created_at": datetime.datetime.utcnow()
        })
        print("Admin user seeded successfully.")

    # 2. Seed initial icons if collection is empty
    count = await db.icons.count_documents({})
    if count == 0:
        initial_icons = [
            {
                "id": str(uuid.uuid4()),
                "name": "home",
                "category": "outline",
                "svg_code": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
                "tags": ["navigation", "house", "main"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "home-colorful",
                "category": "colorful",
                "svg_code": '<svg viewBox="0 0 24 24" fill="none"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#3B82F6"/><path d="M9 22V12h6v10" fill="#60A5FA"/></svg>',
                "tags": ["navigation", "house", "colorful"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "user",
                "category": "outline",
                "svg_code": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                "tags": ["account", "profile", "person"],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "user-colorful",
                "category": "colorful",
                "svg_code": '<svg viewBox="0 0 24 24" fill="none"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="#10B981"/><circle cx="12" cy="7" r="4" fill="#34D399"/></svg>',
                "tags": ["account", "profile", "colorful"],
                "created_at": datetime.datetime.utcnow()
            }
        ]
        for icon in initial_icons:
            await db.icons.insert_one(icon)
        print("Initial icon library seeded.") 
        # Auth Helper
def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email != "roshankumarbgp1520@gmail.com":
            raise HTTPException(status_code=401, detail="Unauthorized")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Routes
@app.post("/api/auth/login")
async def login(admin: AdminLogin):
    db_admin = await db.admins.find_one({"email": admin.email})
    if not db_admin or not pwd_context.verify(admin.password, db_admin["password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    token_data = {"sub": admin.email}
    encoded_jwt = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": encoded_jwt, "token_type": "bearer", "email": admin.email}

@app.get("/api/auth/me")
async def auth_me(email: str = Depends(verify_admin_token)):
    return {"status": "success", "email": email}

@app.get("/api/icons")
async def get_icons(
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if category and category != "all":
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.icons.find(query, {"_id": 0}).limit(limit)
    icons = await cursor.to_list(length=limit)
    return {"count": len(icons), "icons": icons}

@app.post("/api/icons")
async def create_icon(icon: IconCreate, email: str = Depends(verify_admin_token)):
    existing = await db.icons.find_one({"name": icon.name})
    if existing:
        raise HTTPException(status_code=400, detail=f"Icon with name '{icon.name}' already exists. Please choose a unique name.")
    
    icon_doc = {
        "id": str(uuid.uuid4()),
        "name": icon.name.strip().lower(),
        "category": icon.category.strip().lower(),
        "svg_code": icon.svg_code.strip(),
        "tags": [t.strip().lower() for t in icon.tags] if icon.tags else [],
        "created_at": datetime.datetime.utcnow()
    }
    await db.icons.insert_one(icon_doc)
    icon_doc.pop("_id", None)
    return {"message": "Icon created successfully", "icon": icon_doc} 
    @app.post("/api/icons/bulk")
async def bulk_create_icons(payload: BulkIconUpload, email: str = Depends(verify_admin_token)):
    results = []
    errors = []
    for item in payload.icons:
        existing = await db.icons.find_one({"name": item.name})
        if existing:
            errors.append(f"Icon '{item.name}' already exists.")
            continue
        icon_doc = {
            "id": str(uuid.uuid4()),
            "name": item.name.strip().lower(),
            "category": item.category.strip().lower(),
            "svg_code": item.svg_code.strip(),
            "tags": [t.strip().lower() for t in item.tags] if item.tags else [],
            "created_at": datetime.datetime.utcnow()
        }
        await db.icons.insert_one(icon_doc)
        results.append(item.name)
    
    return {"success": True, "uploaded": results, "errors": errors}

@app.put("/api/icons/{icon_id}")
async def update_icon(icon_id: str, update: IconUpdate, email: str = Depends(verify_admin_token)):
    update_data = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}
    if "name" in update_data:
        existing = await db.icons.find_one({"name": update_data["name"], "id": {"$ne": icon_id}})
        if existing:
            raise HTTPException(status_code=400, detail=f"Icon with name '{update_data['name']}' already exists.")
    
    result = await db.icons.update_one({"id": icon_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Icon not found")
    
    updated_icon = await db.icons.find_one({"id": icon_id}, {"_id": 0})
    return {"message": "Icon updated successfully", "icon": updated_icon}

@app.delete("/api/icons/{icon_id}")
async def delete_icon(icon_id: str, email: str = Depends(verify_admin_token)):
    result = await db.icons.delete_one({"id": icon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Icon not found")
    return {"message": "Icon deleted successfully"}

# CDN CSS Endpoint: /cdn/glyphcraft.css
@app.get("/cdn/glyphcraft.css", response_class=PlainTextResponse)
async def cdn_css():
    icons = await db.icons.find({}, {"_id": 0, "name": 1, "svg_code": 1, "category": 1}).to_list(length=1000)
    
    css_content = """/* GlyphCraft CDN CSS v1.0.0 */
.myicon, [class^="myicon-"], [class*=" myicon-"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1.1em;
  vertical-align: -0.15em;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
}
.myicon svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
    } 
    .myicon.colorful svg {
  fill: initial;
}
"""
    for ic in icons:
        name = ic["name"]
        svg = ic["svg_code"].replace('"', "'").replace("\n", " ")
        css_content += f"""
.myicon-{name}::before {{
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  background-image: url("data:image/svg+xml;utf8,{svg}");
}}
"""
    return PlainTextResponse(content=css_content, media_type="text/css")

# CDN JS Endpoint: /cdn/icons.js
@app.get("/cdn/icons.js", response_class=PlainTextResponse)
async def cdn_js():
    js_content = """/* GlyphCraft CDN JS Runtime v1.0.0 */
(function() {
  function initGlyphCraft() {
    const elements = document.querySelectorAll('i[data-icon], i[class*="myicon-"]');
    elements.forEach(el => {
      let iconName = el.getAttribute('data-icon');
      if (!iconName) {
        const cls = Array.from(el.classList).find(c => c.startsWith('myicon-'));
        if (cls) {
          iconName = cls.replace('myicon-', '');
        }
      }
      if (iconName && !el.getAttribute('data-glyphcrafted')) {
        fetch('/api/icons').then(res => res.json()).then(data => {
          const found = data.icons.find(i => i.name === iconName);
          if (found) {
            el.innerHTML = found.svg_code;
            el.setAttribute('data-glyphcrafted', 'true');
            if (found.category === 'colorful') {
              el.classList.add('colorful');
            }
          }
        }).catch(err => console.error('GlyphCraft CDN Error:', err));
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlyphCraft);
  } else {
    initGlyphCraft();
  }
})();
"""
    return PlainTextResponse(content=js_content, media_type="application/javascript")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "glyphcraft-icon-library-backend", "timestamp": str(datetime.datetime.utcnow())}
    
