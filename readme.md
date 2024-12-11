# Project Name

## Overview

This project provides a backend API with a Swagger UI for documentation access. Follow the instructions below to set up and run the project using Docker or locally.

## Running the Project with Docker

1. **Build the Docker Image**:
   To build the Docker image, navigate to the project directory and run:
   ```bash
   docker-compose build
   ```

2. **Start the Docker Container**:
   After the build is complete, start the Docker container with:
   ```bash
   docker-compose up
   ```

3. **Access API Documentation**:
   Once the container is running, you can access the API documentation at:
   ```
   http://localhost:3005/api-docs
   ```

## Running the Project Locally (Without Docker)

1. **Clone the Repository**:
   First, clone the repository to your local machine:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Set Up the Database**:
   Run all SQL queries in `query.sql` to create the database and table schema. You can do this using your preferred database client or command line.

3. **Configure Database Connection**:
   Ensure that the database connection information in `db.js` matches your setup. Update the following parameters:
   - **host**: your database host
   - **user**: your database username
   - **password**: your database password
   - **database**: your database name

4. **Install Dependencies**:
   Install the project dependencies using npm:
   ```bash
   npm install
   ```

5. **Start the Backend**:
   Finally, start the backend server with:
   ```bash
   npm start
   ```

6. **Access API Documentation**:
   You can access the API documentation at:
   ```
   http://localhost:3005/api-docs
   ```

## Conclusion

Follow the steps according to your preferred method (Docker or local setup) to run the project successfully. If you encounter any issues, please refer to the documentation or reach out for assistance.
