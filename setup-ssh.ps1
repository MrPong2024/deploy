# setup-ssh.ps1 - Setup SSH key for Auto Deploy
param()

Write-Host "SSH Key Setup for Auto Deploy" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

$dockerHost = "192.168.1.41"
$dockerUser = "pong" 
$dockerPassword = "0656076916"

# Check if SSH client exists
Write-Host "Checking for SSH client..." -ForegroundColor Yellow
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "SSH client found: $sshVersion" -ForegroundColor Green
}
catch {
    Write-Host "SSH client not found. Please install OpenSSH or Git for Windows" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Generate SSH key if not exists
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "Generating SSH key..." -ForegroundColor Yellow
    
    # Create .ssh directory
    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -Path $sshDir -ItemType Directory -Force | Out-Null
    }
    
    # Generate key
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""'
    Write-Host "SSH key generated successfully" -ForegroundColor Green
}
else {
    Write-Host "SSH key already exists" -ForegroundColor Green
}

# Copy SSH key to remote server
Write-Host ""
Write-Host "Setting up SSH key on remote server..." -ForegroundColor Yellow
Write-Host "Server: $dockerHost" -ForegroundColor Cyan
Write-Host "User: $dockerUser" -ForegroundColor Cyan
Write-Host ""

try {
    # Read public key
    $publicKeyPath = "$sshKeyPath.pub"
    if (Test-Path $publicKeyPath) {
        $publicKey = Get-Content $publicKeyPath -Raw
        $publicKey = $publicKey.Trim()
        
        # Command to setup authorized_keys on remote server
        $remoteCommand = "mkdir -p ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo 'SSH setup completed'"
        
        Write-Host "Running setup command on remote server..." -ForegroundColor Yellow
        Write-Host "You will need to enter the password: $dockerPassword" -ForegroundColor Cyan
        Write-Host ""
        
        # Execute remote command
        $output = ssh -o StrictHostKeyChecking=no $dockerUser@$dockerHost $remoteCommand
        
        if ($output -like "*SSH setup completed*") {
            Write-Host "SSH key installed successfully!" -ForegroundColor Green
            
            # Test SSH connection
            Write-Host "Testing SSH connection..." -ForegroundColor Yellow
            $testOutput = ssh -o StrictHostKeyChecking=no $dockerUser@$dockerHost "echo 'Test passed'"
            
            if ($testOutput -eq "Test passed") {
                Write-Host "SSH connection test successful!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Setup completed successfully!" -ForegroundColor Green
                Write-Host "You can now:" -ForegroundColor White
                Write-Host "1. Comment out DOCKER_PASSWORD in .env file" -ForegroundColor White
                Write-Host "2. Restart your Auto Deploy server" -ForegroundColor White
                Write-Host "3. Try deploying a website" -ForegroundColor White
            }
            else {
                Write-Host "SSH test failed, but key might be installed" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "SSH setup may have failed" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Public key file not found" -ForegroundColor Red
    }
}
catch {
    Write-Host "Error during SSH setup: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual setup instructions:" -ForegroundColor Yellow
    Write-Host "1. Copy the public key from: $publicKeyPath" -ForegroundColor White
    Write-Host "2. SSH to server: ssh $dockerUser@$dockerHost" -ForegroundColor White
    Write-Host "3. Add key to ~/.ssh/authorized_keys" -ForegroundColor White
}

Write-Host ""
Write-Host "Press Enter to continue..."
$null = Read-Host