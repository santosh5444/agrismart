import time
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from ..auth import farmer_signup, farmer_login, consumer_signup, consumer_login
except ImportError:
    from auth import farmer_signup, farmer_login, consumer_signup, consumer_login

router = APIRouter(prefix="/api")

class FarmerSignupRequest(BaseModel):
    name: str
    email: str = ""
    password: str
    mobile: str = ""

class LoginRequest(BaseModel):
    email: str  # Serves as identifier (email or mobile)
    password: str

class ConsumerSignupRequest(BaseModel):
    name: str
    email: str = ""
    password: str
    mobile: str = ""
    location: str = ""

@router.post("/farmer/signup")
def api_farmer_signup(req: FarmerSignupRequest):
    try:
        result = farmer_signup(req.name, req.email, req.password, req.mobile)
        if "error" in result:
            return {"success": False, "message": result["error"]}
        return {"success": True, "user": result}
    except Exception as e:
        print(f"[Auth] Farmer signup error: {e}")
        return {"success": False, "message": f"Registration failed: {str(e)}"}

@router.post("/farmer/login")
def api_farmer_login(req: LoginRequest):
    try:
        start_time = time.time()
        result = farmer_login(req.email, req.password)
        duration = (time.time() - start_time) * 1000
        print(f"[Auth] Farmer login for {req.email} took {duration:.2f}ms")
        if "error" in result:
            return {"success": False, "message": result["error"]}
        return {"success": True, **result}
    except Exception as e:
        print(f"[Auth] Farmer login error: {e}")
        return {"success": False, "message": f"Login failed: {str(e)}"}

@router.post("/consumer/signup")
def api_consumer_signup(req: ConsumerSignupRequest):
    try:
        result = consumer_signup(req.name, req.email, req.password, req.mobile, req.location)
        if "error" in result:
            return {"success": False, "message": result["error"]}
        return {"success": True, "user": result}
    except Exception as e:
        print(f"[Auth] Consumer signup error: {e}")
        return {"success": False, "message": f"Registration failed: {str(e)}"}

@router.post("/consumer/login")
def api_consumer_login(req: LoginRequest):
    try:
        start_time = time.time()
        result = consumer_login(req.email, req.password)
        duration = (time.time() - start_time) * 1000
        print(f"[Auth] Consumer login for {req.email} took {duration:.2f}ms")
        if "error" in result:
            return {"success": False, "message": result["error"]}
        return {"success": True, **result}
    except Exception as e:
        print(f"[Auth] Consumer login error: {e}")
        return {"success": False, "message": f"Login failed: {str(e)}"}

