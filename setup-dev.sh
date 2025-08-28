#!/bin/bash

# Matsight Development Environment Quick Setup Script

set -e

echo "🚀 Starting Matsight Development Environment Setup..."

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script in the infra directory"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI not installed"
    echo "Please visit https://aws.amazon.com/cli/ to install AWS CLI"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS credentials not configured"
    echo "Please run 'aws configure' to configure your AWS credentials"
    exit 1
fi

echo "✅ AWS CLI and credentials check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

# Deploy infrastructure
echo "🚀 Deploying infrastructure..."
npm run deploy

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Connect to development instance: npm run connect-dev-ssm"
echo "2. Or use SSH: npm run add-ssh && npm run connect-dev-ssh"
echo ""
echo "📚 For more information, see README.md"
