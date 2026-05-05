# Notes

What you asked the AI, what confused you, what you decided

**1. Im bilding a local host app. Please summarise a simple plan for me and can I be able to execute by wednesday?

Day 1 — Database & environment

Install/verify Docker Desktop and run PostgreSQL in Docker (docker compose or equivalent).
Confirm I can connect from my machine (e.g. port mapped to localhost).
Create the notes table in Postgres.

Day 2 — Application

Build the Python web app on localhost: page with a text box, Save, and a list of notes.
Wire save and list to PostgreSQL (notes persist after refresh).
Quick test: create several notes, restart containers if needed, confirm data still behaves as expected.

Day 3 — Share 

Initialize Git, commit the code (docker-compose, app, requirements.txt).
Push to GitHub and send you the repository link.
Add a short README: how to start Postgres in Docker, how to run the app, and which localhost URL to open.

**2. cc
