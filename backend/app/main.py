from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import example_route  # Import your routes here

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(example_route.router)  # Include your routes here

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}