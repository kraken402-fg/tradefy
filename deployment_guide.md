# Tradefy Deployment Guide

## Vercel Deployment for Frontend

1. **Install Vercel CLI**
   - Run `npm install -g vercel` to install the Vercel CLI globally.

2. **Login to Vercel**
   - Execute `vercel login` and follow the instructions to log in to your Vercel account.

3. **Initialize Vercel Project**
   - Navigate to the frontend directory: `cd frontend`
   - Run `vercel` to initialize the project.
   - Follow the prompts to set up the project, ensuring you select the correct scope and project name.

4. **Configure Vercel**
   - Ensure your `vercel.json` is properly configured:
     ```json
     {
       "version": 2,
       "builds": [
         { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "build" } }
       ],
       "routes": [
         { "src": "/(.*)", "dest": "/index.html" }
       ]
     }
     ```

5. **Deploy**
   - Run `vercel --prod` to deploy the application to production.

## Render Deployment for Backend

1. **Create Render Account**
   - Sign up at [Render](https://render.com/) if you don't have an account.

2. **Create New Web Service**
   - Choose to create a new web service.
   - Connect your GitHub repository containing the backend code.
   - Select the branch to deploy and choose Python as the environment.

3. **Configure Environment**
   - Set up environment variables as needed for database connections and API keys.

4. **Deploy**
   - Click 'Deploy' to start the deployment process.

5. **Monitor Deployment**
   - Use the Render dashboard to monitor the deployment status and logs.

---

Ensure all dependencies are installed and environment variables are correctly configured before deploying. Follow the steps carefully for a successful deployment.
