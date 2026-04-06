# Frontend Web Application

This project is a web application built using React with Vite and TailwindCSS for the frontend, and FastAPI with PostgreSQL and SQLAlchemy for the backend. 

## Frontend Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install the dependencies:
   ```
   npm install
   ```

### Development
To start the development server, run:
```
npm run dev
```
This will start the Vite development server and open the application in your default web browser.

### Building for Production
To build the application for production, run:
```
npm run build
```
This will create an optimized build of the application in the `dist` directory.

## TailwindCSS Configuration
This project uses TailwindCSS for styling. You can customize the Tailwind configuration in the `tailwind.config.js` file.

## Folder Structure
- `src/components`: Contains reusable components for the application.
- `src/pages`: Contains the main pages of the application.
- `src/hooks`: Contains custom hooks for managing state and side effects.
- `src/styles`: Contains global styles, including TailwindCSS configurations.
- `src/App.tsx`: The main component that sets up the application.
- `src/main.tsx`: The entry point for the React application.

## Backend Setup
For backend setup, refer to the `backend/README.md` file.

## Docker Deployment
To deploy the application using Docker, refer to the `docker-compose.yml` file for service definitions and instructions.