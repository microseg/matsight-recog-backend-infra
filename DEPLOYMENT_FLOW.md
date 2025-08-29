# Deployment Flow: Development to Production

## Overview

This document explains the deployment flow from development EC2 instances to production.

## Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     GitHub      │    │   Production    │
│      EC2        │    │   (main branch) │    │      EC2        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   1. Develop    │    │  2. Push Code   │    │  5. Auto Deploy │
│   & Test Code   │───▶│   to main       │───▶│   to Production │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ 3. GitHub Actions│
                       │   (Trigger)     │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ 4. AWS CodePipeline│
                       │   (Build & Deploy)│
                       └─────────────────┘
```

## Step-by-Step Process

### Step 1: Development on EC2
- **Location**: Your personal development EC2 instance
- **Action**: Develop and test your code
- **Tools**: VS Code Remote, SSH, local development environment

### Step 2: Push to GitHub
- **Location**: GitHub repository
- **Action**: Push tested code to main branch
- **Trigger**: `git push origin main`

### Step 3: GitHub Actions Trigger
- **Location**: GitHub Actions
- **Action**: Automatically triggered by push to main
- **Result**: Starts AWS CodePipeline

### Step 4: AWS CodePipeline
- **Location**: AWS CodePipeline
- **Action**: Orchestrates the deployment process
- **Components**: CodeBuild project, deployment script

### Step 5: Production Deployment
- **Location**: Production EC2 instance
- **Action**: Automatic deployment via SSM
- **Result**: Production gets updated with new code

## Key Benefits

### 🔄 **Clear Separation**
- Development happens on individual EC2 instances
- Production is the only target for automated deployment
- No interference between developers

### 🚀 **Automated Workflow**
- Code push = automatic production deployment
- No manual intervention required
- Consistent deployment process

### 🛡️ **Safety**
- Development instances remain independent
- Production only gets code from main branch
- Rollback capability available

## Usage Examples

### For Developers
```bash
# 1. Connect to your development EC2
ssh -i ~/.ssh/id_ed25519 ec2-user@[YOUR_DEV_EC2_IP]

# 2. Develop your code
cd ~/projects/your-project
# ... make changes and test ...

# 3. Push to GitHub
git add .
git commit -m "feat: Add new feature"
git push origin main

# 4. Production automatically deploys!
```

### For Production Monitoring
```bash
# Check production deployment status
npm run pipeline-status

# View deployment logs
aws codepipeline list-pipeline-executions --pipeline-name MatsightDeployPipeline

# Check production service
curl http://[PRODUCTION_IP]:8000/health
```

## Environment Roles

### Development EC2 Instances
- **Purpose**: Individual development and testing
- **Deployment**: Manual (when needed)
- **Access**: SSH, VS Code Remote
- **Independence**: Each developer has their own instance

### Production EC2 Instance
- **Purpose**: Live production environment
- **Deployment**: Automatic via pipeline
- **Access**: SSM only (no direct SSH)
- **Source**: Code from GitHub main branch only

---

**Last Updated**: 8/28/2025
**Flow**: Development EC2 → GitHub → CodePipeline → Production EC2
