# System Design Document
## CSBC 252: Introduction to Cloud Computing - Capstone Project

**Project Title:** School Clinic Appointment System

---

### 1. Use Case Diagram
*(Note to Student: Draw this in draw.io or Lucidchart and insert the image below)*

**Actors:**
- Student (Patient)
- Staff (Doctor/Nurse)
- Administrator

**Key Use Cases:**
- **Student**: Register, Login, View Open Slots, Book Appointment, View Medical Records, Receive Notifications.
- **Staff**: Login, Manage Availability (Create/Cancel Slots), View Appointments, Complete Appointments, Write Medical Records.
- **Admin**: Login, View System Analytics, Add New Staff Members.

![Use Case Diagram Placeholder](./images/use-case-diagram.png)

---

### 2. Database Entity-Relationship Diagram (ERD)
*(Note to Student: Draw this in draw.io or MySQL Workbench and insert the image below)*

**Entities and Relationships:**
- **Users (1)** to **Students (1)**
- **Users (1)** to **Staff (1)**
- **Staff (1)** to **Time Slots (N)**
- **Students (1)** to **Appointments (N)**
- **Time Slots (1)** to **Appointments (1)**
- **Appointments (1)** to **Medical Records (1)**
- **Users (1)** to **Notifications (N)**

![ERD Placeholder](./images/erd.png)

---

### 3. AWS Architecture Diagram
*(Note to Student: Draw this in draw.io or AWS Architecture Tool and insert the image below. You can recreate the 3-tier architecture diagram from the Capstone PDF.)*

**Components to Include:**
- **Internet/Users** connecting to Application Load Balancer.
- **Application Load Balancer** distributing traffic to EC2 Instances.
- **EC2 Instances** hosting React Frontend & Node.js Backend.
- **Amazon RDS** database securely connected to EC2 instances.
- **Amazon S3** bucket connected to EC2 for file storage.
- **CloudWatch** monitoring all resources.

![AWS Architecture Diagram Placeholder](./images/aws-architecture.png)

---

### 4. UI Wireframes
*(Note to Student: Take screenshots of the running application or draw wireframes in Figma and insert them here)*

- **Screen 1**: Login / Registration Page
- **Screen 2**: Student Dashboard (Booking an appointment)
- **Screen 3**: Staff Dashboard (Managing schedule and completing appointments)
- **Screen 4**: Admin Dashboard (Viewing system health)
