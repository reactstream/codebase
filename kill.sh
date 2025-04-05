#!/bin/bash

#sudo lsof -i tcp:80
#sudo lsof -i tcp:3010
#sudo lsof -i tcp:3020
# kill -9 $(lsof -t -i tcp:80)


# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "Checking port $port..."

    PIDS=$(sudo lsof -t -i tcp:$port -s tcp:listen)
    if [ -n "$PIDS" ]; then
        echo "Killing processes on port $port: $PIDS"
        echo "$PIDS" | sudo xargs kill
        echo "Processes on port $port have been terminated."
    else
        echo "No processes found listening on port $port"
    fi
}

# Display current status before killing
echo "Current processes on specified ports:"
sudo lsof -i tcp:80
sudo lsof -i tcp:3010
sudo lsof -i tcp:3020

echo -e "\nProceeding to kill processes on ports 80, 3010, and 3020...\n"

# Kill processes on each specified port
kill_port 80
kill_port 3010
kill_port 3020

echo -e "\nOperation completed."
