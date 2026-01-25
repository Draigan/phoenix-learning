# Deployment Instructions for VPS

## Step 1: Build the App

On your local machine:

```bash
npm run build
```

This creates the `dist` folder with all production files.

## Step 2: Upload Files to VPS

Transfer the dist folder to your VPS:

```bash
# Using rsync (recommended)
rsync -avz --progress dist/ your-user@YOUR_VPS_IP:/var/www/phoenix-learning/

# Or using scp
scp -r dist/* your-user@YOUR_VPS_IP:/var/www/phoenix-learning/
```

## Step 3: Install and Configure Nginx

SSH into your VPS:

```bash
ssh your-user@YOUR_VPS_IP
```

Install nginx (if not already installed):

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

## Step 4: Set Up the Site

Create the web directory:

```bash
sudo mkdir -p /var/www/phoenix-learning
sudo chown -R $USER:$USER /var/www/phoenix-learning
```

Copy the nginx configuration:

```bash
# Copy the nginx.conf file from this repo to your VPS, then:
sudo cp nginx.conf /etc/nginx/sites-available/phoenix-learning

# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/phoenix-learning /etc/nginx/sites-enabled/

# Remove default site if needed
sudo rm /etc/nginx/sites-enabled/default
```

## Step 5: Update Configuration

Edit the nginx config to match your setup:

```bash
sudo nano /etc/nginx/sites-available/phoenix-learning
```

Change `server_name your-domain.com;` to:
- Your domain: `server_name myapp.example.com;`
- Or your VPS IP: `server_name 123.45.67.89;`

## Step 6: Test and Start Nginx

Test the configuration:

```bash
sudo nginx -t
```

If test passes, restart nginx:

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx  # Start on boot
```

## Step 7: Configure Firewall

Allow HTTP traffic:

```bash
# UFW (Ubuntu)
sudo ufw allow 'Nginx Full'

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## Step 8: Access Your App

Open your tablet browser and go to:
- `http://YOUR_VPS_IP` or
- `http://your-domain.com`

## Adding HTTPS (Required for PWA)

PWAs require HTTPS. Install Let's Encrypt:

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

The certbot will automatically update your nginx config for HTTPS.

## Updating the App

When you make changes:

```bash
# 1. Build locally
npm run build

# 2. Upload to VPS
rsync -avz --progress dist/ your-user@YOUR_VPS_IP:/var/www/phoenix-learning/

# 3. Clear browser cache or the PWA will use cached version
```

## Troubleshooting

Check nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

Check nginx status:
```bash
sudo systemctl status nginx
```

Reload nginx after config changes:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
