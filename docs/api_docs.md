# API Documentation

## Base URL

```
http://localhost:{PORT}/{PREFIX}/
```
- `PORT` and `PREFIX` are set via environment variables.

---

## Endpoints

### 1. Root Endpoint

- **GET /**
  Returns a simple hello world message.

  **Response:**
  ```json
  "Hello World!"
  ```

---

### 2. Authentication

#### **POST /auth/login**

- **Description:** Login with email and password.
- **Payload:**
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
  - `email` (string, required): User's email address.
  - `password` (string, required): User's password (must be strong).

- **Response:**
  ```json
  {
    "error": false,
    "data": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "userName": "johndoe",
      "email": "user@example.com",
      "mobileNumber": "1234567890",
      "image": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "deletedAt": null
    },
    "message": "Logged in successfully"
  }
  ```
  - `data`: User object (see User Model below).
  - `message`: "Logged in successfully"

---

### 3. User

#### **POST /user**

- **Description:** Register a new user.
- **Payload:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "userName": "johndoe",
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "mobileNumber": "1234567890" // optional
  }
  ```
  - `firstName` (string, required)
  - `lastName` (string, required)
  - `userName` (string, required)
  - `email` (string, required)
  - `password` (string, required)
  - `mobileNumber` (string, optional)

- **Response:**
  ```json
  {
    "error": false,
    "data": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "userName": "johndoe",
      "email": "user@example.com",
      "mobileNumber": "1234567890",
      "image": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "deletedAt": null
    },
    "message": "User created successfully"
  }
  ```
  - `data`: User object (see User Model below).
  - `message`: "User created successfully"

---

## User Model

```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "userName": "johndoe",
  "email": "user@example.com",
  "mobileNumber": "1234567890",
  "image": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "deletedAt": null
}
```
- `id`: User's unique identifier.
- `firstName`: User's first name.
- `lastName`: User's last name.
- `userName`: Unique username.
- `email`: User's email address.
- `mobileNumber`: User's mobile number (optional).
- `image`: User's profile image (optional).
- `createdAt`: Account creation timestamp.
- `updatedAt`: Last update timestamp.
- `deletedAt`: Deletion timestamp (null if not deleted).

---

## Response Format

All API responses (except the root endpoint) are wrapped as follows:
```json
{
  "error": false,
  "data": { ... },
  "message": "..."
}
```
- `error`: Always `false` for successful responses.
- `data`: The main response data (e.g., user object).
- `message`: A human-readable message.

---

## Error Handling

- Standard error responses will have `error: true` and a relevant message.
- Example:
  ```json
  {
    "error": true,
    "data": null,
    "message": "Unauthorized access"
  }
  ```
