import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

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
    // Note: This security group is shared with existing user EC2 instances
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

    // Allow access from development instance for code deployment
    prodSg.addIngressRule(
      devSg,
      ec2.Port.tcp(22),
      "Allow SSH from development instance for code deployment"
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
      'sudo yum update -y',
      'sudo yum install -y git python3 python3-pip python3-devel gcc make curl unzip tmux',
      'mkdir -p /home/ec2-user/app/out && chown -R ec2-user:ec2-user /home/ec2-user/app',
      // Install and start SSM agent
      'sudo systemctl enable amazon-ssm-agent',
      'sudo systemctl start amazon-ssm-agent',
      'sudo systemctl status amazon-ssm-agent --no-pager'
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

    // 7) Development EC2 instance (new) - COMMENTED OUT to avoid conflicts with existing user EC2
    // const devInstance = new ec2.Instance(this, 'RecogDevHost', {
    //   vpc,
    //   vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    //   securityGroup: devSg,
    //   role: ec2Role,
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM), // Smaller instance for dev
    //   machineImage: ec2.MachineImage.latestAmazonLinux2023(),
    //   blockDevices: [
    //     {
    //       deviceName: '/dev/xvda',
    //       volume: ec2.BlockDeviceVolume.ebs(50, { encrypted: true }), // Smaller volume for dev
    //     },
    //   ],
    //   userData,
    //   detailedMonitoring: false,
    // });

    // 8) S3 Bucket for artifacts
    const artifactBucket = new s3.Bucket(this, 'MatsightArtifacts', {
      bucketName: `matsight-artifacts-${this.account}-${this.region}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 9) CodeBuild Project for deployment
    const buildProject = new codebuild.PipelineProject(this, 'MatsightDeployBuild', {
      projectName: 'MatsightDeployBuild',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        PROD_INSTANCE_ID: {
          value: prodInstance.instanceId,
        },
        PROD_PRIVATE_IP: {
          value: prodInstance.instancePrivateIp,
        },
        VPC_ID: {
          value: vpc.vpcId,
        },
        DEV_SG_ID: {
          value: devSg.securityGroupId,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo "Starting deployment build..."',
              'aws --version',
              'python3 --version',
              'pip3 install boto3 paramiko',
            ],
          },
          build: {
            commands: [
              'echo "Building and deploying application..."',
              'python3 deploy_script.py',
            ],
          },
        },
        artifacts: {
          files: ['deploy-output.json'],
        },
      }),
    });

    // Add SSM permissions to CodeBuild role
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:SendCommand',
        'ssm:GetCommandInvocation',
        'ssm:DescribeInstanceInformation',
        'ec2:DescribeInstances',
        'ec2:DescribeSecurityGroups',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*'],
    }));

    // 10) CodePipeline with GitHub source
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'MatsightPipeline', {
      pipelineName: 'MatsightDeployPipeline',
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'Source',
              owner: 'microseg',
              repo: 'MaterialRecognitionService',
              branch: 'master',
              oauthToken: cdk.SecretValue.secretsManager('github-token'), // 需要配置GitHub token
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });

    // 11) Outputs
    new CfnOutput(this, 'ProdInstanceId', { value: prodInstance.instanceId });
    new CfnOutput(this, 'ProdPublicDnsName', { value: prodInstance.instancePublicDnsName });
    new CfnOutput(this, 'ProdSgId', { value: prodSg.securityGroupId });
    
    // Note: Dev instance outputs removed since we're using existing user EC2 instances
    new CfnOutput(this, 'DevSgId', { value: devSg.securityGroupId });
    
    // SSM Session Manager connection info for existing user EC2
    new CfnOutput(this, 'UserEc2ConnectCommand', { 
      value: `aws ssm start-session --target i-02051d616ccf7dee8`,
      description: 'Command to connect to existing user EC2 instance via SSM Session Manager'
    });

    // Pipeline outputs
    new CfnOutput(this, 'PipelineName', { 
      value: pipeline.pipelineName,
      description: 'Name of the deployment pipeline'
    });
    
    new CfnOutput(this, 'ArtifactBucketName', { 
      value: artifactBucket.bucketName,
      description: 'S3 bucket for pipeline artifacts'
    });
  }
}
