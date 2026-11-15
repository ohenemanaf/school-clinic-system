# Deploying for free: TiDB Cloud + Render + Vercel

| Part | Host | Free tier notes |
|---|---|---|
| MySQL database | [TiDB Cloud Starter](https://tidbcloud.com) | MySQL-compatible, free monthly quota, no credit card. Aiven's free MySQL tier closed to new services in Nov 2026. |
| Express API | [Render](https://render.com) | Sleeps after 15 minutes idle. The first request after that takes about 30–50 s, and the frontend waits up to 60 s. |
| React frontend | [Vercel](https://vercel.com) | Static hosting; `frontend/vercel.json` already handles client-side routes. |

It takes about 20 minutes. Do the steps in this order, because each one needs a URL from the step before it.

## 1. Database (TiDB Cloud Starter)

1. Sign up at [tidbcloud.com](https://tidbcloud.com) and create a **Starter** cluster in the region nearest your users.
2. Open the cluster's **SQL Editor** and run `CREATE DATABASE clinic;`.
3. Click **Connect**, choose **General** as the connection type, and note the **Host**, **Port** (`4000`), **User** (it looks like `xxxxxxxx.root`) and **Password**. Generate a password if you don't have one yet.
4. TiDB's TLS certificate is signed by a public authority, so you don't need a CA file. Setting `DB_SSL=true` is enough.

You don't need to create any tables yourself. The API creates them on first start.

> **Note:** the app was tested on MySQL 8.4. TiDB is MySQL-compatible, and its docs say it supports everything the schema uses (stored generated columns with a unique index, `SELECT … FOR UPDATE`), but treat the first deploy as the test. If `npm run db:setup` fails in the Render logs, the simplest fallback is a paid MySQL host, such as Aiven's Developer plan.

## 2. API (Render)

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, then pick the repository. Render reads `render.yaml` and creates `campus-clinic-api`. It generates `JWT_SECRET` for you.
3. Fill in the values it asks for:

   | Key | Value |
   |---|---|
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | From TiDB's **Connect** dialog |
   | `DB_NAME` | `clinic` |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA` | Leave empty for TiDB. For a provider with a private CA, paste the full `ca.pem` here instead. |
   | `CORS_ORIGIN` | Leave as `http://localhost:5173` for now; you update it in step 4 |
   | `DEFAULT_ADMIN_EMAIL` | Your email |
   | `DEFAULT_ADMIN_PASSWORD` | A strong password of 12+ characters. You can remove it after the first deploy, because the admin already exists by then. |

4. Deploy. When it's live, open `https://<your-service>.onrender.com/api/health`. It should show `{"status":"ok"}`.

## 3. Frontend (Vercel)

1. **Add New → Project**, import the repository, and set **Root Directory** to `frontend`. Vercel detects Vite on its own.
2. Add the environment variables:
   - `VITE_API_URL` = `https://<your-service>.onrender.com/api`
   - Optional: `VITE_CLINIC_NAME` and `VITE_CLINIC_ADDRESS`. They appear on printed prescriptions.
3. Deploy, and copy the production URL (for example `https://campus-clinic.vercel.app`).

## 4. Connect them

Back in Render, set `CORS_ORIGIN` to your Vercel URL. To allow more than one URL, separate them with commas and no trailing slash. Saving redeploys the API.

Open the Vercel URL, sign in as the admin, add a staff member, then register a student account and book a visit.

## Optional: demo data

To give the live demo a doctor with open slots, open the Render **Shell** and run:

```bash
ALLOW_SEED=true SEED_STAFF_PASSWORD='<choose one>' npm run seed:demo
```

## Optional: profile photos

Photo uploads need an S3 bucket, or any S3-compatible store such as Cloudflare R2. Set `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. If the bucket is served from a custom domain, also set `AWS_S3_PUBLIC_URL`. Without these, the rest of the app works normally and the upload says photos are not enabled.

## Upgrading an existing database

`npm run db:setup` is safe to run against a database created by older versions of this project. It adds the `prescriptions` table and migrates `appointments`, so that a slot can be booked again after a student cancels. On Render this runs automatically on every start.
