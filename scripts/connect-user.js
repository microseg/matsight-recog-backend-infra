#!/usr/bin/env node

const { execSync } = require('child_process');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { loadUsers } = require('./user-manager.js');

const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Get instance details
async function getInstanceDetails(instanceId) {
  try {
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId]
    });
    
    const response = await ec2Client.send(command);
    if (response.Reservations && response.Reservations.length > 0) {
      return response.Reservations[0].Instances[0];
    }
    throw new Error(`Instance ${instanceId} not found`);
  } catch (error) {
    console.error('Failed to get instance details:', error);
    throw error;
  }
}

// Connect to user instance
async function connectToUser(username, method = 'ssh') {
  try {
    const users = loadUsers();
    const user = users[username];
    
    if (!user) {
      console.error(`❌ User ${username} does not exist`);
      console.log('Available users:');
      Object.keys(users).forEach(u => console.log(`  - ${u}`));
      process.exit(1);
    }
    
    if (!user.instanceId) {
      console.error(`❌ User ${username} has no associated instance`);
      process.exit(1);
    }
    
    console.log(`🔍 Getting details for instance ${user.instanceId}...`);
    const instance = await getInstanceDetails(user.instanceId);
    
    if (instance.State.Name !== 'running') {
      console.error(`❌ Instance ${user.instanceId} is not running (current state: ${instance.State.Name})`);
      process.exit(1);
    }
    
    console.log(`✅ Found ${user.platform} instance for user ${username}`);
    console.log(`Instance ID: ${instance.InstanceId}`);
    console.log(`State: ${instance.State.Name}`);
    console.log(`Platform: ${user.platform}`);
    
    if (method === 'ssm') {
      await connectViaSsm(instance);
    } else if (method === 'ssh') {
      await connectViaSsh(instance, user.platform);
    } else {
      console.error(`❌ Unsupported connection method: ${method}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

// Connect via SSM
async function connectViaSsm(instance) {
  try {
    console.log('🔗 Connecting via SSM Session Manager...');
    
    const ssmCommand = `aws ssm start-session --target ${instance.InstanceId}`;
    console.log(`Executing command: ${ssmCommand}`);
    
    execSync(ssmCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error('SSM connection failed:', error.message);
    console.log('Please check:');
    console.log('1. AWS CLI is installed and configured');
    console.log('2. You have sufficient permissions to use SSM');
    console.log('3. SSM Agent is installed on the instance');
  }
}

// Connect via SSH
async function connectViaSsh(instance, platform) {
  try {
    console.log('🔗 Connecting via SSH...');
    
    let sshCommand;
    if (platform === 'windows') {
      // Windows instances use RDP or SSH (if OpenSSH is configured)
      console.log('⚠️  Windows instances typically use RDP connection');
      console.log('You can connect using the following methods:');
      console.log(`1. RDP: Use Remote Desktop to connect to ${instance.PublicIpAddress}`);
      console.log(`2. SSH: If OpenSSH is configured, use ssh Administrator@${instance.PublicIpAddress}`);
      console.log('');
      console.log('Recommended to use SSM Session Manager for Windows instances');
      return;
    } else {
      // Linux instances
      sshCommand = `ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519 ec2-user@${instance.PublicIpAddress}`;
    }
    
    console.log(`Executing command: ${sshCommand}`);
    console.log('Note: Please ensure you have the correct SSH key file');
    
    execSync(sshCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error('SSH connection failed:', error.message);
    console.log('Please check:');
    console.log('1. SSH key file exists and has correct permissions');
    console.log('2. Key file path is correct');
    console.log('3. Instance is running');
  }
}

// List all users and their connection information
function listUserConnections() {
  const users = loadUsers();
  
  if (Object.keys(users).length === 0) {
    console.log('No users found');
    return;
  }
  
  console.log('\n📋 User Connection Information:');
  console.log('='.repeat(100));
  console.log('Username'.padEnd(15) + 'Instance ID'.padEnd(20) + 'Platform'.padEnd(10) + 'SSM Connection Command');
  console.log('='.repeat(100));
  
  Object.entries(users).forEach(([username, user]) => {
    const ssmCommand = `aws ssm start-session --target ${user.instanceId}`;
    console.log(
      username.padEnd(15) + 
      user.instanceId.padEnd(20) + 
      user.platform.padEnd(10) + 
      ssmCommand
    );
  });
  console.log('='.repeat(100));
  console.log('');
  console.log('💡 Quick Connection Commands:');
  console.log('  npm run connect-user <username>     - Connect via SSH (default)');
  console.log('  npm run connect-user <username> ssm - Connect via SSM');
}

// Main function
async function main() {
  const username = process.argv[2];
  const method = process.argv[3] || 'ssh';
  
  if (!username) {
    console.log('Usage: node connect-user.js <username> [method]');
    console.log('');
    console.log('Parameters:');
    console.log('  username - Username to connect to');
    console.log('  method   - Connection method (ssh|ssm), default is ssh');
    console.log('');
    console.log('Examples:');
    console.log('  node connect-user.js john');
    console.log('  node connect-user.js jane ssh');
    console.log('  node connect-user.js list');
    console.log('');
    console.log('Special commands:');
    console.log('  list - List all users and their connection information');
    process.exit(1);
  }
  
  if (username === 'list') {
    listUserConnections();
    return;
  }
  
  if (!['ssm', 'ssh'].includes(method)) {
    console.error('❌ Unsupported connection method, please use ssm or ssh');
    process.exit(1);
  }
  
  await connectToUser(username, method);
}

if (require.main === module) {
  main();
}

module.exports = {
  connectToUser,
  listUserConnections,
  getInstanceDetails
};
