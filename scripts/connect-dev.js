#!/usr/bin/env node

const { execSync } = require('child_process');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { updateSshAccess } = require('./update-ssh-access.js');

const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });

async function findDevInstance() {
  try {
    const command = new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'tag:Name',
          Values: ['RecogBackendStack/RecogDevHost']
        },
        {
          Name: 'instance-state-name',
          Values: ['running']
        }
      ]
    });
    
    const response = await ec2Client.send(command);
    if (response.Reservations && response.Reservations.length > 0) {
      const instances = response.Reservations.flatMap(reservation => reservation.Instances);
      if (instances.length > 0) {
        return instances[0];
      }
    }
    throw new Error('Running development instance not found');
  } catch (error) {
    console.error('Error finding development instance:', error);
    process.exit(1);
  }
}

async function connectViaSsh(instance) {
  try {
    console.log('🔧 Updating SSH access...');
    await updateSshAccess('add');
    
    console.log('🔗 Connecting to development instance via SSH...');
    console.log(`Instance ID: ${instance.InstanceId}`);
    console.log(`Public IP: ${instance.PublicIpAddress}`);
    console.log(`Public DNS: ${instance.PublicDnsName}`);
    
    // Use the user's existing SSH key
    const sshCommand = `ssh -i ~/.ssh/id_ed25519 ec2-user@${instance.PublicIpAddress}`;
    console.log(`Executing command: ${sshCommand}`);
    console.log('Note: Using your existing SSH key (id_ed25519)');
    
    execSync(sshCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error('SSH connection failed:', error.message);
    console.log('Please check:');
    console.log('1. SSH key file exists and has correct permissions');
    console.log('2. Key file path is correct');
    console.log('3. Instance is running');
    console.log('4. Your public key has been added to the instance');
  }
}

async function connectViaSsm(instance) {
  try {
    console.log('🔗 Connecting to development instance via SSM Session Manager...');
    console.log(`Instance ID: ${instance.InstanceId}`);
    
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

async function main() {
  const method = process.argv[2] || 'ssm';
  
  if (!['ssh', 'ssm'].includes(method)) {
    console.log('Usage: node connect-dev.js [ssh|ssm]');
    console.log('  ssh - Connect to development instance via SSH (requires SSH key)');
    console.log('  ssm - Connect to development instance via SSM Session Manager (recommended)');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Finding development instance...');
    const instance = await findDevInstance();
    
    if (method === 'ssh') {
      await connectViaSsh(instance);
    } else {
      await connectViaSsm(instance);
    }
  } catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findDevInstance, connectViaSsh, connectViaSsm };
