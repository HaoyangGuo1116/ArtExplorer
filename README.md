# Art Collection Explorer with Favorites

This project is a full-stack web application. It allows users to search artworks from multiple museum collections, view detailed artwork information, read artist biographies, explore related works, view museum locations on an interactive map, and save favorite artworks locally.

The backend is built with Node.js and Express and works as an API proxy between the frontend and external services. It integrates the Metropolitan Museum of Art API, Harvard Art Museums API, and Wikipedia API. The Harvard API key is stored securely as an environment variable and is not exposed in client-side code.

The frontend is built with vanilla HTML, CSS, and JavaScript. Bootstrap 5 is used for responsive layouts, cards, pagination, and tabbed detail views. Leaflet.js is used to display museum locations on an interactive map. Browser localStorage is used to persist users’ favorite artworks across sessions.

The application has been containerized with Docker and deployed to Google Cloud Run.

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap 5
- Backend: Node.js, Express
- APIs: Met Museum API, Harvard Art Museums API, Wikipedia API
- Map: Leaflet.js
- Storage: Browser localStorage
- Deployment: Docker, Google Cloud Run

## Live Demo

https://art-explorer-5182563266.us-central1.run.app
