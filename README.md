# 🍱 ShareMeal
### A Full-Stack Food Donation and Redistribution Platform

ShareMeal is a full-stack web application designed to reduce food wastage by connecting food donors, NGOs, and volunteers. The platform helps donors share surplus food, enables NGOs to claim available donations, and allows volunteers to support food collection and delivery.

The main objective is to ensure that surplus food reaches people in need instead of being wasted.

## 📑 Table of Contents
- Project Overview
- Key Features
- Technology Stack
- Architecture
- User Roles
- Database
- Authentication and Security
- Installation and Setup
- Running the Application
- Deployment
- Project Purpose
- Team Members

## 🎯 Project Overview

ShareMeal provides a digital platform for managing food donations and redistribution.

**1. Donor Module**
- Register and log in as a donor.
- Add food donation details.
- Provide information about food quantity and availability.
- Manage food donations.

**2. NGO Module**
- Register and log in as an NGO.
- View available food donations.
- Claim suitable donations.
- Manage claimed food.

**3. Volunteer Module**
- Register and log in as a volunteer.
- View assigned delivery tasks.
- Support food pickup and delivery.

## ✨ Key Features
- User Registration and Login
- Role-Based Access Control
- Food Donation Management
- Donation Listing
- NGO Donation Claiming
- Volunteer Pickup and Delivery Workflow
- Secure Authentication
- MongoDB Database Integration
- Responsive Web Interface

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | User interface |
| Build Tool | Vite | Frontend development and build |
| Programming Language | JavaScript | Application logic |
| Backend | Node.js | Server-side runtime |
| Web Framework | Express.js | REST API development |
| Database | MongoDB | Data storage |
| ODM | Mongoose | MongoDB schema management |
| Authentication | JWT | User authentication |
| Password Security | bcryptjs | Password hashing |
| Cookies | cookie-parser | Cookie handling |
| Styling | CSS | User interface styling |

## 📂 Project Architecture

```text
ShareMeal/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
│
└── README.md
```

## 👥 User Roles

**Donor:** Shares surplus food by creating donations.

**NGO:** Finds and claims available food donations.

**Volunteer:** Helps with food pickup and delivery.

## 🗄️ Database

ShareMeal uses MongoDB to store application data.

Mongoose is used to define schemas and interact with the MongoDB database.

MongoDB Compass can be used to view and manage database collections and documents.

## 🔐 Authentication and Security

- JWT-based authentication.
- Password hashing using bcryptjs.
- Cookie-based session handling.
- Role-based access control.
- Protected routes for authorized users.

## 🚀 Installation and Setup

### Prerequisites
- Node.js
- npm
- MongoDB Community Server
- MongoDB Compass
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/varshini541/Sharemeal.git
cd Sharemeal
```

### Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the server folder and configure the required values according to the backend configuration.

### Step 4: Start the Backend

```bash
npm run dev
```

Backend runs at:

`http://localhost:5000`

### Step 5: Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

### Step 6: Start the Frontend

```bash
npm run dev
```

Frontend runs at:

`http://localhost:5173`

## 🌐 Live Deployment

**Frontend:** https://sharemeal-nine.vercel.app

**Backend:** https://sharemeal-1qz0.onrender.com

**GitHub Repository:** https://github.com/varshini541/Sharemeal

## 🎯 Project Purpose

ShareMeal aims to reduce food wastage and support communities by creating a connection between food donors, NGOs, and volunteers.

It provides a simple and organized way to donate, claim, and distribute surplus food through a web-based platform.

## 👩‍💻 Team Members

1. **Ranimekala Varshini** – [GitHub](https://github.com/varshini541)
2. **Soumya** – [GitHub](https://github.com/rajulapatisowmya-hub)
3. **Uday** – [GitHub](https://github.com/udayrampati)
4. **Rahul** – [GitHub](https://github.com/rahulpulipati390-collab)

---

**ShareMeal – Share Food, Spread Happiness! ❤️**
