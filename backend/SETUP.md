# Guía de Configuración - Backend con Supabase

## 1. Crear las tablas en Supabase

1. Abre tu dashboard de Supabase: https://supabase.com/dashboard
2. Ve a la sección **SQL Editor**
3. Crea una nueva query o usa la existente
4. Copia y pega el contenido del archivo `backend/schema.sql`
5. Ejecuta la query - esto creará todas las tablas necesarias con RLS configurado

## 2. Configurar variables de entorno

1. En el archivo `backend/.env`, completa con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (clave anon pública)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (clave de servicio)
JWT_SECRET=tu-secreto-super-seguro-aqui
PORT=3000
NODE_ENV=development
```

### Dónde encontrar las credenciales:

- **SUPABASE_URL** y **SUPABASE_KEY**: `Settings > API` en tu dashboard
- **SUPABASE_SERVICE_KEY**: Busca "Service role secret" en la misma sección

## 3. Instalar dependencias

```bash
cd backend
npm install
```

## 4. Iniciar el servidor

```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor ejecutándose en http://localhost:3000
📚 Health check: http://localhost:3000/api/health
```

## 5. Probar el backend

### Verificar que está funcionando:
```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "OK",
  "message": "Backend funcionando correctamente"
}
```

### Crear un usuario (signup):
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jugador@example.com",
    "password": "password123",
    "fullName": "Juan Pérez",
    "role": "player"
  }'
```

### Iniciar sesión:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jugador@example.com",
    "password": "password123"
  }'
```

Esto devolverá un token JWT que deberás usar en las siguientes solicitudes.

### Crear un equipo (requiere token y rol manager/admin):
```bash
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "name": "Equipo Pro LoL",
    "game": "lol",
    "logoUrl": "https://example.com/logo.png",
    "description": "Equipo competitivo de League of Legends"
  }'
```

## 6. Próximos pasos

- [ ] Conectar el frontend Angular con este backend
- [ ] Implementar controlador de jugadores
- [ ] Implementar controlador de solicitudes de equipo
- [ ] Añadir validaciones más robustas
- [ ] Implementar tests
- [ ] Crear documentación de API con OpenAPI/Swagger

## Estructura de datos esperada

Después de ejecutar `schema.sql`, tendrás estas tablas:

- **users**: Perfiles de usuarios con roles
- **teams**: Equipos de juegos
- **players**: Perfiles de jugadores
- **tournaments**: Torneos
- **team_join_requests**: Solicitudes para unirse a equipos

## Seguridad

El backend implementa:
- ✅ Autenticación JWT
- ✅ Row Level Security (RLS) en Supabase
- ✅ Autorización basada en roles
- ✅ Validación de permisos

## Problemas comunes

### "SUPABASE_URL is not defined"
Asegúrate de tener un archivo `.env` con todas las variables requeridas.

### "Tabla no existe"
Ejecuta `schema.sql` en el SQL Editor de Supabase.

### "Token inválido"
Verifica que estés usando el token devuelto por login/signup en el header:
```
Authorization: Bearer eyJhbGciOi...
```

¿Necesitas ayuda con algo específico?
