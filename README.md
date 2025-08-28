# Matsight Recognition Backend Infrastructure

This CDK project manages the AWS infrastructure for Matsight recognition backend, supporting multi-user management and cross-platform access.

## Infrastructure Components

### Production Environment
- **EC2 Instance**: `RecogProdHost` - M5.xlarge instance
- **Security Group**: `RecogProdSg` - No inbound rules, SSM access only
- **Purpose**: Production environment services

### Development Environment
- **EC2 Instance**: `RecogDevHost` - T3.medium instance
- **Security Group**: `RecogDevSg` - Allows SSH and SSM access
- **Purpose**: Development environment, supports SSH and SSM connections

### Multi-User Environment
- **Dynamic EC2 Instances**: Creates independent T3.medium instances for each user
- **Platform Support**: Linux and Windows instances
- **Independent Permissions**: Each user has independent IAM roles and security groups
- **Purpose**: Supports iOS, Windows, Linux users for development

## Deployment

### Initial Deployment
```bash
# Install dependencies
npm install

# Build project
npm run build

# Deploy infrastructure
npm run deploy
```

### Update Deployment
```bash
npm run build
npm run deploy
```

## Connecting to Development Environment

### Method 1: SSM Session Manager (Recommended)
This is the most secure and convenient method, no SSH keys required, can connect from anywhere:

```bash
# Connect to development instance via SSM
npm run connect-dev-ssm

# Or use directly
aws ssm start-session --target <instance-id>
```

### Method 2: SSH Connection
If you need SSH connection, use the following commands:

```bash
# Add SSH access for current IP
npm run add-ssh

# Connect to development instance
npm run connect-dev-ssh

# Remove SSH access after completion
npm run remove-ssh
```

## Multi-User Management

### Creating New Users

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

### Connecting to User Instances

#### Via SSM (Recommended, works for all platforms)
```bash
npm run connect-user john
```

#### Via SSH (Linux only)
```bash
npm run connect-user john ssh
```

### Managing Users

```bash
# List all users
npm run user-list

# Delete user
npm run user-delete john

# View user connection information
npm run users
```

## SSH Access Management

### Add SSH Access
```bash
npm run add-ssh
```
This automatically detects your current IP address and adds it to the development instance security group.

### Remove SSH Access
```bash
npm run remove-ssh
```
This removes your current IP's SSH access from the development instance security group.

### Manual SSH Access Management
```bash
# Add access
node scripts/update-ssh-access.js add

# Remove access
node scripts/update-ssh-access.js remove
```

## Instance Information

After deployment, CDK outputs the following information:
- `ProdInstanceId` - Production instance ID
- `DevInstanceId` - Development instance ID
- `DevSsmConnectCommand` - SSM connection command

## Security Notes

1. **Production Instance**: No direct SSH access, only through SSM Session Manager
2. **Development Instance**: Supports both SSH and SSM connection methods
3. **User Instances**: Each user has independent instances and permissions
4. **SSH Access**: Dynamically managed, only added when needed, removed after use
5. **SSM Access**: Always available, recommended for use

## Cost Optimization

- Production instance uses M5.xlarge (on-demand pricing)
- Development instance uses T3.medium (lower cost)
- User instances use T3.medium (lower cost)
- Development instances can be stopped when not in use to save costs
- User instances support auto stop/start strategies

## Platform Support

### iOS Users
- Use SSM Session Manager for connection
- Support AWS CLI and AWS Console
- Mobile device friendly

### Windows Users
- Support SSM Session Manager and RDP
- Windows Server 2022 instances
- Complete Windows development environment

### Linux Users
- Support SSM Session Manager and SSH
- Amazon Linux 2023 instances
- Complete Linux development environment

## Troubleshooting

### SSM Connection Failed
1. Ensure AWS CLI is installed and configured
2. Check if instance is running
3. Confirm SSM Agent is installed on instance

### SSH Connection Failed
1. Ensure SSH access has been added (`npm run add-ssh`)
2. Check if SSH key file exists
3. Confirm instance is running

### User Creation Failed
1. Check if AWS permissions are sufficient
2. Confirm VPC and subnet configuration is correct
3. Verify IAM role creation permissions

### Permission Issues
Ensure your AWS user/role has the following permissions:
- EC2 related permissions
- SSM related permissions
- IAM related permissions (for role management)

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy infrastructure |
| `npm run connect-dev-ssm` | Connect to development instance via SSM |
| `npm run add-ssh` | Add current IP's SSH access |
| `npm run remove-ssh` | Remove current IP's SSH access |
| `npm run user-create <username>` | Create new user |
| `npm run user-list` | List all users |
| `npm run user-delete <username>` | Delete user |
| `npm run connect-user <username>` | Connect to user instance |
| `npm run users` | View user connection information |
| `npm run destroy` | Destroy all infrastructure |

## Documentation

- [Quick Start Guide](QUICK_START.md) - Quick deployment and connection guide
- [Multi-Platform User Management Guide](MULTI_PLATFORM_GUIDE.md) - Detailed user management instructions
