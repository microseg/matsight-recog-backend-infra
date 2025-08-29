# Deployment Guide: From Development to Production

This guide explains how to deploy code from your development EC2 instance to the production EC2 instance.

## Prerequisites

1. **Development EC2 Instance**: Your personal development environment
2. **Production EC2 Instance**: The production server (M5.xlarge)
3. **SSH Access**: Your SSH key must be added to both instances
4. **Network Access**: Development instance can access production instance

## Quick Deployment

### From Your Development EC2 Instance:

```bash
# Navigate to your project directory
cd ~/projects/your-project

# Deploy to production
npm run deploy-prod

# Or deploy from a specific directory
npm run deploy-prod /path/to/your/code
```

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Connect to Production Instance

```bash
# From your development EC2
ssh -i ~/.ssh/id_ed25519 ec2-user@[PRODUCTION_PRIVATE_IP]
```

### 2. Prepare Production Environment

```bash
# Update system
sudo yum update -y

# Install dependencies
sudo yum install -y git python3 python3-pip python3-devel gcc make

# Create deployment directory
sudo mkdir -p /opt/matsight
sudo chown ec2-user:ec2-user /opt/matsight
```

### 3. Copy Code from Development

```bash
# From development EC2, copy your code
rsync -avz --delete -e "ssh -i ~/.ssh/id_ed25519" \
  /path/to/your/code/ \
  ec2-user@[PRODUCTION_PRIVATE_IP]:/opt/matsight/current/
```

### 4. Deploy on Production

```bash
# On production EC2
cd /opt/matsight/current

# Set up Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up systemd service
sudo tee /etc/systemd/system/matsight-backend.service > /dev/null <<EOF
[Unit]
Description=Matsight Recognition Backend
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/matsight/current
Environment=PATH=/opt/matsight/current/venv/bin
ExecStart=/opt/matsight/current/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable matsight-backend
sudo systemctl start matsight-backend

# Check status
sudo systemctl status matsight-backend
```

## Service Management

### Check Service Status
```bash
sudo systemctl status matsight-backend
```

### View Logs
```bash
sudo journalctl -u matsight-backend -f
```

### Restart Service
```bash
sudo systemctl restart matsight-backend
```

### Stop Service
```bash
sudo systemctl stop matsight-backend
```

## Rollback

If you need to rollback to a previous version:

```bash
# List available backups
ls -la /opt/matsight/

# Rollback to a specific backup
sudo systemctl stop matsight-backend
sudo rm -rf /opt/matsight/current
sudo cp -r /opt/matsight/backup-YYYYMMDD-HHMMSS /opt/matsight/current
sudo systemctl start matsight-backend
```

## Security Notes

- Production instance allows SSH access only from development instance
- All deployments are logged and backed up
- Services run under `ec2-user` with appropriate permissions
- Systemd ensures automatic restart on failure

## Troubleshooting

### Connection Issues
```bash
# Test connectivity from dev to prod
ssh -i ~/.ssh/id_ed25519 ec2-user@[PRODUCTION_PRIVATE_IP] "echo 'Connection successful'"
```

### Service Issues
```bash
# Check service logs
sudo journalctl -u matsight-backend --no-pager

# Check if port is listening
sudo netstat -tlnp | grep :8000
```

### Permission Issues
```bash
# Fix ownership
sudo chown -R ec2-user:ec2-user /opt/matsight/current
```

---

**Last Updated**: 8/28/2025
**Version**: 1.0
