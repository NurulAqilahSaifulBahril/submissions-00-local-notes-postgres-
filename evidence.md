# Evidence

## Docker Desktop

Docker Desktop showing the engine running `docker info` output

to view full refer [docker-info.txt](https://github.com/user-attachments/files/27390390/docker-info.txt)

<br>
<img width="496" height="513" alt="docker info" src="https://github.com/user-attachments/assets/8d9a706d-545c-4ac9-9f24-39247a4acc82" />
<br>

- docker was blocked as i cannot run as administrator
  
## Postgres container

- data is stored in compose.yaml
- Proof the container is up `docker ps` showing `postgres`

<br>
<img width="718" height="267" alt="docker ps" src="https://github.com/user-attachments/assets/765cbc91-2526-4aa0-8912-ae371a4beb95" />
<br>

## App + DB

Proof the app serves on localhost and persists notes

 a. **Local Notetaking app**: 
    http://localhost:3000 
    **Page HTML**: 
    index.html 
    - structure, scripts, CSS links
    **Frontend**: 
    app.js 
    - runs in the browser; calls /api/...
    /api/health, /api/folders, /api/notes
    - REST API
    **Backend**: 
    server/index.js
    -  API Express app 
     server/db.js
     - DB acess

    - http://localhost:3000 loads index.html, which loads app.js and styles.css. They are not separate URLs unless explicitly open /app.js; usually  stay on / or path the server maps to index.html.
 
 b. server started 
 terminal line:
 - notes-app-server with PORTS showing 0.0.0.0:3000->3000/tcp
 - notes-app-postgres with PORTS showing 0.0.0.0:5432->5432/tcp
 
 c. app running on localhost

<br>
<img width="772.5" height="444" alt="app running on localhost" src="https://github.com/user-attachments/assets/26b2c43c-8d6a-4c59-b24d-74f481f534d5" />
<br>

 d. note saved

<br>
<img width="1882" height="907" alt="note saved" src="https://github.com/user-attachments/assets/35589edd-95eb-418b-b0ea-4941b7d0eed4" />
<br>

 e. after refresh (note still there)

<br>
<img width="1871" height="961" alt="note still there when reload" src="https://github.com/user-attachments/assets/8822523a-7765-4e1b-8d57-e505da2209aa" />
<br>

## Postgres data

Proof rows exist in the database from your test 

`docker exec … psql … SELECT`

docker exec notes-app-postgres psql -U notes_user -d notes_app -c "SELECT COUNT(*) AS notes_count FROM notes; SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC LIMIT 5;"

expected proof output (from your environment) is:
- notes_count = 1
- row exists, e.g.
98cb598e-943c-43f1-9455-00bd437ba4db | db-proof-20260505-171032 | 2026-05-05 ...

## Git
