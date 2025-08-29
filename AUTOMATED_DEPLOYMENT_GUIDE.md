# Automated Deployment Pipeline Guide

This guide explains how to use the automated CI/CD pipeline for deploying code to all EC2 instances.

## Architecture Overview

```
开发EC2 → GitHub (main branch) → GitHub Actions → AWS CodePipeline → AWS CodeBuild → 生产EC2
```

## How It Works

1. **Development**: Code is developed and tested on development EC2 instances
2. **Code Push**: When code is pushed to the `main` branch on GitHub
3. **GitHub Actions**: Automatically triggers AWS CodePipeline
4. **CodePipeline**: Orchestrates the deployment process
5. **CodeBuild**: Executes deployment script on production instance
6. **SSM**: Deploys code to production EC2 instance only

## Setup Instructions

### 1. GitHub Repository Setup

1. **Create GitHub repository** (if not exists):
   ```bash
   git init
   git remote add origin https://github.com/your-org/matsight-recog-backend.git
   ```

2. **Add AWS credentials to GitHub Secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`: Your AWS access key
     - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### 2. Deploy Infrastructure

```bash
# Deploy the updated infrastructure with pipeline
npm run build
npm run deploy
```

### 3. Create CodeCommit Repository (Alternative)

If you prefer AWS CodeCommit instead of GitHub:

```bash
# Create CodeCommit repository
aws codecommit create-repository --repository-name matsight-recog-backend

# Get repository URL
aws codecommit get-repository --repository-name matsight-recog-backend
```

## Usage

### Automatic Deployment

1. **Develop on your EC2 instance**:
   ```bash
   # Connect to your development EC2
   ssh -i ~/.ssh/id_ed25519 ec2-user@[YOUR_DEV_EC2_IP]
   
   # Develop and test your code
   cd ~/projects/your-project
   # ... make changes ...
   ```

2. **Push code to main branch**:
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin main
   ```

3. **Pipeline automatically triggers**:
   - GitHub Actions starts AWS CodePipeline
   - CodeBuild deploys to production instance only
   - Production gets updated automatically

### Manual Deployment

```bash
# Start pipeline manually
aws codepipeline start-pipeline-execution --name MatsightDeployPipeline

# Check pipeline status
aws codepipeline get-pipeline-state --name MatsightDeployPipeline
```

### Check Deployment Status

```bash
# List all pipeline executions
aws codepipeline list-pipeline-executions --pipeline-name MatsightDeployPipeline

# Get specific execution details
aws codepipeline get-pipeline-execution \
  --pipeline-name MatsightDeployPipeline \
  --pipeline-execution-id <execution-id>
```

## Project Structure

Your project should have this structure:

```
your-project/
├── app.py                 # Main application
├── requirements.txt       # Python dependencies
├── README.md             # Project documentation
└── .github/
    └── workflows/
        └── deploy.yml    # GitHub Actions workflow
```

## Example Application

### app.py
```python
#!/usr/bin/env python3
from flask import Flask, jsonify
import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Matsight Recognition Backend',
        'timestamp': datetime.datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
```

### requirements.txt
```
Flask==2.3.3
Werkzeug==2.3.7
```

## Benefits

### ✅ **Automatic Deployment**
- No manual intervention required
- Code merge to main = automatic deployment

### ✅ **Focused Production Deployment**
- Only deploys to production instance
- Development instances remain independent
- Each developer can work on their own EC2 without interference

### ✅ **Production Environment**
- Production gets the latest code from main branch
- Consistent deployment process for production
- Development instances can have different versions for testing

### ✅ **Rollback Capability**
- Previous versions are backed up
- Easy rollback if needed

### ✅ **Monitoring & Logging**
- Deployment logs in AWS CloudWatch
- Pipeline execution history
- Service status monitoring

## Troubleshooting

### Pipeline Failed
```bash
# Check pipeline state
aws codepipeline get-pipeline-state --name MatsightDeployPipeline

# Check CodeBuild logs
aws codebuild list-builds --project-name MatsightDeployBuild
```

### Instance Not Updated
```bash
# Check SSM command status
aws ssm list-command-invocations --command-id <command-id>

# Check service status on instance
aws ssm send-command \
  --instance-ids <instance-id> \
  --document-name "AWS-RunShellScript" \
  --parameters '{"commands":["sudo systemctl status matsight-backend"]}'
```

### Service Issues
```bash
# Restart service on all instances
aws ssm send-command \
  --instance-ids <instance-id> \
  --document-name "AWS-RunShellScript" \
  --parameters '{"commands":["sudo systemctl restart matsight-backend"]}'
```

## Security Notes

- All deployments use SSM (no SSH keys required)
- Instances run with minimal required permissions
- Code is deployed to `/opt/matsight/current/`
- Services run under `ec2-user` with appropriate permissions
- All deployments are logged and auditable

---

**Last Updated**: 8/28/2025
**Version**: 1.0
**Pipeline**: GitHub Actions → AWS CodePipeline → AWS CodeBuild → SSM
