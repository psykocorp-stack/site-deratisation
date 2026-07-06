#!/bin/bash
# Download correct Pexels photos for the deratisation site
# Rat: Close-up of a brown rat in forest
curl -L -o /home/node/.openclaw/workspace/deratisation/images/photos/pexels-rat-01.jpg "https://images.pexels.com/photos/31370717/pexels-photo-31370717.jpeg?cs=srgb&dl=pexels-lichtblick800-31370717.jpg&fm=jpg"
# Mouse: Two curious mice
curl -L -o /home/node/.openclaw/workspace/deratisation/images/photos/pexels-souris-01.jpg "https://images.pexels.com/photos/15119330/pexels-photo-15119330.jpeg?cs=srgb&dl=pexels-nikiemmert-15119330.jpg&fm=jpg"
# Bed bug: Close-up bed bug on fabric  
curl -L -o /home/node/.openclaw/workspace/deratisation/images/photos/pexels-punaise-01.jpg "https://images.pexels.com/photos/35804/armadillo-worm-bug-insect.jpg?cs=srgb&dl=pexels-pixabay-35804.jpg&fm=jpg"
# Wasp: Will search and download separately
echo "Downloaded 3 images"
ls -la /home/node/.openclaw/workspace/deratisation/images/photos/pexels-*-01.jpg
