# Deployment Proof Portfolio

*(Note to Student: This document is meant to be exported as a PDF once you paste your screenshots into it)*

## 1. GitHub Repository
**Repository URL:** [Insert your GitHub URL here]

---

## 2. IAM Roles & Least Privilege
**Screenshot Required:**
- Take a screenshot of your AWS IAM Console showing the `EC2-S3-CloudWatch-Access` role.
- Ensure the attached policies (S3 access, CloudWatch access) are visible.

*(Insert Image Here)*

---

## 3. Running EC2 Instances
**Screenshot Required:**
- Take a screenshot of the AWS EC2 Dashboard showing your running instances (`t2.micro`).
- Make sure the "Instance State" shows as "Running" and the Status Checks are "2/2 checks passed".

*(Insert Image Here)*

---

## 4. Working Database (RDS)
**Screenshot Required:**
- Take a screenshot of your Amazon RDS Dashboard showing the MySQL instance in the "Available" state.
- Include a second screenshot of your local SQL client (e.g., phpMyAdmin, DBeaver) connected to the RDS endpoint, showing the 7 created tables (`users`, `appointments`, etc.).

*(Insert Image Here)*

---

## 5. Object Storage (S3)
**Screenshot Required:**
- Take a screenshot of your S3 Bucket containing an uploaded file (e.g., a profile picture or test document).

*(Insert Image Here)*

---

## 6. Monitoring (CloudWatch Metrics)
**Screenshot Required:**
- Take a screenshot of a CloudWatch Dashboard or Metric Graph showing CPU Utilization for your EC2 instance over the last 1 hour.

*(Insert Image Here)*

---

## 7. Public Application Access
**Screenshot Required:**
- Take a screenshot of the React application running in your browser, with the public ALB DNS URL (or EC2 Public IPv4 DNS) clearly visible in the browser's address bar.

*(Insert Image Here)*
