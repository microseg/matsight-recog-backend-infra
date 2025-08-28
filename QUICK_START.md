# Quick Start Guide

## 🚀 One-Click Deployment

### Windows PowerShell (Recommended)
```powershell
.\setup-dev.ps1
```

### Windows Command Prompt
```cmd
setup-dev.bat
```

### Linux/macOS
```bash
./setup-dev.sh
```

## 📋 Manual Deployment Steps

If you prefer manual operation, follow these steps:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build Project**
   ```bash
   npm run build
   ```

3. **Deploy Infrastructure**
   ```bash
   npm run deploy
   ```

## 🔗 Connect to Development Environment

After deployment, you can connect to the development instance using the following methods:

### Method 1: SSM Session Manager (Recommended)
```bash
npm run connect-dev-ssm
```

### Method 2: SSH Connection
```bash
# Add SSH access
npm run add-ssh

# Connect to instance
npm run connect-dev-ssh

# Remove access after completion
npm run remove-ssh
```

## 🛠️ Common Commands

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy infrastructure |
| `npm run connect-dev-ssm` | Connect to development instance via SSM |
| `npm run add-ssh` | Add current IP's SSH access |
| `npm run remove-ssh` | Remove current IP's SSH access |
| `npm run destroy` | Destroy all infrastructure |

## 🔧 Troubleshooting

### Deployment Failed
1. Ensure AWS CLI is installed and configured
2. Check if AWS credentials are valid
3. Confirm you have sufficient permissions

### Connection Failed
1. Ensure instance is running
2. Check security group configuration
3. Confirm SSM Agent is installed

### Permission Issues
Ensure your AWS user has the following permissions:
- EC2 related permissions
- SSM related permissions
- IAM related permissions

## 📞 Getting Help

If you encounter issues:
1. Check `README.md` for detailed documentation
2. Check AWS CloudFormation console for error messages
3. Check AWS CloudWatch logs
