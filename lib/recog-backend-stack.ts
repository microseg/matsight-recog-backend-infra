import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class RecogBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1) Use the DEFAULT VPC (no NAT/ALB costs)
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // 2) Security Group for Production EC2: no inbound (we'll use SSM Session Manager)
    const prodSg = new ec2.SecurityGroup(this, 'RecogProdSg', {
      vpc,
      description: 'Production recognition backend SG (no inbound; outbound allowed)',
      allowAllOutbound: true,
    });

    // 3) Security Group for Development EC2: allow SSH from your IP + SSM
    const devSg = new ec2.SecurityGroup(this, 'RecogDevSg', {
      vpc,
      description: 'Development recognition backend SG (SSH + SSM access)',
      allowAllOutbound: true,
    });

    // Allow SSH from your IP (you can update this IP as needed)
    devSg.addIngressRule(
      ec2.Peer.ipv4("172.249.64.126/32"), // replace with your real IP
      ec2.Port.tcp(22),
      "Allow SSH from my workstation"
    );

    // 4) EC2 Role: SSM core + CloudWatch Agent
    const ec2Role = new iam.Role(this, 'RecogEc2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'EC2 role for recognition backend (SSM + CloudWatch)',
    });
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );
    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
    );

    // 5) User data for both instances
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'set -eux',
      'sudo apt-get update -y || true',
      'sudo apt-get install -y git python3 python3-pip python3-venv build-essential curl unzip tmux',
      'mkdir -p /home/ec2-user/app/out && chown -R ec2-user:ec2-user /home/ec2-user/app',
      // Install SSM agent for better session management
      'sudo systemctl enable amazon-ssm-agent',
      'sudo systemctl start amazon-ssm-agent'
    );

    // 6) Production EC2 instance (existing)
    const prodInstance = new ec2.Instance(this, 'RecogProdHost', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: prodSg,
      role: ec2Role,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(100, { encrypted: true }),
        },
      ],
      userData,
      detailedMonitoring: false,
    });

    // 7) Development EC2 instance (new)
    const devInstance = new ec2.Instance(this, 'RecogDevHost', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: devSg,
      role: ec2Role,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM), // Smaller instance for dev
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(50, { encrypted: true }), // Smaller volume for dev
        },
      ],
      userData,
      detailedMonitoring: false,
    });

    // 8) Outputs
    new CfnOutput(this, 'ProdInstanceId', { value: prodInstance.instanceId });
    new CfnOutput(this, 'ProdPublicDnsName', { value: prodInstance.instancePublicDnsName });
    new CfnOutput(this, 'ProdSgId', { value: prodSg.securityGroupId });
    
    new CfnOutput(this, 'DevInstanceId', { value: devInstance.instanceId });
    new CfnOutput(this, 'DevPublicDnsName', { value: devInstance.instancePublicDnsName });
    new CfnOutput(this, 'DevSgId', { value: devSg.securityGroupId });
    
    // SSM Session Manager connection info
    new CfnOutput(this, 'DevSsmConnectCommand', { 
      value: `aws ssm start-session --target ${devInstance.instanceId}`,
      description: 'Command to connect to dev instance via SSM Session Manager'
    });
  }
}
