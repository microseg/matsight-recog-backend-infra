# Deployment Flow: Development to Production

## Overview
A single-source deployment guide for Matsight backend.
Flow: Development EC2 → GitHub (main) → CodePipeline/CodeBuild → Production EC2 (via SSM).

## Prerequisites
- AWS account with permissions for CodePipeline/CodeBuild/EC2/SSM/Secrets Manager
- Production EC2 provisioned by CDK (`RecogBackendStack/RecogProdHost`)
- SSM Agent running on EC2 (CDK user data already enables it)
- Node.js + AWS CLI locally

## GitHub Token Setup (Secrets Manager)
Use a Personal Access Token to allow CodePipeline GitHub Source to pull code.
1. Create a GitHub classic token with scopes: `repo`, `admin:repo_hook`
2. Store in Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name "github-token" \
  --description "GitHub Personal Access Token for CI/CD Pipeline" \
  --secret-string "<YOUR_TOKEN>"
```
(If it exists, use `update-secret`.)

## Pipeline Components
- Source: GitHub repository `microseg/MaterialRecognitionService` (branch `master`)
- Build: CodeBuild project `MatsightDeployBuild`
- Deploy: Python script runs in CodeBuild, uses SSM `SendCommand` to deploy on prod EC2
- Artifacts: S3 bucket `matsight-artifacts-<account>-<region>`

## How to Deploy
- Commit and push to `master` in `MaterialRecognitionService`:
```bash
git add .
git commit -m "feat: ..."
git push origin master
```
- Pipeline runs automatically
- Monitor:
```bash
npm run pipeline-status
aws codebuild list-builds-for-project --project-name MatsightDeployBuild --max-items 1
```

## Inspect & Debug on Production
- Start a Session Manager shell (Console → Systems Manager → Session Manager → Start session) or via CLI:
```bash
aws ssm start-session --target <ProdInstanceId>
```
- Useful commands on EC2:
```bash
ls -la /opt/matsight/current
sudo systemctl status matsight-backend --no-pager
journalctl -u matsight-backend -n 200 -e
sudo systemctl restart matsight-backend
curl http://127.0.0.1:8000/health
```

## Temporary Public Access (Port 8000)
- Open (temporary, for debugging):
```bash
SG_ID=<your prod sg id>
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0
```
- Restrict to your IP:
```bash
aws ec2 revoke-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr <YOUR_IP>/32
```
- Close:
```bash
aws ec2 revoke-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr <YOUR_IP>/32
```

## Security Notes
- Prefer SSM Session Manager; keep SSH closed
- Use HTTPS for public APIs (ALB + ACM) in production
- Apply least privilege security groups; avoid `0.0.0.0/0` except temporary debugging
- Consider API Gateway/ALB as public entry and keep EC2 private

## Troubleshooting
- Pipeline Source fails: check Secrets Manager `github-token` and GitHub repo/branch
- Build fails: open CodeBuild logs; ensure `deploy_script.py` exists in repo root
- SSM fails: verify EC2 role has `AmazonSSMManagedInstanceCore` and agent is running
- Service down: `journalctl -u matsight-backend -f` and `sudo systemctl restart matsight-backend`

---
Last Updated: 2025-08-29
