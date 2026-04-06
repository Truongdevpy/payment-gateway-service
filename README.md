# Web Application

This project is a web application built using React with Vite and TailwindCSS for the frontend, and FastAPI with PostgreSQL and SQLAlchemy for the backend. The application is designed to be easily deployable using Docker.

## Project Structure

```
web-application
├── frontend
│   ├── src
│   │   ├── components       # Reusable components for the frontend
│   │   ├── pages            # Main pages of the application
│   │   ├── hooks            # Custom hooks for state management
│   │   ├── styles           # Global styles including TailwindCSS
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Entry point for the React application
│   ├── public               # Static assets for the frontend
│   ├── index.html           # Main HTML file for the frontend
│   ├── package.json         # Frontend dependencies and scripts
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js    # TailwindCSS configuration
│   ├── postcss.config.js    # PostCSS configuration
│   └── README.md            # Documentation for the frontend
├── backend
│   ├── app
│   │   ├── __init__.py      # Initializes the backend application package
│   │   ├── main.py          # Entry point for the FastAPI application
│   │   ├── models           # SQLAlchemy models
│   │   ├── schemas          # Pydantic schemas
│   │   ├── routes           # API route definitions
│   │   ├── database.py      # Database connection logic
│   │   └── config.py        # Configuration settings for FastAPI
│   ├── requirements.txt      # Backend dependencies
│   ├── .env.example         # Example environment variables
│   └── README.md            # Documentation for the backend
├── docker-compose.yml       # Docker services definition
├── Dockerfile.backend        # Instructions for building the backend Docker image
├── Dockerfile.frontend       # Instructions for building the frontend Docker image
└── README.md                # Overall documentation for the project
```

## Getting Started

### Prerequisites

- Docker
- Docker Compose
- Node.js (for frontend development)
- Python (for backend development)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd web-application
   ```

2. Set up the backend:
   - Navigate to the `backend` directory.
   - Install dependencies:
     ```
     pip install -r requirements.txt
     ```

3. Set up the frontend:
   - Navigate to the `frontend` directory.
   - Install dependencies:
     ```
     npm install
     ```

### Running the Application

To run the application using Docker, execute the following command in the root of the project:

```
docker-compose up --build
```

This command will build and start both the frontend and backend services.

### Accessing the Application

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### License

This project is licensed under the MIT License. See the LICENSE file for details.