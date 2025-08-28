# Multi-Platform User Management Guide

This guide explains how to create and manage independent EC2 instances for users on different platforms (iOS, Windows, Linux).

## 🚀 Quick Start

### 1. Create New User

#### Linux User (Default)
```bash
npm run user-create john
```

#### Windows User
```bash
npm run user-create jane windows
```

#### iOS User (Using Linux Instance)
```bash
npm run user-create alice
```

### 2. Connect to User Instance

#### Via SSM (Recommended, works for all platforms)
```bash
npm run connect-user john
```

#### Via SSH (Linux only)
```bash
npm run connect-user john ssh
```

### 3. Manage Users

```bash
# List all users
npm run user-list

# Delete user
npm run user-delete john

# View user connection information
npm run users
```

## 📱 Platform-Specific Guides

### iOS Users

iOS users typically connect using SSM Session Manager through the following methods:

#### Method 1: AWS CLI (Recommended)
```bash
# Install AWS CLI on Mac
brew install awscli

# Configure AWS credentials
aws configure

# Connect to instance
aws ssm start-session --target <instance-id>
```

#### Method 2: AWS Console
1. Log into AWS Console
2. Navigate to EC2 service
3. Select instance
4. Click "Connect" → "Session Manager" → "Connect"

#### Method 3: Mobile Devices
- Use AWS Console mobile app
- Access AWS Console through browser

### Windows Users

Windows users can connect using the following methods:

#### Method 1: SSM Session Manager (Recommended)
```bash
npm run connect-user jane
```

#### Method 2: Remote Desktop (RDP)
1. Get the instance's public IP address
2. Use Windows Remote Desktop Connection
3. Enter instance IP address and credentials

#### Method 3: SSH (if OpenSSH is configured)
```bash
npm run connect-user jane ssh
```

### Linux Users

Linux users can use all connection methods:

#### Method 1: SSM Session Manager (Recommended)
```bash
npm run connect-user john
```

#### Method 2: SSH
```bash
npm run connect-user john ssh
```

## 🛠️ Advanced Management

### Batch User Creation

```bash
# Create multiple Linux users
npm run user-create developer1
npm run user-create developer2
npm run user-create developer3

# Create multiple Windows users
npm run user-create designer1 windows
npm run user-create designer2 windows
```

### User Permission Management

Each user has independent:
- EC2 instance
- IAM role
- Security group
- Instance profile

### Cost Optimization

- All user instances use T3.medium (lower cost)
- Can stop instances when not in use
- Support auto stop/start strategies

## 📋 User Management Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `npm run user-create <username>` | Create Linux user | `npm run user-create john` |
| `npm run user-create <username> windows` | Create Windows user | `npm run user-create jane windows` |
| `npm run user-list` | List all users | `npm run user-list` |
| `npm run user-delete <username>` | Delete user | `npm run user-delete john` |
| `npm run connect-user <username>` | Connect to user instance | `npm run connect-user john` |
| `npm run connect-user <username> ssh` | SSH to user instance | `npm run connect-user john ssh` |
| `npm run users` | View user connection info | `npm run users` |

## 🔧 Troubleshooting

### Common Issues

#### 1. User Creation Failed
```bash
# Check AWS permissions
aws sts get-caller-identity

# Check VPC and subnets
aws ec2 describe-vpcs --filters "Name=is-default,Values=true"
```

#### 2. Connection Failed
```bash
# Check instance status
aws ec2 describe-instances --instance-ids <instance-id>

# Check SSM Agent
aws ssm describe-instance-information
```

#### 3. Windows Instance Connection Issues
- Ensure instance is fully started
- Check if security group allows RDP (port 3389)
- Use SSM Session Manager as alternative

### Platform-Specific Issues

#### iOS
- Ensure AWS CLI version is up to date
- Check network connectivity
- Use AWS Console as alternative

#### Windows
- Ensure instance has sufficient startup time
- Check Windows firewall settings
- Verify RDP service is running

#### Linux
- Check SSH key permissions
- Verify security group rules
- Ensure SSH service is running

## 📞 Getting Help

If you encounter issues:

1. Check user list: `npm run user-list`
2. Check instance status: `npm run users`
3. Check AWS CloudWatch logs
4. Check AWS CloudFormation stack status

## 🔒 Security Best Practices

1. **Principle of Least Privilege**: Each user has only necessary permissions
2. **SSM First**: Prioritize SSM Session Manager over SSH
3. **Regular Cleanup**: Delete user instances when no longer needed
4. **Access Monitoring**: Use AWS CloudTrail to monitor access logs
5. **Patch Updates**: Regularly update instance operating systems
