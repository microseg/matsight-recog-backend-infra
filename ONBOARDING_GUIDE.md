# Complete Guide: Onboarding New Team Members to AWS EC2 Development Environment

---

## Part 1: FOR ACCOUNT OWNER: AWS Account Owner Setup (One-time)

### 1.1 Create IAM Identity Center User for New Team Member

#### Step 1: Create User in IAM Identity Center
1. Log into AWS Console as account owner
2. Go to **IAM Identity Center** → **Users** → **Add user**
3. Enter user information:
   - **Username**: `[team-member-alias]`
   - **Email address**: `[team-member-alias]@company.com`
   - **First name**: [First Name]
   - **Last name**: [Last Name]
   - **Display name**: [Full Name]
4. Click **Next** → **Add user**

#### Step 2: Send Invitation
1. After user creation, the system will send an invitation email
2. **Forward the invitation email to the team member**

### 1.2 Create/Configure Permission Sets (if not exists)

#### Step 1: Create Permission Set
1. Go to **IAM Identity Center** → **Permission sets** → **Create permission set**
2. Enter details:
   - **Name**: `EC2-Developer-Access`
   - **Description**: `Access for EC2 development and user management`
3. Click **Next**

#### Step 2: Attach Policies
1. Select **"Attach managed policies"**
2. Search and attach these policies:
   - `AmazonEC2FullAccess`
   - `AmazonSSMFullAccess`
   - `IAMReadOnlyAccess`
3. Click **Next** → **Create**

#### Step 3: Assign Permission Set to Group
1. Go to **Groups** → Select your developer group
2. Click **Permission sets** → **Assign permission sets**
3. Select the `EC2-Developer-Access` permission set
4. Choose the appropriate AWS accounts
5. Click **Submit**

---

## Part 2: FOR NEW TEAM MEMBER: New Team Member Setup

### Prerequisites
- Computer with internet access
- Basic command line knowledge
- IAM Identity Center invitation email

---

## Step 1: Accept IAM Identity Center Invitation

### 1.1 Accept Invitation
1. Check your email for the invitation from AWS
2. Click the invitation link
3. Create your password
4. **Set up MFA (Multi-Factor Authentication) - Required**

### 1.2 Access AWS Console
1. Go to [AWS SSO Portal](https://d-9067c30fde.awsapps.com/start)
2. Sign in with your credentials
3. Select the appropriate AWS account
4. Choose your role (EC2-Developer-Access)

---

## Step 2: Install Required Tools (On your local computer)

### 2.1 Install Node.js
1. Go to [Node.js Official Website](https://nodejs.org/)
2. Download the LTS version for your operating system
3. Install with default settings
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2.2 Install AWS CLI v2
1. Go to [AWS CLI Installation Guide](https://aws.amazon.com/cli/)
2. Download the appropriate version for your OS
3. Install with default settings
4. Verify installation:
   ```bash
   aws --version
   ```

### 2.3 Install Git
1. Go to [Git Official Website](https://git-scm.com/)
2. Download and install for your OS
3. Verify installation:
   ```bash
   git --version
   ```

### 2.4 Install VS Code (Recommended)
1. Go to [VS Code Official Website](https://code.visualstudio.com/)
2. Download and install for your OS
3. Install "Remote - SSH" extension

---

## Step 3: Configure AWS SSO

### 3.1 Configure AWS SSO Profile
```bash
aws configure sso
```

Enter the following when prompted:
- **SSO start URL**: `https://d-9067c30fde.awsapps.com/start`
- **SSO Region**: `us-east-1`
- **Profile name**: `[your-alias]-dev`
- **CLI default client Region**: `us-east-1`
- **CLI default output format**: `json`

### 3.2 Login to AWS SSO
```bash
aws sso login --profile [your-alias]-dev
```

### 3.3 Verify Configuration
```bash
aws sts get-caller-identity --profile [your-alias]-dev
```

You should see your account information.

---

## Step 4: Download and Setup Infrastructure Code

### 4.1 Clone the Repository
```bash
git clone https://github.com/microseg/matsight-recog-backend-infra.git
cd matsight-recog-backend/infra
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Build the Project
```bash
npm run build
```

---

## Step 5: Generate SSH Key Pair

### 5.1 Create SSH Key
```bash
ssh-keygen -t ed25519 -C "[your-email]@example.com"
```

- Press Enter for default location (`~/.ssh/id_ed25519`)
- Enter a passphrase (recommended) or press Enter for no passphrase

### 5.2 Verify Key Creation
```bash
ls ~/.ssh/
```

You should see `id_ed25519` and `id_ed25519.pub`

---

## Step 6: Create Your Personal Development Instance

### 6.1 Set AWS Profile for Commands
```bash
export AWS_PROFILE=[your-alias]-dev
```

### 6.2 Create User Instance
```bash
npm run user-create [your-alias]
```

**Expected Output:**
```
🚀 Creating linux instance for user [your-alias]...
✅ Created linux instance for user [your-alias]
Instance ID: i-xxxxxxxxxxxxxxxxx
Instance Type: t3.medium
✅ User [your-alias] created successfully!
```

### 6.3 Verify Instance Creation
```bash
npm run user-list
```

---

## Step 7: Add SSH Key to Your Instance

### 7.1 Get Your Public Key
```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519`)

### 7.2 Create JSON File for SSM Command
Create a file named `add-ssh-key-[your-alias].json`:
```json
{
  "commands": [
    "mkdir -p /home/ec2-user/.ssh",
    "echo 'YOUR_PUBLIC_KEY_HERE' >> /home/ec2-user/.ssh/authorized_keys",
    "chmod 700 /home/ec2-user/.ssh",
    "chmod 600 /home/ec2-user/.ssh/authorized_keys",
    "chown -R ec2-user:ec2-user /home/ec2-user/.ssh"
  ]
}
```

Replace `YOUR_PUBLIC_KEY_HERE` with your actual public key.

### 7.3 Execute SSM Command
```bash
aws ssm send-command --instance-ids [YOUR_INSTANCE_ID] --document-name "AWS-RunShellScript" --parameters file://add-ssh-key-[your-alias].json --profile [your-alias]-dev
```

Replace `[YOUR_INSTANCE_ID]` with your actual instance ID from Step 6.2.

---

## Step 8: Connect to Your Instance

### 8.1 Method 1: VS Code Remote Window (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Type "Remote-SSH: Connect to Host"
4. Select "Add New SSH Host"
5. Enter: `ssh -i ~/.ssh/id_ed25519 ec2-user@[YOUR_INSTANCE_PUBLIC_IP]`
6. **Select SSH config file location** (choose the first option - user config file)
7. Click "Connect"
8. Select "Linux" when prompted for platform

**Note**: If VS Code SSH connection fails, try direct SSH connection first to verify connectivity.

**To save connection for future use:**
- After successful connection, the host will be saved in your SSH config
- Next time, you can select the saved host from the Remote-SSH list instead of entering the full SSH command

### 8.2 Method 2: Use npm Script
```bash
npm run connect-user [your-alias]
```

### 8.3 Method 3: Direct SSH Command
```bash
ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 ec2-user@[YOUR_INSTANCE_PUBLIC_IP]
```

**To get your instance IP:**
```bash
aws ec2 describe-instances --instance-ids [YOUR_INSTANCE_ID] --query 'Reservations[0].Instances[0].PublicIpAddress' --output text --profile [your-alias]-dev
```

---

## Step 9: Setup Development Environment

### 9.1 Update System and Install Tools
```bash
sudo yum update -y
sudo yum install -y git python3 python3-pip python3-devel gcc make
```

### 9.2 Create Project Directory
```bash
mkdir -p ~/projects
cd ~/projects
```

### 9.3 Create Python Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 9.4 Test Your Environment
```bash
cat > hello.py << 'EOF'
print('Hello from my EC2 instance!')
EOF
python3 hello.py
```

**Expected Output:**
```
Hello from my EC2 instance!
```

---

## Management Commands

### For Team Members
```bash
# Set your AWS profile
export AWS_PROFILE=[your-alias]-dev

# List your instances
npm run user-list

# Connect to your instance
npm run connect-user [your-alias]

# View connection information
npm run users
```

### For Account Owner
```bash
# List all users
npm run user-list

# Delete user instance
npm run user-delete [user-alias]

# View all user connections
npm run users
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "SSO session expired"
**Solution:**
```bash
aws sso login --profile [your-alias]-dev
```

#### Issue 2: "Permission denied"
**Solution:**
- Check if you're using the correct AWS profile
- Verify your permission set includes necessary policies
- Contact account owner to review permissions

#### Issue 3: "SessionManagerPlugin is not found"
**Solution:**
- Use VS Code Remote Window or direct SSH connection
- The npm script will automatically use SSH if SSM fails

#### Issue 4: "InvalidParameterValue: Value for parameter iamInstanceProfile.name is invalid"
**Solution:**
- This is a transient error, try running the command again
- Ensure username is not too long (max 64 characters for role name)

#### Issue 5: SSH connection fails with "Permission denied (publickey)"
**Solution:**
- Verify SSH key was added correctly
- Check if public key is in `~/.ssh/authorized_keys` on the instance
- Ensure you're using the correct private key file

#### Issue 6: VS Code SSH connection fails with "Bad configuration option" or "no argument after keyword"
**Solution:**
- Delete corrupted SSH config file: `del C:\Users\[username]\.ssh\config` (Windows) or `rm ~/.ssh/config` (Linux/Mac)
- Or clear the file: `echo "" > C:\Users\[username]\.ssh\config`
- Recreate SSH config file with correct format if needed
- Try direct SSH connection first: `ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 ec2-user@[IP]`

#### Issue 7: VS Code SSH connection not saved for future use
**Solution:**
- Ensure you selected the SSH config file location when adding the host
- Manually edit SSH config file: `C:\Users\[username]\.ssh\config` (Windows) or `~/.ssh/config` (Linux/Mac)
- Add entry:
  ```
  Host [your-alias]-ec2
      HostName [YOUR_INSTANCE_IP]
      User ec2-user
      IdentityFile ~/.ssh/id_ed25519
      StrictHostKeyChecking no
  ```
- Restart VS Code and check Remote-SSH list

---

## Quick Reference

### Essential Commands
```bash
# Create user instance
npm run user-create [your-alias]

# List users
npm run user-list

# Connect to instance (VS Code or SSH)
npm run connect-user [your-alias]

# Get instance IP
aws ec2 describe-instances --instance-ids [INSTANCE_ID] --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### VS Code Remote Connection
1. **Open Remote Window**: `Ctrl+Shift+P` → "Remote-SSH: Connect to Host"
2. **SSH Command**: `ssh -i ~/.ssh/id_ed25519 ec2-user@[IP]`
3. **Platform**: Select "Linux"
4. **Save Connection**: Select SSH config file location to save for future use

### SSH Configuration Troubleshooting
- **Delete corrupted config**: `del C:\Users\[username]\.ssh\config` (Windows)
- **Test direct connection**: `ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 ec2-user@[IP]`
- **Verify SSH key**: `ls ~/.ssh/` should show `id_ed25519` and `id_ed25519.pub`

### File Locations
- **SSH Key**: `~/.ssh/id_ed25519`
- **SSH Public Key**: `~/.ssh/id_ed25519.pub`
- **Project Directory**: `~/projects/`
- **Virtual Environment**: `~/projects/venv/`

---

**Last Updated**: 8/28/2025
**Version**: 3.4
**For**: Team Members and Account Owner (IAM Identity Center)
**Based on**: Real-world debugging experience with xuanzhiz setup, SSH configuration issues, and VS Code connection persistence
