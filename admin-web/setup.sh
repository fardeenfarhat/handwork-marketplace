#!/bin/bash

echo "Setting up Handwork Marketplace Admin Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v) ✓"

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully ✓"
else
    echo "Failed to install dependencies ✗"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "REACT_APP_API_URL=http://localhost:8000" > .env
    echo ".env file created ✓"
fi

echo ""
echo "Setup completed successfully! 🎉"
echo ""
echo "To start the admin dashboard:"
echo "  npm start"
echo ""
echo "The dashboard will be available at http://localhost:3000"
echo ""
echo "Make sure your backend API is running on http://localhost:8000"
echo "or update the REACT_APP_API_URL in the .env file."