#!/bin/bash
cd /home/node/.openclaw/workspace/deratisation/images/photos
# Rat - brown rat closeup (Pexels Chris F)
curl -sLo pexels-rat-01.jpg "https://images.pexels.com/photos/19029033/pexels-photo-19029033.jpeg?auto=compress&cs=tinysrgb&w=800"
# Mouse - two curious mice (Pexels Nikie Mmert)  
curl -sLo pexels-souris-01.jpg "https://images.pexels.com/photos/15119330/pexels-photo-15119330.jpeg?auto=compress&cs=tinysrgb&w=800"
# Bed bug - closeup bug on black surface (Pexels Pixabay)
curl -sLo pexels-punaise-01.jpg "https://images.pexels.com/photos/35804/armadillo-worm-bug-insect.jpg?auto=compress&cs=tinysrgb&w=800"
# Wasp/hornet - insect macro (Pexels Thales)
curl -sLo pexels-guepe-01.jpg "https://images.pexels.com/photos/36524989/pexels-photo-36524989.jpeg?auto=compress&cs=tinysrgb&w=800"
echo "Done"
ls -lh pexels-*-01.jpg
