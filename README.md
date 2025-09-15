# Logistics Management System

This is a web-based application for managing a logistics company. It provides a dashboard for managing users, cargo, staff, transport, routes, and reports.

## Features

-   **User Management**: Create, read, update, and delete users with different roles (Administrator, Manager, Dispatcher).
-   **Cargo Management**: Track cargo, including its type, sender, receiver, and handling costs.
-   **Staff Management**: Manage employees, their positions, salaries, and statuses.
-   **Transport Management**: Keep track of vehicles, their types, models, license plates, and maintenance costs.
-   **Route Management**: Plan and manage routes, including start and end points, estimated and actual times, and revenue.
-   **Report Generation**: Generate financial and statistical reports and export them to Excel.
-   **User Authentication**: Secure login system with password hashing.

## Architecture

The application is a single-page application (SPA) with a Node.js backend and a frontend built with React (loaded from a CDN).

-   **Backend**: The backend is built with Node.js and Express.js. It handles the business logic and provides a RESTful API for the frontend.
-   **Database**: The application uses SQLite for its database. The database file (`database.db`) is created automatically when the server starts.
-   **Frontend**: The frontend is built with React and uses Bootstrap for styling. The frontend code is located in the `public` directory.

## Setup and Installation

To run this application locally, you will need to have Node.js and npm installed.

1.  **Clone the repository**:
    ```bash
    # Clone this repository to your local machine
    git clone <URL_of_this_repository>
    # Navigate to the project directory
    cd <repository_directory_name>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the application**:
    ```bash
    node server.js
    ```

The application will be available at `http://localhost:1337`.

## API Endpoints

The following API endpoints are available:

### Users

-   `GET /users`: Get a list of all users.
-   `POST /users`: Create a new user.
-   `PUT /users/:id`: Update a user.
-   `DELETE /users/:id`: Delete a user.

### Authentication

-   `POST /login`: Log in a user.
-   `POST /register`: Register a new user.

### Cargo

-   `GET /cargo`: Get a list of all cargo.
-   `POST /cargo`: Create a new cargo item.
-   `PUT /cargo/:id`: Update a cargo item.
-   `DELETE /cargo/:id`: Delete a cargo item.

### Staff

-   `GET /staff`: Get a list of all staff members.
-   `POST /staff`: Create a new staff member.
-   `PUT /staff/:id`: Update a staff member.
-   `DELETE /staff/:id`: Delete a staff member.

### Transport

-   `GET /transport`: Get a list of all transport vehicles.
-   `POST /transport`: Create a new transport vehicle.
-   `PUT /transport/:id`: Update a transport vehicle.
-   `DELETE /transport/:id`: Delete a transport vehicle.

### Reports

-   `GET /reports`: Get a list of all reports.
-   `POST /reports`: Create a new report.
-   `PUT /reports/:id`: Update a report.
-   `DELETE /reports/:id`: Delete a report.
-   `GET /generate-report`: Generate a new report.
-   `GET /export-report`: Export a report to Excel.

### Routes

-   `GET /routes`: Get a list of all routes.
-   `POST /routes`: Create a new route.
-   `PUT /routes/:id`: Update a route.
-   `DELETE /routes/:id`: Delete a route.
