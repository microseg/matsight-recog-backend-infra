# Matsight Development Environment Quick Setup Script (PowerShell)

Write-Host "🚀 Starting Matsight Development Environment Setup..." -ForegroundColor Green

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script in the infra directory" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js not installed" -ForegroundColor Red
    Write-Host "Please visit https://nodejs.org/ to install Node.js" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not found"
    }
    Write-Host "✅ AWS CLI version: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS CLI not installed" -ForegroundColor Red
    Write-Host "Please visit https://aws.amazon.com/cli/ to install AWS CLI" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

# Check AWS credentials
try {
    $callerIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        throw "AWS credentials not configured"
    }
    Write-Host "✅ AWS Account: $($callerIdentity.Account)" -ForegroundColor Green
    Write-Host "✅ AWS User: $($callerIdentity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Please run 'aws configure' to configure your AWS credentials" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host "✅ All dependency checks passed" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dependency installation failed" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Build project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Project build failed" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Deploy infrastructure
Write-Host "🚀 Deploying infrastructure..." -ForegroundColor Yellow
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Connect to development instance: npm run connect-dev-ssm" -ForegroundColor White
Write-Host "2. Or use SSH: npm run add-ssh && npm run connect-dev-ssh" -ForegroundColor White
Write-Host ""
Write-Host "📚 For more information, see README.md" -ForegroundColor Cyan
Read-Host "Press any key to exit"
