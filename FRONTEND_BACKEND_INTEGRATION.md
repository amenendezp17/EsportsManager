# Integración Frontend-Backend

Guía para conectar tu aplicación Angular con el backend Node.js/Supabase.

## 1. Actualizar el servicio DataService de Angular

En `esports-admin/src/app/services/data.service.ts`, necesitarás hacer cambios para conectar con el backend.

### Ejemplo de cambios necesarios:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = 'http://localhost:3000/api';
  private token: string | null = null;

  constructor(private http: HttpClient) {
    this.token = localStorage.getItem('authToken');
  }

  // Auth endpoints
  signup(email: string, password: string, fullName: string, role: UserRole): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/signup`, {
      email,
      password,
      fullName,
      role
    });
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, {
      email,
      password
    });
  }

  // Guardar token en localStorage
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Obtener headers con autenticación
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    });
  }

  // Equipos
  getTeams(): Observable<any> {
    return this.http.get(`${this.apiUrl}/teams`, {
      headers: this.getHeaders()
    });
  }

  createTeam(teamData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/teams`, teamData, {
      headers: this.getHeaders()
    });
  }

  // Torneos
  getTournaments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tournaments`, {
      headers: this.getHeaders()
    });
  }

  createTournament(tournamentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tournaments`, tournamentData, {
      headers: this.getHeaders()
    });
  }
}
```

## 2. Agregar HttpClientModule al app.config.ts

En `esports-admin/src/app/app.config.ts`:

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // ... otros providers
  ]
};
```

## 3. Actualizar componentes para usar el backend

### Login component

```typescript
onLogin() {
  this.dataService.login(this.email, this.password).subscribe(
    (response) => {
      if (response.token) {
        this.dataService.setAuthToken(response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.router.navigate(['/selector']);
      }
    },
    (error) => {
      console.error('Error al iniciar sesión:', error);
    }
  );
}
```

### Dashboard component

```typescript
ngOnInit() {
  this.userRole = this.dataService.getGameRole(this.gameId);
  if (!this.userRole) {
    this.showRoleModal = true;
  }
  this.loadTeams();
  this.loadTournaments();
}

private loadTeams() {
  this.dataService.getTeams().subscribe(
    (teams) => {
      this.teams = teams;
    },
    (error) => {
      console.error('Error al cargar equipos:', error);
    }
  );
}

private loadTournaments() {
  this.dataService.getTournaments().subscribe(
    (tournaments) => {
      this.tournaments = tournaments;
    },
    (error) => {
      console.error('Error al cargar torneos:', error);
    }
  );
}
```

## 4. Guardar datos en localStorage después de login

Modifica el componente de login:

```typescript
// Después de login exitoso
localStorage.setItem('authToken', response.token);
localStorage.setItem('user', JSON.stringify(response.user));

// En otros componentes, recuperar el usuario
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Usuario logueado:', user);
```

## 5. Añadir interceptor para autenticación (opcional pero recomendado)

Crea `esports-admin/src/app/interceptors/auth.interceptor.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

Luego en `app.config.ts`:

```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
```

## Próximos pasos

1. Instala las dependencias del backend: `cd backend && npm install`
2. Configura el archivo `.env` con tus credenciales de Supabase
3. Ejecuta el backend: `npm run dev`
4. Actualiza el frontend Angular con los cambios de arriba
5. Prueba el flujo de login/signup

## Variables de entorno en Angular (opcional)

Crea `esports-admin/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

Luego en los servicios:

```typescript
import { environment } from '../../environments/environment';

export class DataService {
  private apiUrl = environment.apiUrl;
}
```

## Troubleshooting

### CORS Error
Si ves errores CORS, verifica que el backend tiene `cors()` habilitado (ya está en backend/src/index.ts)

### Token no persiste
Asegúrate de guardar y recuperar el token desde localStorage

### Errores 403 Forbidden
Probablemente el token ha expirado. El usuario necesita hacer login de nuevo.
