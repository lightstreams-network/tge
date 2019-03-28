#!/usr/bin/env bash
set -eu
echo "Starting Ganache..."
ganache-cli -m "soup behave plastic gift bounce tobacco leader siren company tennis double ethics" -p 9545 2>&1 &
G_PID="$?"
trap "kill $G_PID" EXIT
sleep 1
C=0
while :; do
    if nc -z localhost 9545; then
        break
    fi
    kill -0 "$G_PID" || {
        echo "Error: ganache crashed. Check the logs and try again?"
        exit 1
    }
    sleep 1
done
echo "Ganache started. Running tests..."
npm run test-ganache