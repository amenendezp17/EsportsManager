# EsportsManager — Escritorio (Electron)

## Requisitos previos

- Node.js 20+
- Haber compilado el **backend** y el **frontend** antes de arrancar

## 1. Compilar el backend

```bash
cd ../backend
npm install
npm run build
```

## 2. Compilar el frontend (Angular)

```bash
cd ../esports-admin
npm install
npm run build -- --configuration production
```

## 3. Instalar dependencias de Electron

```bash
cd electron
npm install
```

## 4. Arrancar en modo desarrollo

```bash
npm start
```

Esto abrirá la ventana de Electron, arrancará el backend en segundo plano
y cargará la app en `http://localhost:3000`.

## 5. Generar instalador .exe (Windows)

```bash
npm run build:win
```

El instalador se genera en `../dist-electron/`.
