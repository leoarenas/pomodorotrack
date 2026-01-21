from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Firebase config
FIREBASE_API_KEY = os.environ.get('FIREBASE_API_KEY', '')
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    displayName: str
    companyName: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CompanyCreate(BaseModel):
    name: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#E91E63"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    isActive: Optional[bool] = None

class ActivityCreate(BaseModel):
    projectId: str
    name: str
    description: Optional[str] = ""

class TimeEntryCreate(BaseModel):
    projectId: str
    activityId: Optional[str] = None
    duration: int  # in seconds
    type: str = "pomodoro"  # pomodoro, manual, break
    notes: Optional[str] = ""

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    uid: str
    email: str
    displayName: str
    companyId: Optional[str] = None
    role: str = "user"
    createdAt: str

class CompanyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    companyId: str
    name: str
    subscriptionStatus: str
    createdAt: str

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    projectId: str
    companyId: str
    name: str
    description: str
    color: str
    isActive: bool
    createdAt: str

class ActivityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    activityId: str
    projectId: str
    companyId: str
    name: str
    description: str
    createdAt: str

class TimeEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    entryId: str
    userId: str
    companyId: str
    projectId: str
    activityId: Optional[str]
    duration: int
    type: str
    notes: str
    date: str
    createdAt: str

# ============== AUTH HELPERS ==============

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    token = credentials.credentials
    # Find user by token (simple token-based auth for MVP)
    user = await db.users.find_one({"token": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")
    return user

def generate_token(uid: str) -> str:
    """Generate a simple token for MVP (replace with JWT in production)"""
    return hashlib.sha256(f"{uid}-{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    """Register new user and optionally create company"""
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    uid = str(uuid.uuid4())
    token = generate_token(uid)
    now = datetime.now(timezone.utc).isoformat()
    
    companyId = None
    company = None
    role = "user"
    
    # Create company if name provided
    if data.companyName:
        companyId = str(uuid.uuid4())
        company = {
            "companyId": companyId,
            "name": data.companyName,
            "subscriptionStatus": "active",
            "ownerId": uid,
            "createdAt": now
        }
        await db.companies.insert_one(company)
        role = "owner"
    
    # Create user
    user_doc = {
        "uid": uid,
        "email": data.email,
        "password": hashlib.sha256(data.password.encode()).hexdigest(),
        "displayName": data.displayName,
        "companyId": companyId,
        "role": role,
        "token": token,
        "createdAt": now
    }
    await db.users.insert_one(user_doc)
    
    return {
        "token": token,
        "user": {
            "uid": uid,
            "email": data.email,
            "displayName": data.displayName,
            "companyId": companyId,
            "role": role,
            "createdAt": now
        },
        "company": {
            "companyId": companyId,
            "name": data.companyName,
            "subscriptionStatus": "active"
        } if company else None
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    """Login user"""
    password_hash = hashlib.sha256(data.password.encode()).hexdigest()
    user = await db.users.find_one(
        {"email": data.email, "password": password_hash},
        {"_id": 0, "password": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Generate new token
    token = generate_token(user["uid"])
    await db.users.update_one({"uid": user["uid"]}, {"$set": {"token": token}})
    
    # Get company info
    company = None
    if user.get("companyId"):
        company = await db.companies.find_one({"companyId": user["companyId"]}, {"_id": 0})
    
    return {
        "token": token,
        "user": user,
        "company": company
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    company = None
    if current_user.get("companyId"):
        company = await db.companies.find_one({"companyId": current_user["companyId"]}, {"_id": 0})
    
    user_response = {k: v for k, v in current_user.items() if k not in ["password", "token"]}
    return {"user": user_response, "company": company}

@api_router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout - invalidate token"""
    await db.users.update_one({"uid": current_user["uid"]}, {"$set": {"token": None}})
    return {"message": "Sesión cerrada"}

# ============== COMPANY ROUTES ==============

@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    """Create company for user without one"""
    if current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Ya perteneces a una empresa")
    
    companyId = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    company_doc = {
        "companyId": companyId,
        "name": data.name,
        "subscriptionStatus": "active",
        "ownerId": current_user["uid"],
        "createdAt": now
    }
    await db.companies.insert_one(company_doc)
    
    # Update user
    await db.users.update_one(
        {"uid": current_user["uid"]},
        {"$set": {"companyId": companyId, "role": "owner"}}
    )
    
    return CompanyResponse(**company_doc)

@api_router.get("/companies/current", response_model=CompanyResponse)
async def get_current_company(current_user: dict = Depends(get_current_user)):
    """Get current user's company"""
    if not current_user.get("companyId"):
        raise HTTPException(status_code=404, detail="No perteneces a ninguna empresa")
    
    company = await db.companies.find_one({"companyId": current_user["companyId"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return CompanyResponse(**company)

# ============== PROJECT ROUTES ==============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """Create new project"""
    if not current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Necesitas pertenecer a una empresa")
    
    projectId = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "projectId": projectId,
        "companyId": current_user["companyId"],
        "name": data.name,
        "description": data.description or "",
        "color": data.color or "#E91E63",
        "isActive": True,
        "createdAt": now
    }
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(**project_doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects for company"""
    if not current_user.get("companyId"):
        return []
    
    projects = await db.projects.find(
        {"companyId": current_user["companyId"]},
        {"_id": 0}
    ).to_list(100)
    
    return [ProjectResponse(**p) for p in projects]

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    """Update project"""
    project = await db.projects.find_one({
        "projectId": project_id,
        "companyId": current_user.get("companyId")
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.projects.update_one({"projectId": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"projectId": project_id}, {"_id": 0})
    return ProjectResponse(**updated)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Delete project"""
    result = await db.projects.delete_one({
        "projectId": project_id,
        "companyId": current_user.get("companyId")
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    return {"message": "Proyecto eliminado"}

# ============== ACTIVITY ROUTES ==============

@api_router.post("/activities", response_model=ActivityResponse)
async def create_activity(data: ActivityCreate, current_user: dict = Depends(get_current_user)):
    """Create new activity"""
    if not current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Necesitas pertenecer a una empresa")
    
    # Verify project belongs to company
    project = await db.projects.find_one({
        "projectId": data.projectId,
        "companyId": current_user["companyId"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    activityId = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    activity_doc = {
        "activityId": activityId,
        "projectId": data.projectId,
        "companyId": current_user["companyId"],
        "name": data.name,
        "description": data.description or "",
        "createdAt": now
    }
    await db.activities.insert_one(activity_doc)
    
    return ActivityResponse(**activity_doc)

@api_router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(projectId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get activities, optionally filtered by project"""
    if not current_user.get("companyId"):
        return []
    
    query = {"companyId": current_user["companyId"]}
    if projectId:
        query["projectId"] = projectId
    
    activities = await db.activities.find(query, {"_id": 0}).to_list(100)
    return [ActivityResponse(**a) for a in activities]

# ============== TIME ENTRY ROUTES ==============

@api_router.post("/time-entries", response_model=TimeEntryResponse)
async def create_time_entry(data: TimeEntryCreate, current_user: dict = Depends(get_current_user)):
    """Create time entry (pomodoro or manual)"""
    if not current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Necesitas pertenecer a una empresa")
    
    # Verify project
    project = await db.projects.find_one({
        "projectId": data.projectId,
        "companyId": current_user["companyId"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    entryId = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    entry_doc = {
        "entryId": entryId,
        "userId": current_user["uid"],
        "companyId": current_user["companyId"],
        "projectId": data.projectId,
        "activityId": data.activityId,
        "duration": data.duration,
        "type": data.type,
        "notes": data.notes or "",
        "date": now.strftime("%Y-%m-%d"),
        "createdAt": now.isoformat()
    }
    await db.time_entries.insert_one(entry_doc)
    
    return TimeEntryResponse(**entry_doc)

@api_router.get("/time-entries", response_model=List[TimeEntryResponse])
async def get_time_entries(
    projectId: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get time entries for current user"""
    if not current_user.get("companyId"):
        return []
    
    query = {
        "userId": current_user["uid"],
        "companyId": current_user["companyId"]
    }
    if projectId:
        query["projectId"] = projectId
    if date:
        query["date"] = date
    
    entries = await db.time_entries.find(query, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return [TimeEntryResponse(**e) for e in entries]

# ============== STATS ROUTES ==============

@api_router.get("/stats/today")
async def get_today_stats(current_user: dict = Depends(get_current_user)):
    """Get stats for today"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entries = await db.time_entries.find({
        "userId": current_user["uid"],
        "date": today
    }, {"_id": 0}).to_list(100)
    
    pomodoros = [e for e in entries if e.get("type") == "pomodoro"]
    total_time = sum(e.get("duration", 0) for e in entries if e.get("type") != "break")
    break_time = sum(e.get("duration", 0) for e in entries if e.get("type") == "break")
    
    return {
        "date": today,
        "pomodorosCompleted": len(pomodoros),
        "totalWorkTime": total_time,
        "breakTime": break_time,
        "entriesCount": len(entries)
    }

@api_router.get("/stats/week")
async def get_week_stats(current_user: dict = Depends(get_current_user)):
    """Get stats for current week"""
    from datetime import timedelta
    
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    dates = [(week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    entries = await db.time_entries.find({
        "userId": current_user["uid"],
        "date": {"$in": dates}
    }, {"_id": 0}).to_list(500)
    
    daily_stats = {}
    for date in dates:
        day_entries = [e for e in entries if e.get("date") == date]
        daily_stats[date] = {
            "pomodoros": len([e for e in day_entries if e.get("type") == "pomodoro"]),
            "totalTime": sum(e.get("duration", 0) for e in day_entries if e.get("type") != "break")
        }
    
    total_pomodoros = sum(d["pomodoros"] for d in daily_stats.values())
    total_time = sum(d["totalTime"] for d in daily_stats.values())
    
    return {
        "weekStart": dates[0],
        "weekEnd": dates[-1],
        "dailyStats": daily_stats,
        "totalPomodoros": total_pomodoros,
        "totalTime": total_time
    }

@api_router.get("/stats/by-project")
async def get_project_stats(current_user: dict = Depends(get_current_user)):
    """Get time breakdown by project"""
    if not current_user.get("companyId"):
        return []
    
    # Get all entries for user
    entries = await db.time_entries.find({
        "userId": current_user["uid"],
        "companyId": current_user["companyId"],
        "type": {"$ne": "break"}
    }, {"_id": 0}).to_list(1000)
    
    # Get projects
    projects = await db.projects.find(
        {"companyId": current_user["companyId"]},
        {"_id": 0}
    ).to_list(100)
    
    project_map = {p["projectId"]: p for p in projects}
    
    # Aggregate by project
    stats = {}
    for entry in entries:
        pid = entry.get("projectId")
        if pid not in stats:
            project = project_map.get(pid, {})
            stats[pid] = {
                "projectId": pid,
                "projectName": project.get("name", "Desconocido"),
                "color": project.get("color", "#E91E63"),
                "totalTime": 0,
                "pomodoros": 0
            }
        stats[pid]["totalTime"] += entry.get("duration", 0)
        if entry.get("type") == "pomodoro":
            stats[pid]["pomodoros"] += 1
    
    return list(stats.values())

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "PomodoroTrack API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
