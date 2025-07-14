# NEXRAD Data Viewer

<img width="1793" height="1031" alt="Screenshot 2025-07-13 at 6 50 18 PM" src="https://github.com/user-attachments/assets/ac88437b-700b-41d1-b6be-1cb582fea4d9" />


## 🧭 Summary

This is a full-stack web platform designed to visualize **NEXRAD Level II radar reflectivity**. Data is pulled from the NEXRAD AWS Open Data archives, processed by a python backend, and rendered over a map via a Next.js frontend. My aim was to go with a full-stack/balanced approach with efficient backend processing and an appealing frontend.

Features
- Access real time reflectivity data from any NEXRAD station
- View precipitation rendered over a map
- Specify desired tilt
- Time slider for showing multiple recent scans in an animation

## Setup
Start up both frontend and backend w/ the commands below. The backend should be running on port 8000.
For frontend: `cd frontend && npm install && npm run dev`

For backend: `cd backend && pip install -r requirements.txt && fastapi run`

Initial load will take a bit since there isn't any pre-processing.

## ⚙️ Tech Specs/Design Decisions

### Frontend (Next.js + Leaflet)
Chose Next.js for the front end stack: quick to set up, fast, and easily scaleable to a production deployment. The main pieces are:
- Tool box, with options to change station, tilt, and reflectivity frame
- Map render w/ rasterized reflectivity images overlayed.

The toolbox is just using simple UI components styled with tailwind. For the map, I chose Leaflet since it is easy to set up (no api key needed) and works well enough for rendering simple images over the map, especially only one at a time. 

For a prod setup: I'd still use Next.js, but probably go with Mapbox given it has more powerful rendering capabilities and better support for vector tiles. 



### Backend (FastAPI)
FastAPI python server which uses the `nexradaws` library to pull NEXRAD Level 2 data, process and render into rasterized reflectivity images, and serve to client via exposed APIs.
- **Architecture**: Set up as event driven for the purposes of this project and due to time limitations, which means data is pulled from AWS and processed only after the user interacts with the frontend. This means intial loads are slow, but speed up on subsequent loads due to caching.
- **Caching**: Files are downloaded from AWS and cached. Rasterized images are also cached after they are generated along with some metadata for rendering on the frontend. Any time these need to be accessed again (ex. subsequent loads/changing stations) the cached data will be reused.
- **Rasterization**: Used pyart to convert polar reflectivity data into rasterized images w/ color coded reflectivity values (10 dBZ threshold)

For a prod setup:
- Use a pre-processing pipeline where data is downloaded from AWS and processed ahead of time, drastically speeding up rendering times on the frontend (downloads and pyart's `read_nexrad_archive` and `grid_from_radars` functions are expensive)
- Improved caching infrastructure, using an indexed relational db for metadata lookup, Redis for keeping recent scans hot, and s3 buckets for long-term storage and CDN


## With More Time

There's a lot more I'd do with this project given more time. Some of the main ones:

#### Finding ideal targets for seeding
- Use processed reflectivity and echo top data, analyzed over time, to identify seeding candidates

#### Enhanced data visualizations
- Use differential reflectivity from dual-polarization radar data to include info on precipitation type/particle orientation
- Leverage multiple tilt angles for 3d cell visualization

#### Echo top estimation
- Analyze all reflectivity tilts for a cell to derive vertical storm structure
- Identify mature clouds, possibly suitable for seeding

#### SNOTEL Delta Tracking
- Show 24-hour SWE/snow depth changes

#### Vector-tile based rendering approach for radar maps
- Move from a single image (current) to a vector tile approach, allowing aggregation of radar data from multiple stations and rendering across the entire us
- Allow scaled resolution (ex. local renders and country-wide)
