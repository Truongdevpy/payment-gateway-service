from fastapi import APIRouter
from . import example_route

router = APIRouter()

# Include your route definitions here, for example:
router.include_router(example_route.router)