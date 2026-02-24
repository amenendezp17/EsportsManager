# Backend - Esports Manager

Backend para la aplicación Esports Manager construido con Node.js, Express y Supabase.

## Características

- ✅ Autenticación con JWT
- ✅ Sistema de roles (jugador, manager, administrador)
- ✅ Gestión de equipos
- ✅ Gestión de torneos
- ✅ Autorización basada en roles
- ✅ Integración con Supabase

## Instalación

### 1. Clonar el repositorio y navegar a la carpeta backend

```bash
cd backend
npm install
```

### 2. Variables de entorno

Copia el archivo `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

Necesitarás obtener desde Supabase:
- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_KEY`: Clave pública de Supabase
- `SUPABASE_SERVICE_KEY`: Clave de servicio (solo si la necesitas)
- `JWT_SECRET`: Una cadena secreta para firmar JWTs

## Desarrollo

### Iniciar el servidor en modo desarrollo

```bash
npm run dev
```

El servidor se ejecutará en `http://localhost:3000`

### Compilar TypeScript

```bash
npm run build
```

### Ejecutar en producción

```bash
npm run start
```

## Endpoints

### Autenticación

- `POST /api/auth/signup` - Registro de nuevo usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cierre de sesión
- `GET /api/auth/profile` - Obtener perfil (autenticado)
- `PUT /api/auth/profile` - Actualizar perfil (autenticado)

### Equipos

- `GET /api/teams` - Listar todos los equipos
- `GET /api/teams/:id` - Obtener equipo por ID
- `POST /api/teams` - Crear equipo (manager/admin)
- `PUT /api/teams/:id` - Actualizar equipo
- `DELETE /api/teams/:id` - Eliminar equipo

### Torneos

- `GET /api/tournaments` - Listar todos los torneos
- `GET /api/tournaments/:id` - Obtener torneo por ID
- `POST /api/tournaments` - Crear torneo (manager/admin)
- `PUT /api/tournaments/:id` - Actualizar torneo
- `DELETE /api/tournaments/:id` - Eliminar torneo

## Estructura del Proyecto

```
src/
├── config/          # Configuración de Supabase
├── controllers/     # Lógica de negocio
├── middleware/      # Autenticación y autorización
├── models/          # Tipos e interfaces
├── routes/          # Definición de rutas
├── utils/           # Funciones auxiliares
└── index.ts         # Punto de entrada
```

## Notas sobre Roles

El sistema tiene tres roles:

- **player**: Jugador, puede crear solicitudes para equipos
- **manager**: Gestor de equipo, puede crear equipos y torneos
- **admin**: Administrador, acceso total a todas las funcionalidades

## Próximos Pasos

Para continuar con el desarrollo, necesitas:

1. Crear las tablas en Supabase según el esquema de `models/index.ts`
2. Implementar controladores adicionales para jugadores y solicitudes de equipos
3. Añadir validaciones más robustas
4. Implementar tests

¿Quieres que continúe con alguno de estos puntos?
