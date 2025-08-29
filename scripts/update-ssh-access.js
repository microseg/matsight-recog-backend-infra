#!/usr/bin/env node

const { EC2Client, DescribeSecurityGroupsCommand, AuthorizeSecurityGroupIngressCommand, RevokeSecurityGroupIngressCommand } = require('@aws-sdk/client-ec2');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });
const stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function getCurrentIp() {
  try {
    const response = await fetch('https://checkip.amazonaws.com/');
    const ip = await response.text();
    return ip.trim();
  } catch (error) {
    console.error('Unable to get current IP address:', error);
    process.exit(1);
  }
}

async function getAccountId() {
  try {
    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);
    return response.Account;
  } catch (error) {
    console.error('Unable to get AWS account ID:', error);
    process.exit(1);
  }
}

async function findDevSecurityGroup() {
  try {
    const accountId = await getAccountId();
    const command = new DescribeSecurityGroupsCommand({
      Filters: [
        {
          Name: 'group-name',
          Values: ['*RecogDevSg*']
        },
        {
          Name: 'owner-id',
          Values: [accountId]
        }
      ]
    });
    
    const response = await ec2Client.send(command);
    if (response.SecurityGroups && response.SecurityGroups.length > 0) {
      return response.SecurityGroups[0];
    }
    throw new Error('Development environment security group not found');
  } catch (error) {
    console.error('Error finding security group:', error);
    process.exit(1);
  }
}

async function updateSshAccess(action = 'add') {
  try {
    const currentIp = await getCurrentIp();
    const securityGroup = await findDevSecurityGroup();
    
    console.log(`Current IP address: ${currentIp}`);
    console.log(`Security Group ID: ${securityGroup.GroupId}`);
    
    if (action === 'add') {
      const command = new AuthorizeSecurityGroupIngressCommand({
        GroupId: securityGroup.GroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [
              {
                CidrIp: `${currentIp}/32`,
                Description: 'SSH access from current IP'
              }
            ]
          }
        ]
      });
      
      await ec2Client.send(command);
      console.log(`✅ Added SSH access (${currentIp}/32)`);
    } else if (action === 'remove') {
      const command = new RevokeSecurityGroupIngressCommand({
        GroupId: securityGroup.GroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [
              {
                CidrIp: `${currentIp}/32`
              }
            ]
          }
        ]
      });
      
      await ec2Client.send(command);
      console.log(`✅ Removed SSH access (${currentIp}/32)`);
    }
  } catch (error) {
    if (error.name === 'InvalidPermission.Duplicate') {
      console.log('⚠️  SSH access already exists');
    } else if (error.name === 'InvalidPermission.NotFound') {
      console.log('⚠️  SSH access does not exist');
    } else {
      console.error('Error updating SSH access:', error);
    }
  }
}

async function main() {
  const action = process.argv[2] || 'add';
  
  if (!['add', 'remove'].includes(action)) {
    console.log('Usage: node update-ssh-access.js [add|remove]');
    console.log('  add    - Add SSH access for current IP');
    console.log('  remove - Remove SSH access for current IP');
    process.exit(1);
  }
  
  await updateSshAccess(action);
}

if (require.main === module) {
  main();
}

module.exports = { updateSshAccess, getCurrentIp };
