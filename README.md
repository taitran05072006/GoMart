# 🛒 GoMart - Mini Supermarket Management System

Welcome to **GoMart**, a comprehensive mini supermarket management system. Built with a robust Spring Boot backend and a dynamic React frontend, GoMart delivers a seamless, secure, and fast shopping experience for users, alongside a powerful admin dashboard for store management.

## 🚀 Live Demo
- **Website:** [https://go-mart-gilt.vercel.app](https://go-mart-gilt.vercel.app)

## 🏗️ System Architecture

```text
Frontend (React + Vite)
│
│ HTTPS
▼
Backend (Spring Boot REST API)
│
├── Spring Security + JWT
├── JPA / Hibernate
└── Email Service (SMTP)
│
▼
MySQL Database (Aiven Cloud)
```

## 🗄️ Database Design

**Main entities:**
- `User`
- `Product`
- `Category`
- `Inventory`
- `Cart`
- `CartItem`
- `Order`
- `OrderItem`
- `Voucher`

**Relationships:**
- One `User` → Many `Orders`
- One `Order` → Many `OrderItems`
- One `Category` → Many `Products`
- One `Product` → Many `Inventory Records`

## 📸 Screenshots

### 1. Homepage & Voucher Center
![Homepage](assets/home.png)

### 2. Product Listing & Categories
![Products](assets/products.png)

### 3. Shopping Cart
![Cart](assets/cart.png)

### 4. Admin Dashboard
![Admin Dashboard](assets/admin.png)

> **Lưu ý:** Bạn hãy tạo một thư mục tên là `assets` trong project, sau đó lưu 4 bức ảnh bạn vừa gửi với các tên `home.png`, `products.png`, `cart.png`, và `admin.png` vào đó, rồi xoá dòng lưu ý này đi là ảnh sẽ tự động hiển thị cực đẹp trên GitHub nhé!

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **State Management:** React Context API

### Backend
- **Core:** Java 17, Spring Boot 3
- **Security:** Spring Security, JWT (JSON Web Tokens)
- **Database ORM:** Spring Data JPA (Hibernate)
- **Database Migration:** Flyway
- **Payment Integration:** PayOS

### Infrastructure & Deployment
- **Database:** MySQL (Hosted on Aiven Cloud)
- **Deployment Hosting:** Vercel (Frontend), Render (Backend)

## ✨ Key Features
- **User Authentication:** Secure login and registration using JWT.
- **Product Management:** Browse fresh food categories, search, and view detailed product pages.
- **Shopping Cart & Checkout:** Intuitive cart management with secure payment processing via PayOS integration.
- **Voucher System:** Apply promotional discount codes directly at checkout.
- **Order Management:** Track order lifecycle and view purchase history.
- **Admin Dashboard:** Comprehensive dashboard for revenue tracking, order management, and inventory.
- **Email Notifications:** Automated email delivery for order confirmations via SMTP.

## 📂 Project Structure
- `/frontend` - Contains the React.js web application source code.
- `/demo` - Contains the Spring Boot backend REST APIs and business logic.
- `/scripts` - Helpful shell scripts for automation, testing, and deployment.

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Java 17 (JDK)
- Maven
- MySQL

### 1. Clone the repository
```bash
git clone https://github.com/taitran05072006/GoMart.git
cd GoMart
```

### 2. Backend Setup
Navigate to the backend directory and run the Spring Boot application:
```bash
cd demo
# Ensure you configure application.properties with your local MySQL credentials before running
./mvnw clean spring-boot:run
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```

## 👨‍💻 Author
**Tài Trần** 
- **Role:** Java Backend Developer Intern
- **GitHub:** [@taitran05072006](https://github.com/taitran05072006)
- **Email:** taitran05072006@gmail.com

---
*If you find this project helpful, please consider giving it a ⭐ on GitHub!*
