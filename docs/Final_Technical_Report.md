# Final Technical Report
## CSBC 252: Introduction to Cloud Computing - Capstone Project

**Project Title:** School Clinic Appointment System
**Group Name:** [Insert Group Name]
**Date:** [Insert Date]

---

## 1. Executive Summary
The School Clinic Appointment System is a cloud-native web application designed to streamline the process of booking and managing medical appointments between students and clinic staff. 

## 2. Problem Statement
Many educational institutions rely on manual, paper-based processes for managing clinic visits, leading to lost medical records, long waiting times, and scheduling conflicts. Our target users are university students needing medical attention and the clinical staff providing care.

## 3. Development Lifecycle
- **Frontend**: Developed using React, Vite, and Tailwind CSS.
- **Backend**: Developed using Node.js and Express.js, implementing a RESTful API.
- **Database**: Designed a normalized MySQL relational database schema.

## 4. Cloud Architecture Details
*(Detail how you used each AWS service as required by the rubric)*

### 4.1 IAM (Identity and Access Management)
We created a custom IAM role (`EC2-S3-CloudWatch-Access`) to ensure our EC2 instances follow the principle of least privilege, granting them only the permissions needed to upload files to S3 and send logs to CloudWatch.

### 4.2 Amazon EC2 & Security Groups
The application is hosted on `t2.micro` instances. Security groups were configured to ensure that SSH (Port 22) is restricted, HTTP (Port 80) is open for web traffic, and the database port (3306) is completely isolated from the public internet, only accepting traffic from the EC2 instances.

### 4.3 Amazon RDS
We provisioned a managed MySQL database using Amazon RDS to handle data persistence, ensuring high availability, automated backups, and scalability.

### 4.4 Amazon S3
To handle file uploads (e.g., student profile pictures and medical documents), we integrated Amazon S3, ensuring that heavy static assets do not consume EC2 block storage.

### 4.5 Amazon CloudWatch
We utilized CloudWatch to monitor the CPU utilization of our EC2 instances and the active database connections of our RDS instance to maintain system health.

## 5. Implementation Hurdles
*(Note to Student: Write a paragraph here about a challenge you faced. For example, configuring the CORS policy between the frontend and backend, or securely injecting the RDS Endpoint URL into the EC2 environment variables.)*

## 6. Testing Validation
We performed functional testing by:
1. Registering a new student and verifying the MySQL database insertion.
2. Logging in as an Admin to create Staff accounts.
3. Successfully booking and cancelling appointments to test the transaction rollbacks and notification triggers.

## 7. Future Expansion Scope
In the future, this system could be expanded by:
- Integrating Amazon SES (Simple Email Service) to send actual email notifications to students when appointments are cancelled.
- Implementing an Amazon ElastiCache (Redis) layer to speed up the fetching of available time slots.
