from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str = None

@router.post("/login")
def login(request: LoginRequest):
    # TODO: Implement real authentication
    if request.username and request.password:
        return {
            "success": True,
            "message": "Login successful",
            "token": "dummy-token-12345"
        }
    return {
        "success": False,
        "message": "Invalid credentials"
    }

@router.get("/example")
def read_example():
    return {"message": "This is an example route"}

