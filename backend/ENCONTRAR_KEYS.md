# Guía: Encontrar credenciales en Supabase

## Dónde están las keys en Supabase

### Opción 1: Settings > API (Recomendado)
1. Abre tu proyecto: https://supabase.com/dashboard/project/vkddiykrvfgvfvqmzovn
2. Haz clic en **Settings** (esquina inferior izquierda)
3. Selecciona **API**
4. Verás:

```
Project Details
├── Project URL: (SUPABASE_URL)
│
API Keys
├── service_role / secret (SUPABASE_SERVICE_KEY) ← Busca esto
├── anon / public (SUPABASE_KEY) ← Ya tienes este
```

### Opción 2: Si lo anterior no funciona
A veces Supabase reorganiza las keys, busca:
- **Secrets** en Settings
- **Service Role Key**
- **Secret Key** (en lugar de Service Role)

### Opción 3: Crear una nueva key (si la pierdes)
1. En Settings > API
2. Busca un botón **"New API Key"** o **"Generate new"**
3. Dale cualquier nombre (ej: "backend-service")
4. Copia la key generada

## ¿Qué es cada key?

| Variable | Uso | Dónde |
|----------|-----|-------|
| `SUPABASE_URL` | URL del proyecto | Settings > API > Project URL |
| `SUPABASE_KEY` | Key pública/anónima (uso frontend) | Settings > API > Anon Public |
| `SUPABASE_SERVICE_KEY` | Key secreta (uso backend) | Settings > API > Service Role Secret |
| `JWT_SECRET` | Para firmar tokens JWT | Tu valor secreto |

## Pasos finales

1. Copia el **Service Role Secret** de Supabase
2. Pégalo en `.env` como `SUPABASE_SERVICE_KEY=`
3. Ejecuta: `npm install`
4. Inicia el servidor: `npm run dev`

¿Lo encontraste? 👇
