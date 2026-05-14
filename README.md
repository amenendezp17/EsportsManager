# EsportsManager

Plataforma integral de gestión para clubes de deportes electrónicos. Centraliza la administración de equipos, jugadores, torneos e invitaciones en una sola aplicación, disponible tanto como aplicación web (Docker) como aplicación de escritorio (Electron).

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Tecnologías](#tecnologías)
3. [Puesta en Marcha](#puesta-en-marcha)
4. [Estructura del Proyecto](#estructura-del-proyecto)
   - [Raíz del Proyecto](#raíz-del-proyecto)
   - [Backend](#backend)
   - [Frontend (esports-admin)](#frontend-esports-admin)
   - [Electron (App de Escritorio)](#electron-app-de-escritorio)
5. [Roles de Usuario](#roles-de-usuario)
6. [Base de Datos (Supabase)](#base-de-datos-supabase)
7. [Variables de Entorno](#variables-de-entorno)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────┐
│                   Cliente                        │
│  Navegador (localhost) │ App Electron (icono)    │
└──────────────┬──────────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────────┐
│              Docker / Electron                   │
│  nginx (puerto 80)  ──/api/──►  Express (3000)  │
│  Sirve Angular dist            Node + TypeScript │
└──────────────────────────┬──────────────────────┘
                           │ Supabase Client
                  ┌────────▼────────┐
                  │    Supabase     │
                  │  (PostgreSQL)   │
                  └─────────────────┘
```

- **Web**: Docker Compose levanta nginx (Angular) + Node (API). Acceso en `http://localhost`.
- **Escritorio**: Electron embebe el backend y sirve la build de Angular internamente. Sin comandos — doble clic al icono.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17+ (standalone components, SCSS) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | Supabase (PostgreSQL gestionado) |
| Auth | JWT (JSON Web Tokens) |
| Web deploy | Docker + nginx |
| Desktop | Electron + NSIS installer |

---

## Puesta en Marcha

### Opción 1 — Web con Docker (recomendado para demos)

Requiere tener Docker Desktop instalado y en ejecución.

```bash
# Desde la raíz del proyecto:
docker-compose up --build
```

La aplicación estará disponible en `http://localhost`.  
No es necesario ningún otro comando. El backend y el frontend arrancan automáticamente.

### Opción 2 — App de Escritorio Electron

Ejecutar el instalador NSIS generado (`.exe`). Crea un acceso directo en el escritorio. Al hacer doble clic arranca tanto el backend como el frontend sin necesidad de ningún terminal.

### Opción 3 — Desarrollo local

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # TypeScript + nodemon, puerto 3000

# Terminal 2 — Frontend
cd esports-admin
npm install
ng serve           # Puerto 4200
```

---

## Estructura del Proyecto

### Raíz del Proyecto

| Archivo / Carpeta | Descripción |
|-------------------|-------------|
| `docker-compose.yml` | Orquesta los contenedores de nginx (frontend) y Node (backend). El servicio `frontend` sirve la build de Angular en el puerto 80 y redirige las peticiones `/api/*` al backend en el puerto 3000. |
| `.env.example` | Plantilla de variables de entorno necesarias. Copiar a `.env` en la raíz y en `backend/`. |
| `build-all.bat` | Script de Windows que compila el frontend Angular, compila el backend TypeScript y empaqueta la aplicación Electron. |
| `install-startup.bat` | Script que registra la aplicación para que arranque automáticamente con Windows (usado en demostraciones). |
| `start-web-demo.vbs` | Lanzador VBScript que abre el navegador en `http://localhost` tras iniciar Docker; permite abrir la demo sin abrir ninguna terminal. |
| `backend/` | API REST en Node/Express/TypeScript. |
| `esports-admin/` | SPA en Angular (frontend). |
| `electron/` | Envoltorio Electron para la app de escritorio. |

---

### Backend

Ubicación: `backend/`

#### `backend/src/index.ts`

Punto de entrada del servidor Express. Configura CORS, parseo JSON, monta todas las rutas (`/api/auth`, `/api/players`, `/api/teams`, `/api/tournaments`, `/api/invitations`, `/api/notifications`) y arranca el servidor en el puerto definido por `PORT` (por defecto 3000).

#### `backend/src/config/supabase.ts`

Inicializa y exporta el cliente de Supabase usando las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Se usa el **service role key** (no la anon key) para que el backend pueda leer y escribir ignorando las políticas RLS de Supabase.

---

#### Middleware (`backend/src/middleware/`)

| Archivo | Descripción |
|---------|-------------|
| `auth.ts` | Middleware `authenticateToken`. Extrae el JWT del header `Authorization: Bearer <token>`, lo verifica con `JWT_SECRET` y adjunta los datos del usuario (`req.user`) para que los controladores los usen. |
| `authorization.ts` | Middleware `authorize(roles[])`. Se usa tras `authenticateToken` para restringir rutas a roles concretos (p.ej. solo `admin`). Devuelve 403 si el usuario no tiene el rol requerido. |

---

#### Controladores (`backend/src/controllers/`)

| Archivo | Descripción |
|---------|-------------|
| `authController.ts` | **Autenticación y gestión de usuarios.** `register`: crea usuario en Supabase Auth + fila en tabla `users`. `login`: valida credenciales, genera JWT, devuelve datos del usuario. `getMe`: devuelve perfil del usuario autenticado. `getAllUsers`: solo admin — lista todos los usuarios de la tabla `users`. `updateUserRole`: solo admin — cambia el campo `role` de un usuario (no puede modificar su propia cuenta). `deleteUser`: solo admin — elimina un usuario de Auth y de `users`. |
| `playerController.ts` | **Gestión de perfiles de jugador.** `createPlayer`: crea un perfil vinculando `user_id` al juego seleccionado. `getAllPlayers`: devuelve todos los perfiles con datos de usuario y equipo (join). `deletePlayer`: elimina un perfil de jugador (admin). `getMyPlayerProfile`: devuelve el perfil del usuario autenticado para un juego concreto. |
| `teamController.ts` | **Gestión de equipos.** `createTeam`: crea un equipo con `manager_id` del usuario autenticado. `getAllTeams`: lista todos los equipos con sus jugadores. `getTeamById`: detalle de un equipo. `updateTeam`: actualiza nombre, logo, etc. (solo el manager del equipo o admin). `deleteTeam`: elimina el equipo y sus relaciones. `sendJoinRequest`: un jugador envía solicitud de unión a un equipo. `getMyTeamRequests`: el manager ve las solicitudes pendientes. `acceptRequest` / `rejectRequest`: el manager acepta o rechaza solicitudes. `getMyTeam`: devuelve el equipo del usuario autenticado en un juego concreto. `leaveTeam`: un jugador abandona su equipo. |
| `tournamentController.ts` | **Gestión de torneos.** `createTournament`: crea un torneo con campos: nombre, juego, participantes, fechas, premio, URL de Challonge, descripción. `getAllTournaments`: lista todos los torneos. `getTournamentById`: detalle de un torneo. `updateTournament`: actualiza datos (manager/admin). `deleteTournament`: elimina un torneo (admin). |
| `enrollmentController.ts` | **Inscripción a torneos.** `enrollInTournament`: inscribe al usuario en un torneo (inserta en `tournament_enrollments`). `unenrollFromTournament`: cancela la inscripción. `getMyEnrollments`: devuelve todos los torneos en los que está inscrito el usuario (join con tabla `tournaments`). `getEnrollmentStatus`: comprueba si el usuario está inscrito en un torneo concreto. |
| `invitationsController.ts` | **Invitaciones de equipo.** Un manager puede invitar a un jugador libre a su equipo. El jugador recibe la invitación, puede aceptarla (se añade al equipo) o rechazarla. Gestiona también las solicitudes de jugador hacia el equipo. |
| `notificationController.ts` | **Notificaciones en app.** Crea notificaciones cuando ocurren eventos (invitación recibida, solicitud aceptada, etc.). Permite marcar notificaciones como leídas individualmente o todas a la vez. |

---

#### Rutas (`backend/src/routes/`)

| Archivo | Prefijo | Rutas principales |
|---------|---------|-------------------|
| `authRoutes.ts` | `/api/auth` | `POST /register`, `POST /login`, `GET /me`, `GET /users` (admin), `PATCH /users/:id/role` (admin), `DELETE /users/:id` (admin) |
| `playerRoutes.ts` | `/api/players` | `GET /`, `POST /`, `GET /my`, `DELETE /:id` |
| `teamRoutes.ts` | `/api/teams` | `GET /`, `POST /`, `GET /my`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/join-request`, `GET /:id/join-requests`, `POST /:id/join-requests/:requestId/accept`, `POST /:id/join-requests/:requestId/reject`, `POST /:id/invite/:playerId`, `POST /leave` |
| `tournamentRoutes.ts` | `/api/tournaments` | `GET /`, `POST /`, `GET /my/enrollments` *(antes de `/:id`!)*, `GET /:id`, `GET /:id/enrollment-status`, `POST /:id/enroll`, `DELETE /:id/enroll`, `PUT /:id`, `DELETE /:id` |
| `invitationsRoutes.ts` | `/api/invitations` | `GET /my`, `POST /:id/accept`, `POST /:id/reject` |
| `notificationRoutes.ts` | `/api/notifications` | `GET /my`, `POST /:id/read`, `POST /read-all` |

> **Nota importante:** en `tournamentRoutes.ts` la ruta `GET /my/enrollments` está registrada **antes** que `GET /:id` para que Express no la interprete como un id con valor `"my"`.

---

#### Otros archivos de backend

| Archivo | Descripción |
|---------|-------------|
| `backend/Dockerfile` | Imagen Docker del backend: parte de `node:18-alpine`, copia fuentes, instala dependencias, compila TypeScript y arranca con `node dist/index.js`. |
| `backend/.env.example` | Variables requeridas: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `PORT`. |
| `backend/schema.sql` | DDL completo de las tablas de Supabase: `users`, `players`, `teams`, `tournaments`, `team_join_requests`, `team_invitations`, `notifications`. Incluye también la tabla `tournament_enrollments` (ejecutar en el SQL Editor de Supabase). |
| `backend/tsconfig.json` | Configuración de TypeScript: target ES2020, módulo CommonJS, outDir `dist/`. |
| `backend/package.json` | Dependencias: `express`, `@supabase/supabase-js`, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`. Dev: `typescript`, `ts-node`, `nodemon`, `@types/*`. |

---

### Frontend (esports-admin)

Ubicación: `esports-admin/`

SPA Angular 17+ con componentes standalone. Cada juego tiene su propio dashboard con tabs de Jugadores Libres, Equipos y Torneos.

#### Archivos raíz de la app (`esports-admin/src/app/`)

| Archivo | Descripción |
|---------|-------------|
| `app.ts` | Componente raíz. Contiene únicamente `<router-outlet>` para la navegación. |
| `app.routes.ts` | Definición de rutas: `/` → login, `/login` → login, `/signup` → registro, `/selector` → game-selector, `/lol` → lol-dashboard, `/valorant` → valorant-dashboard, `/inazuma` → inazuma-dashboard. |
| `app.config.ts` | Configuración de la app Angular: proveedores de router, `HttpClient` y `DatePipe`. |

---

#### Servicios (`esports-admin/src/app/services/`)

| Archivo | Descripción |
|---------|-------------|
| `api.service.ts` | **Servicio central HTTP.** Gestiona toda la comunicación con el backend. Mantiene el usuario autenticado en un `BehaviorSubject<User>` (observable `currentUser$`). Expone métodos para: autenticación (`login`, `register`, `getMe`), jugadores (`getAllPlayers`, `createPlayer`, `deletePlayer`), equipos (`getAllTeams`, `createTeam`, `updateTeam`, `deleteTeam`, `sendJoinRequest`, `acceptRequest`, `rejectRequest`, `getMyTeam`, `leaveTeam`, `sendTeamInvitation`), torneos (`getAllTournaments`, `createTournament`, `deleteTournament`), inscripciones (`enrollInTournament`, `unenrollFromTournament`, `getMyEnrollments`), invitaciones (`getMyInvitations`, `acceptInvitation`, `rejectInvitation`), notificaciones (`getMyNotifications`, `markNotificationRead`, `markAllNotificationsRead`) y administración (`getAllUsers`, `updateUserRole`, `deleteUser`). Inyecta automáticamente el JWT en cada petición. |
| `data.service.ts` | Servicio auxiliar que define el tipo `UserRole` (`'player' \| 'manager' \| 'admin' \| null`) y mantiene estado local de la sesión. Usado principalmente para compartir el rol entre componentes. |

---

#### Componentes (`esports-admin/src/app/components/`)

##### Autenticación

| Componente | Archivos | Descripción |
|------------|----------|-------------|
| `login/` | `login.ts`, `login.html`, `login.scss` | Formulario de inicio de sesión. Llama a `apiService.login()`, guarda el JWT en `localStorage` y navega al selector de juego. Muestra el logo de EsportsManager y los logos de los juegos disponibles. |
| `signup/` | `signup.ts`, `signup.html`, `signup.scss` | Formulario de registro. Permite elegir rol (jugador/manager) y juego principal. Llama a `apiService.register()`. |
| `forgot-password/` | `forgot-password.ts`, `forgot-password.html`, `forgot-password.scss` | Formulario de recuperación de contraseña. Envía un email de reset a través de Supabase Auth. |

##### Navegación

| Componente | Archivos | Descripción |
|------------|----------|-------------|
| `game-selector/` | `game-selector.ts`, `game-selector.html`, `game-selector.scss` | Pantalla de selección de juego tras el login. Muestra cards para League of Legends, Valorant e Inazuma Eleven VR. Navega al dashboard correspondiente. |

##### Dashboards principales

Cada dashboard sigue el mismo patrón: header con notificaciones, botón Admin (solo admin), botón Perfil; tabs de Jugadores Libres, Equipos y Torneos; modales para detalles, inscripción, organizar torneos, etc.

| Componente | Archivos | Descripción |
|------------|----------|-------------|
| `lol-dashboard/` | `lol-dashboard.ts`, `.html`, `.scss` | Dashboard de **League of Legends**. Tema visual azul/dorado. Gestiona jugadores con roles (Top, Jungle, Mid, ADC, Support) y colores por rol. Carga jugadores con `game === 'lol'`. |
| `valorant-dashboard/` | `valorant-dashboard.ts`, `.html`, `.scss` | Dashboard de **Valorant**. Tema rojo/oscuro. Muestra ELO y agente principal de cada jugador. Carga jugadores con `game === 'valorant'`. |
| `inazuma-dashboard/` | `inazuma-dashboard.ts`, `.html`, `.scss` | Dashboard de **Inazuma Eleven VR**. Tema naranja/dorado. Carga jugadores con `game === 'inazuma'`. |

Los tres dashboards incluyen:
- Carga de `enrolledTournamentIds` al iniciar para saber en qué torneos está inscrito el usuario.
- Método `isEnrolledIn(id)` para pasar el estado de inscripción al modal de torneo.
- Método `onTournamentEnrolled(id)` que actualiza el Set local sin recargar la página.
- Métodos `openAdminModal()` / `closeAdminModal()` para el panel de administración.

##### Sub-componentes de equipos (dentro de cada dashboard)

| Componente | Descripción |
|------------|-------------|
| `lol-dashboard/team-detail/` | Modal de detalle de equipo de LoL. Lista jugadores con sus roles. Permite al manager invitar jugadores. |
| `valorant-dashboard/team-detail/` | Modal de detalle de equipo de Valorant. Lista jugadores con ELO y agente. |
| `inazuma-dashboard/team-detail/` | Modal de detalle de equipo de Inazuma. Lista jugadores del equipo. |

##### Modales compartidos

| Componente | Archivos | Descripción |
|------------|----------|-------------|
| `player-detail-modal/` | `player-detail-modal.ts` | Modal que muestra el perfil de un jugador libre. Si el usuario es manager, muestra el botón "+ Fichar" que envía una invitación al jugador. Recibe `[player]` y `[isManager]` por `@Input()`, emite `(recruit)` y `(close)`. |
| `tournament-detail-modal/` | `tournament-detail-modal.ts` | Modal de detalle de torneo. Muestra nombre, estado, fechas, participantes, premios y enlace Challonge. Incluye botón **"Inscribirse"** (solo si el torneo está en estado `Abierto`). Al inscribirse aparece un overlay de éxito. Recibe `[tournament]` e `[isEnrolled]`, emite `(enrolled)` y `(close)`. |
| `organize-tournament-modal/` | `organize-tournament-modal.ts` | Formulario para crear un nuevo torneo. Campos: nombre, participantes, fecha inicio, fecha límite inscripción, descripción, URL Challonge y premios (1º/2º/3º puesto). Emite `(tournamentCreated)` con el formulario completo. |
| `invitations-modal/` | `invitations-modal.ts` | Modal donde el jugador ve las invitaciones de equipo pendientes que ha recibido. Permite aceptar o rechazar cada una. Emite `(invitationUpdated)` para que el dashboard recargue los datos. |
| `user-profile-modal/` | `user-profile-modal.ts`, `.html`, `.scss` | Modal de perfil del usuario. Muestra nombre, email y rol. Botones para crear equipo (manager sin equipo), gestionar equipo (manager con equipo), o abandonar equipo (jugador con equipo). Incluye sección colapsable **"Mis Torneos"** que carga lazily los torneos en los que está inscrito el usuario (nombre, fecha, enlace Challonge). Emite `(createTeam)`, `(manageTeam)` y `(teamLeft)`. |
| `create-team-modal/` | `create-team-modal.ts`, `.html`, `.scss` | Formulario para que un manager cree un nuevo equipo. Campos: nombre del equipo, logo (URL) y juego (pasado por `@Input() game`). Emite `(teamCreated)` al terminar. |
| `manage-team-modal/` | `manage-team-modal.ts`, `.html`, `.scss` | Panel del manager para gestionar su equipo. Muestra jugadores actuales, solicitudes de unión pendientes (aceptar/rechazar) y opciones de editar o eliminar el equipo. |
| `admin-modal/` | `admin-modal.ts` | Panel de administración (solo rol `admin`). Lista todos los usuarios con su nombre, email y rol. Permite cambiar el rol de cualquier usuario (excepto el propio) mediante un `<select>`. Permite eliminar usuarios con confirmación. Muestra estadísticas (nº de players, managers y admins). |

##### Otros componentes

| Componente | Archivos | Descripción |
|------------|----------|-------------|
| `dashboard/` | `dashboard.ts`, `.html`, `.scss` | Componente de dashboard genérico (legado/placeholder). No se usa activamente en la versión actual. |
| `team-management/` | `team-management.ts`, `.html`, `.scss` | Componente de gestión de equipos genérico (legado). Actualmente reemplazado por `manage-team-modal`. |
| `profile-modal/` | `profile-modal.ts` | Componente de perfil (versión simplificada, legado). Reemplazado por `user-profile-modal`. |

---

#### Archivos de configuración del frontend

| Archivo | Descripción |
|---------|-------------|
| `esports-admin/src/index.html` | HTML raíz. Monta `<app-root>` y referencia los assets. |
| `esports-admin/src/main.ts` | Bootstrap de la app Angular con `bootstrapApplication(AppComponent, appConfig)`. |
| `esports-admin/src/styles.scss` | Estilos globales: reset CSS, fuente (`Rajdhani` de Google Fonts), variables de color globales. |
| `esports-admin/src/environments/environment.ts` | Variables de entorno para desarrollo: `apiUrl: 'http://localhost:3000/api'`. |
| `esports-admin/src/environments/environment.prod.ts` | Variables de entorno para producción: `apiUrl: '/api'` (relativo, para que funcione tras nginx). |
| `esports-admin/Dockerfile` | Imagen Docker del frontend: compila Angular (`ng build`) y sirve el resultado con `nginx:alpine`. |
| `esports-admin/angular.json` | Configuración del proyecto Angular: presupuestos de bundle, configuraciones de build (`development`/`production`), assets y estilos globales. |
| `esports-admin/package.json` | Dependencias Angular 17+: `@angular/core`, `@angular/router`, `@angular/common/http`, etc. |

---

### Electron (App de Escritorio)

Ubicación: `electron/`

| Archivo | Descripción |
|---------|-------------|
| `electron/main.js` | Proceso principal de Electron. En **modo producción** (empaquetado), arranca el backend Node.js como proceso hijo (desde los `extraResources` del instalador) y después abre una `BrowserWindow` cargando la build de Angular. En **modo desarrollo** abre `http://localhost:4200`. Gestiona el ciclo de vida de la ventana y del proceso backend hijo. |
| `electron/package.json` | Configuración del empaquetado con `electron-builder`: nombre del app, icono, instalador NSIS con acceso directo en el escritorio (`createDesktopShortcut: true`), `extraResources` (incluye `backend/dist`, `backend/node_modules`, `backend/.env` y `esports-admin/dist`). |

---

## Roles de Usuario

| Rol | Capacidades |
|-----|-------------|
| `player` | Ver jugadores y equipos, enviar solicitudes de unión a equipos, aceptar/rechazar invitaciones, inscribirse en torneos, ver sus torneos inscritos en el perfil. |
| `manager` | Todo lo del jugador + crear equipo, fichar jugadores (enviar invitaciones), gestionar su equipo, crear torneos. |
| `admin` | Todo lo del manager + acceso al panel de administración (ver, cambiar rol y eliminar cualquier usuario), eliminar equipos, torneos y perfiles de jugador de cualquier usuario. |

El rol se asigna durante el registro y se almacena en la tabla `users` de Supabase. El JWT incluye el rol para que el backend pueda verificarlo en cada petición mediante el middleware `authorization.ts`.

---

## Base de Datos (Supabase)

Todas las tablas se crean ejecutando `backend/schema.sql` en el SQL Editor de Supabase.

| Tabla | Descripción |
|-------|-------------|
| `users` | Perfil extendido de usuario: `id` (FK a Supabase Auth), `email`, `full_name`, `role` (`player`/`manager`/`admin`). |
| `players` | Perfil de jugador por juego: `user_id`, `game` (`lol`/`valorant`/`inazuma`), `role` (posición), `rank`, `team_id`. Un usuario puede tener un perfil por juego. |
| `teams` | Equipos: `name`, `game`, `logo_url`, `manager_id`. |
| `team_join_requests` | Solicitudes de jugador → equipo: `player_id`, `team_id`, `status` (`pending`/`accepted`/`rejected`). |
| `team_invitations` | Invitaciones de equipo → jugador: `team_id`, `player_id`, `status`. |
| `tournaments` | Torneos: `name`, `game`, `status` (`draft`/`open`/`in_progress`/`finished`), `participants`, `start_date`, `registration_deadline`, `has_price_pool`, `first_place`, `second_place`, `third_place`, `challonge_url`, `description`. |
| `tournament_enrollments` | Inscripciones de usuarios en torneos: `user_id`, `tournament_id`. Clave primaria compuesta. |
| `notifications` | Notificaciones en app: `user_id`, `message`, `read` (boolean), `created_at`. |

---

## Variables de Entorno

Copiar `.env.example` a `backend/.env` y rellenar:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=una_clave_secreta_larga_y_segura
PORT=3000
```

> El `SUPABASE_SERVICE_ROLE_KEY` se obtiene en el panel de Supabase → Settings → API → `service_role` key.  
> **Nunca** exponer esta clave en el frontend ni en repositorios públicos.
