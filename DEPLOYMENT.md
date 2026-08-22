# Step-by-Step Ultimate AWS Deployment Guide (For Beginners)

This guide is written specifically for a brand new AWS user. It will tell you exactly where to click, what to type, and what names to use so you don't get lost. Keep this guide open side-by-side with your AWS Console.

---

## Step 1: IAM (Identity and Access Management)
*IAM is how you give permissions to different parts of AWS so they can talk to each other safely.*

1. Log into your AWS Console.
2. In the top search bar, type **IAM** and click the first result.
3. On the left menu, click **Roles**.
4. Click the orange **Create role** button on the right.
5. Under "Trusted entity type", select **AWS service**.
6. Under "Use case", choose **EC2**, then click **Next** at the bottom.
7. You are now on the "Add permissions" page. In the search box, type `AmazonS3FullAccess`. Press Enter. Check the little box next to it.
8. Clear the search box, and type `CloudWatchAgentServerPolicy`. Press Enter. Check the box next to it.
9. Click **Next** at the bottom.
10. Under "Role name", type exactly: `SchoolClinic-EC2-Role`.
11. Scroll to the bottom and click **Create role**.

---

## Step 2: Security Groups (Virtual Firewalls)
*Security Groups control who is allowed to access your servers (like a bouncer at a club).*

1. In the top search bar, type **EC2** and click the first result.
2. On the far-left menu, scroll down to "Network & Security" and click **Security Groups**.
3. Click the orange **Create security group** button.

**Create the EC2 Security Group:**
1. **Security group name:** Type `Clinic-EC2-SG`
2. **Description:** Type `Allows web and SSH access to EC2`
3. Under **Inbound rules**, click **Add rule**:
   - **Type:** Select `SSH`
   - **Source:** Select `Anywhere-IPv4` (or `My IP` for extra security).
4. Click **Add rule** again:
   - **Type:** Select `HTTP`
   - **Source:** Select `Anywhere-IPv4`
5. Scroll down and click **Create security group**.

**Create the RDS (Database) Security Group:**
1. Go back to the **Security Groups** page and click **Create security group** again.
2. **Security group name:** Type `Clinic-RDS-SG`
3. **Description:** Type `Allows EC2 to connect to the database`
4. Under **Inbound rules**, click **Add rule**:
   - **Type:** Select `MySQL/Aurora` (This automatically sets Port to 3306).
   - **Source:** Click the search box and type `Clinic-EC2-SG`. Select the security group you created in the previous step. *(This ensures ONLY your web server can talk to your database!)*
5. Scroll down and click **Create security group**.

---

## Step 3: Amazon RDS (Your MySQL Database)
*RDS manages your database so you don't have to install MySQL manually.*

1. In the top search bar, type **RDS** and click the first result.
2. Click the orange **Create database** button.
3. Choose **Standard create**.
4. Engine options: Select **MySQL**.
5. **CRITICAL STEP**: Under "Templates", select **Free tier**! If you miss this, you will be charged money.
6. **DB instance identifier:** Type `schoolclinic-db`
7. **Master username:** Type `admin`
8. **Master password:** Type `ClinicPassword123!` (and confirm it). Write this down!
9. Scroll down to **Connectivity**:
   - **Public access:** Select **No**.
   - **VPC security group (firewall):** Choose **Choose existing**.
   - **Existing VPC security groups:** Remove the "default" one, and select `Clinic-RDS-SG` (the one you made in Step 2).
10. Open the **Additional configuration** drop-down near the bottom:
    - **Initial database name:** Type `schoolclinic_db` *(This tells AWS to automatically create the database for you so you don't have to run CREATE DATABASE manually).*
11. Scroll to the very bottom and click **Create database**.
12. *Note: It will take about 5-10 minutes to create. Once the status says "Available", click on `schoolclinic-db` and copy the **Endpoint** string (it looks like a long URL). Save this for later.*

---

## Step 4: Amazon S3 (File Storage for Profile Pictures)
*S3 is a cloud folder where uploaded images are stored.*

1. In the top search bar, type **S3** and click the first result.
2. Click the orange **Create bucket** button.
3. **Bucket name:** Type `schoolclinic-assets-[YOUR-NAME]-[RANDOM-NUMBERS]` (e.g., `schoolclinic-assets-john-9912`). *Note: Bucket names must be completely unique globally across all of AWS, so you cannot just name it "schoolclinic-assets".*
4. Scroll down to "Block Public Access settings for this bucket".
5. **Uncheck** the box that says "Block all public access".
6. Check the warning acknowledgment box that pops up underneath.
7. Scroll to the bottom and click **Create bucket**.

---

## Step 5: Amazon EC2 (Hosting your Code)
*EC2 is the virtual computer running Linux that will host your Node.js and React code.*

1. In the top AWS search bar, type **EC2** and click it.
2. Click the orange **Launch instance** button.
3. **Name:** Type `Clinic-Web-Server`
4. **Application and OS Images:** Select **Ubuntu** (Make sure the "Ubuntu Server 24.04 LTS" says "Free tier eligible").
5. **Instance type:** Leave it as `t2.micro` (Free tier eligible).
6. **Key pair (login):** 
   - Click **Create new key pair**.
   - **Key pair name:** Type `clinic-key`
   - **Key pair type:** RSA
   - **Private key file format:** .pem
   - Click **Create key pair**. *A file named `clinic-key.pem` will download to your computer. DO NOT LOSE THIS FILE. You need it to log into your server.*
7. **Network settings:** 
   - Click **Edit** (the little button in the corner of this section).
   - **Firewall (security groups):** Click **Select existing security group**.
   - Choose `Clinic-EC2-SG` from the dropdown.
8. Expand the **Advanced details** section at the very bottom.
   - Scroll down to **IAM instance profile**.
   - Select `SchoolClinic-EC2-Role` from the dropdown. (This gives your server permission to upload to S3).
9. Click the orange **Launch instance** button on the right.

---

## Step 6: Deploying the Code
*Now we put your code onto the EC2 server.*

1. Go to the EC2 Dashboard, click **Instances**, and click on `Clinic-Web-Server`.
2. Click the **Connect** button at the top.
3. Choose the **EC2 Instance Connect** tab and click **Connect**. A black terminal window will open in your browser.

**Run these exact commands one by one in the black terminal:**

1. Update the server:
   ```bash
   sudo apt update
   ```
2. Install Node.js, npm, and Git:
   ```bash
   sudo apt install -y nodejs npm git
   ```
3. Clone your GitHub repository (replace the URL with your actual GitHub link):
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
4. Enter the backend folder:
   ```bash
   cd YOUR_REPO_NAME/backend
   ```
5. Install backend packages:
   ```bash
   npm install
   ```
6. Create the `.env` file using the Nano text editor:
   ```bash
   nano .env
   ```
7. Paste the following into the editor (Use Right-Click to paste). Replace the bracketed text with your actual AWS details!
   ```env
   PORT=5000
   DB_HOST=schoolclinic-db.xxxxxx.us-east-1.rds.amazonaws.com
   DB_USER=admin
   DB_PASSWORD=ClinicPassword123!
   DB_NAME=schoolclinic_db
   JWT_SECRET=mySuperSecretKey123!
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=schoolclinic-assets-john-9912
   ```
8. Save and exit Nano: Press `Ctrl + O`, then `Enter`, then `Ctrl + X`.
9. Load your database tables:
   > **Important:** Use single quotes on the outside to avoid bash treating `!` as a special character.
   ```bash
   node -e 'const fs=require("fs");const mysql=require("mysql2/promise");require("dotenv").config();mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,multipleStatements:true}).then(c=>c.query(fs.readFileSync("schema.sql","utf8")).then(()=>{console.log("Tables created!");process.exit(0)}))'
   ```
10. Start the backend forever using PM2:
    ```bash
    sudo npm install -g pm2
    pm2 start server.js --name "clinic-backend"
    ```

**Now, start the Frontend:**
1. Go to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install packages and build the React app:
   ```bash
   npm install
   npm run build
   ```
3. Serve the frontend forever on Port 80 (the default website port):
   ```bash
   sudo npm install -g serve
   sudo pm2 start serve --name "clinic-frontend" -- -s dist -l 80
   ```

**You are done!** You can now go to your EC2 instance in AWS, copy the **Public IPv4 address**, paste it into your browser, and your application will be live!
