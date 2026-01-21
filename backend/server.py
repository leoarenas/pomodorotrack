from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
import hashlib
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Firebase config for token verification
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', 'pomodorotrack')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

# --- Auth Models ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    displayName: str
    companyName: Optional[str] = None
    firebaseUid: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CompanyCreate(BaseModel):
    name: str

# --- Project Models ---
class ProjectCreate(BaseModel):
    name: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    projectId: str
    companyId: str
    name: str
    createdAt: str

# --- Activity Models ---
class ActivityCreate(BaseModel):
    projectId: str
    name: str

class ActivityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    activityId: str
    projectId: str
    companyId: str
    name: str

# --- TimeRecord Models ---
class TimeRecordCreate(BaseModel):
    projectId: str
    activityId: Optional[str] = None
    durationMinutes: int
    pomodoros: int = 1
    notes: Optional[str] = ""

class TimeRecordUpdate(BaseModel):
    durationMinutes: Optional[int] = None
    pomodoros: Optional[int] = None
    notes: Optional[str] = None

class TimeRecordResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    recordId: str
    companyId: str
    userId: str
    projectId: str
    activityId: Optional[str] = None
    durationMinutes: int
    pomodoros: int
    notes: Optional[str] = ""
    createdAt: str
    updatedAt: str

# --- User/Company Response Models ---
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

# --- User Management Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    displayName: str
    role: str = "user"  # admin or user

class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    role: Optional[str] = None  # admin or user

class CompanyUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    uid: str
    email: str
    displayName: str
    companyId: str
    role: str
    createdAt: str

# ============== AUTH HELPERS ==============

async def verify_firebase_token(token: str) -> Optional[dict]:
    """Verify Firebase ID token using Google's public keys"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}"
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('aud') == FIREBASE_PROJECT_ID or data.get('azp'):
                    return data
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
    return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    token = credentials.credentials
    
    # Try to find user by simple token first
    user = await db.users.find_one({"token": token}, {"_id": 0, "password": 0})
    if user:
        return user
    
    # Try Firebase token verification
    firebase_data = await verify_firebase_token(token)
    if firebase_data:
        email = firebase_data.get('email')
        if email:
            user = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
            if user:
                return user
    
    raise HTTPException(status_code=401, detail="Token inválido")

def generate_token(uid: str) -> str:
    return hashlib.sha256(f"{uid}-{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    """Register new user and optionally create company"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    uid = data.firebaseUid or str(uuid.uuid4())
    token = generate_token(uid)
    now = datetime.now(timezone.utc).isoformat()
    
    companyId = None
    company = None
    role = "user"
    
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
    
    user_doc = {
        "uid": uid,
        "email": data.email,
        "password": hashlib.sha256(data.password.encode()).hexdigest(),
        "displayName": data.displayName,
        "companyId": companyId,
        "role": role,
        "token": token,
        "firebaseUid": data.firebaseUid,
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
    password_hash = hashlib.sha256(data.password.encode()).hexdigest()
    user = await db.users.find_one(
        {"email": data.email, "password": password_hash},
        {"_id": 0, "password": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = generate_token(user["uid"])
    await db.users.update_one({"uid": user["uid"]}, {"$set": {"token": token}})
    
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
    company = None
    if current_user.get("companyId"):
        company = await db.companies.find_one({"companyId": current_user["companyId"]}, {"_id": 0})
    
    user_response = {k: v for k, v in current_user.items() if k not in ["password", "token"]}
    return {"user": user_response, "company": company}

@api_router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"uid": current_user["uid"]}, {"$set": {"token": None}})
    return {"message": "Sesión cerrada"}

# ============== COMPANY ROUTES ==============

@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, current_user: dict = Depends(get_current_user)):
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
    
    await db.users.update_one(
        {"uid": current_user["uid"]},
        {"$set": {"companyId": companyId, "role": "owner"}}
    )
    
    return CompanyResponse(**company_doc)

@api_router.get("/companies/current", response_model=CompanyResponse)
async def get_current_company(current_user: dict = Depends(get_current_user)):
    if not current_user.get("companyId"):
        raise HTTPException(status_code=404, detail="No perteneces a ninguna empresa")
    
    company = await db.companies.find_one({"companyId": current_user["companyId"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return CompanyResponse(**company)

# ============== PROJECT ROUTES ==============
# Collection: projects
# Fields: projectId, companyId, name, createdAt

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Necesitas pertenecer a una empresa")
    
    projectId = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "projectId": projectId,
        "companyId": current_user["companyId"],
        "name": data.name,
        "createdAt": now
    }
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(**project_doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    if not current_user.get("companyId"):
        return []
    
    projects = await db.projects.find(
        {"companyId": current_user["companyId"]},
        {"_id": 0}
    ).to_list(100)
    
    return [ProjectResponse(**p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({
        "projectId": project_id,
        "companyId": current_user.get("companyId")
    }, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    return ProjectResponse(**project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, current_user: dict = Depends(get_current_user)):
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
    result = await db.projects.delete_one({
        "projectId": project_id,
        "companyId": current_user.get("companyId")
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    return {"message": "Proyecto eliminado"}

# ============== ACTIVITY ROUTES ==============
# Collection: activities
# Fields: activityId, projectId, companyId, name

@api_router.post("/activities", response_model=ActivityResponse)
async def create_activity(data: ActivityCreate, current_user: dict = Depends(get_current_user)):
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
    
    activity_doc = {
        "activityId": activityId,
        "projectId": data.projectId,
        "companyId": current_user["companyId"],
        "name": data.name
    }
    await db.activities.insert_one(activity_doc)
    
    return ActivityResponse(**activity_doc)

@api_router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(projectId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if not current_user.get("companyId"):
        return []
    
    query = {"companyId": current_user["companyId"]}
    if projectId:
        query["projectId"] = projectId
    
    activities = await db.activities.find(query, {"_id": 0}).to_list(100)
    return [ActivityResponse(**a) for a in activities]

@api_router.delete("/activities/{activity_id}")
async def delete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.activities.delete_one({
        "activityId": activity_id,
        "companyId": current_user.get("companyId")
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    return {"message": "Actividad eliminada"}

# ============== TIME RECORDS ROUTES ==============
# Collection: timeRecords
# Fields: recordId, companyId, userId, projectId, activityId, durationMinutes, pomodoros, createdAt, updatedAt

@api_router.post("/time-records", response_model=TimeRecordResponse)
async def create_time_record(data: TimeRecordCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("companyId"):
        raise HTTPException(status_code=400, detail="Necesitas pertenecer a una empresa")
    
    # Verify project belongs to company
    project = await db.projects.find_one({
        "projectId": data.projectId,
        "companyId": current_user["companyId"]
    })
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Verify activity if provided
    if data.activityId:
        activity = await db.activities.find_one({
            "activityId": data.activityId,
            "companyId": current_user["companyId"]
        })
        if not activity:
            raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    recordId = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    record_doc = {
        "recordId": recordId,
        "companyId": current_user["companyId"],
        "userId": current_user["uid"],
        "projectId": data.projectId,
        "activityId": data.activityId,
        "durationMinutes": data.durationMinutes,
        "pomodoros": data.pomodoros,
        "notes": data.notes or "",
        "createdAt": now,
        "updatedAt": now
    }
    await db.timeRecords.insert_one(record_doc)
    
    return TimeRecordResponse(**record_doc)

@api_router.get("/time-records", response_model=List[TimeRecordResponse])
async def get_time_records(
    projectId: Optional[str] = None,
    activityId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not current_user.get("companyId"):
        return []
    
    query = {
        "companyId": current_user["companyId"],
        "userId": current_user["uid"]
    }
    if projectId:
        query["projectId"] = projectId
    if activityId:
        query["activityId"] = activityId
    
    records = await db.timeRecords.find(query, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return [TimeRecordResponse(**r) for r in records]

@api_router.get("/time-records/{record_id}", response_model=TimeRecordResponse)
async def get_time_record(record_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.timeRecords.find_one({
        "recordId": record_id,
        "companyId": current_user.get("companyId"),
        "userId": current_user["uid"]
    }, {"_id": 0})
    
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    return TimeRecordResponse(**record)

@api_router.put("/time-records/{record_id}", response_model=TimeRecordResponse)
async def update_time_record(record_id: str, data: TimeRecordUpdate, current_user: dict = Depends(get_current_user)):
    record = await db.timeRecords.find_one({
        "recordId": record_id,
        "companyId": current_user.get("companyId"),
        "userId": current_user["uid"]
    })
    
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.timeRecords.update_one({"recordId": record_id}, {"$set": update_data})
    
    updated = await db.timeRecords.find_one({"recordId": record_id}, {"_id": 0})
    return TimeRecordResponse(**updated)

@api_router.delete("/time-records/{record_id}")
async def delete_time_record(record_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.timeRecords.delete_one({
        "recordId": record_id,
        "companyId": current_user.get("companyId"),
        "userId": current_user["uid"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    return {"message": "Registro eliminado"}

# ============== STATS ROUTES ==============

@api_router.get("/stats/today")
async def get_today_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get records from today
    records = await db.timeRecords.find({
        "userId": current_user["uid"],
        "companyId": current_user.get("companyId"),
        "createdAt": {"$regex": f"^{today}"}
    }, {"_id": 0}).to_list(100)
    
    total_pomodoros = sum(r.get("pomodoros", 0) for r in records)
    total_minutes = sum(r.get("durationMinutes", 0) for r in records)
    
    return {
        "date": today,
        "pomodorosCompleted": total_pomodoros,
        "totalWorkTime": total_minutes * 60,  # Convert to seconds for frontend compatibility
        "totalMinutes": total_minutes,
        "recordsCount": len(records)
    }

@api_router.get("/stats/week")
async def get_week_stats(current_user: dict = Depends(get_current_user)):
    from datetime import timedelta
    
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=today.weekday())
    dates = [(week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    # Get all records for the week
    records = await db.timeRecords.find({
        "userId": current_user["uid"],
        "companyId": current_user.get("companyId")
    }, {"_id": 0}).to_list(500)
    
    daily_stats = {}
    for date in dates:
        day_records = [r for r in records if r.get("createdAt", "").startswith(date)]
        daily_stats[date] = {
            "pomodoros": sum(r.get("pomodoros", 0) for r in day_records),
            "totalTime": sum(r.get("durationMinutes", 0) for r in day_records) * 60
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
    if not current_user.get("companyId"):
        return []
    
    records = await db.timeRecords.find({
        "userId": current_user["uid"],
        "companyId": current_user["companyId"]
    }, {"_id": 0}).to_list(1000)
    
    projects = await db.projects.find(
        {"companyId": current_user["companyId"]},
        {"_id": 0}
    ).to_list(100)
    
    project_map = {p["projectId"]: p for p in projects}
    
    stats = {}
    for record in records:
        pid = record.get("projectId")
        if pid not in stats:
            project = project_map.get(pid, {})
            stats[pid] = {
                "projectId": pid,
                "projectName": project.get("name", "Desconocido"),
                "color": "#E91E63",  # Default color
                "totalTime": 0,
                "totalMinutes": 0,
                "pomodoros": 0
            }
        stats[pid]["totalMinutes"] += record.get("durationMinutes", 0)
        stats[pid]["totalTime"] = stats[pid]["totalMinutes"] * 60
        stats[pid]["pomodoros"] += record.get("pomodoros", 0)
    
    return list(stats.values())

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "PomodoroTrack API", "status": "running", "version": "1.2.0"}

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
