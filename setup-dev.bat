@echo off
REM Matsight Development Environment Quick Setup Script (Windows)

echo 🚀 Starting Matsight Development Environment Setup...

REM Check if in correct directory
if not exist "package.json" (
    echo ❌ Error: Please run this script in the infra directory
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js not installed
    echo Please visit https://nodejs.org/ to install Node.js
    pause
    exit /b 1
)

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: AWS CLI not installed
    echo Please visit https://aws.amazon.com/cli/ to install AWS CLI
    pause
    exit /b 1
)

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: AWS credentials not configured
    echo Please run 'aws configure' to configure your AWS credentials
    pause
    exit /b 1
)

echo ✅ AWS CLI and credentials check passed

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Build project
echo 🔨 Building project...
call npm run build

REM Deploy infrastructure
echo 🚀 Deploying infrastructure...
call npm run deploy

echo.
echo 🎉 Deployment completed!
echo.
echo 📋 Next Steps:
echo 1. Connect to development instance: npm run connect-dev-ssm
echo 2. Or use SSH: npm run add-ssh ^&^& npm run connect-dev-ssh
echo.
echo 📚 For more information, see README.md
pause
