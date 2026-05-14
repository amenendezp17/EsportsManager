const electron = require('electron');
const { BrowserWindow, dialog } = electron;
const app = electron.app;
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let backendProcess;

// ── Detectar modo dev vs producción empaquetada ──────────────────────────────
function isDev() {
  return !app.isPackaged;
}

// ── Rutas del backend y frontend ─────────────────────────────────────────────
function getBackendEntry() {
  return isDev()
    ? path.join(__dirname, '..', 'backend', 'dist', 'index.js')
    : path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
}

function getStaticPath() {
  return isDev()
    ? path.join(__dirname, '..', 'esports-admin', 'dist', 'esports-admin', 'browser')
    : path.join(process.resourcesPath, 'frontend');
}

// ── Arrancar backend Node.js ─────────────────────────────────────────────────
function startBackend() {
  const backendEntry = getBackendEntry();
  const staticPath = getStaticPath();

  // Cargar .env — dev: carpeta del repo, producción: carpeta de recursos empaquetados
  const envPath = isDev()
    ? path.join(__dirname, '..', 'backend', '.env')
    : path.join(process.resourcesPath, 'backend', '.env');
  try { require('dotenv').config({ path: envPath }); } catch (e) { /* opcional */ }

  backendProcess = spawn('node', [backendEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      STATIC_PATH: staticPath,
    },
    stdio: isDev() ? 'inherit' : 'pipe',
  });

  if (!isDev() && backendProcess.stdout && backendProcess.stderr) {
    backendProcess.stdout.on('data', (d) => console.log(`[backend] ${d}`));
    backendProcess.stderr.on('data', (d) => console.error(`[backend-err] ${d}`));
  }

  backendProcess.on('exit', (code) => {
    console.log(`Backend terminó con código ${code}`);
  });
}

// ── Esperar a que el backend esté listo ──────────────────────────────────────
function waitForBackend(retries) {
  retries = retries || 30;
  return new Promise(function(resolve, reject) {
    var attempts = 0;
    function check() {
      var req = http.get('http://localhost:3000/api/health', function(res) {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1000, function() { req.destroy(); retry(); });
    }
    function retry() {
      attempts++;
      if (attempts >= retries) {
        reject(new Error('El backend no respondió a tiempo.'));
      } else {
        setTimeout(check, 500);
      }
    }
    check();
  });
}

// ── Crear ventana principal ──────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'EsportsManager',
    show: false,
    backgroundColor: '#0d0d1a',
  });

  mainWindow.once('ready-to-show', function() {
    mainWindow.show();
  });

  mainWindow.loadURL('http://localhost:3000');

  if (isDev()) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// ── Ciclo de vida de Electron ────────────────────────────────────────────────
app.whenReady().then(function() {
  startBackend();

  waitForBackend()
    .then(function() {
      createWindow();
    })
    .catch(function(err) {
      dialog.showErrorBox(
        'Error al arrancar',
        'No se pudo iniciar el servidor interno.\n' +
        'Asegúrate de haber compilado el proyecto:\n\n' +
        '  cd backend && npm run build\n' +
        '  cd esports-admin && npm run build'
      );
      app.quit();
    });
});

app.on('window-all-closed', function() {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', function() {
  if (backendProcess) backendProcess.kill();
});

app.on('activate', function() {
  if (mainWindow === null) createWindow();
});
