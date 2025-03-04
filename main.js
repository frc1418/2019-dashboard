'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const ipcMain = electron.ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Define global reference to the python server (which we'll start next).
let server;

const HOST = 'http://localhost:8888';

function createWindow() {
    // Start python server.
    if (process.platform === 'win32') {
        // If on Windows, use the batch command (py -3 ./server.py).
        server = require('child_process').spawn('py', ['-3', '-m', 'pynetworktables2js', '--robot', '10.14.18.2']);
    } else {
        // If on unix-like/other OSes, use bash command (python3 ./server.py).
        server = require('child_process').spawn('python3', ['-m', 'pynetworktables2js', '--robot', '10.14.18.2']);
    }

    // Create the browser window.
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        width: width,
        height: height - 235,
        // The window is hidden until the python server is ready
        show: false,
        frame: false //TODO: This gives a warning
    });

    // Move window to top (left) of screen.
    mainWindow.setPosition(0, 0);

    // Load window.
    mainWindow.loadURL(HOST);

    // Once the python server is ready, load window contents.
    // TODO: fix this abnomination
    mainWindow.once('ready-to-show', function() {
        mainWindow.loadURL(HOST);
        mainWindow.once('ready-to-show', function() {
            // Once it has reloaded, show the window
            mainWindow.show();
        });
    });

    // Remove menu
    mainWindow.setMenu(null);

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q.
    // Not like we're creating a consumer application though.
    // Let's just kill it anyway.

    // If you want to restore the standard behavior, uncomment the next line.
    // if (process.platform !== 'darwin')

    app.quit();
});

app.on('quit', function() {
    console.log('Application quit. Killing tornado server.');

    // Kill tornado server child process.
    server.kill('SIGINT');
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

var vufineWindow;

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('vufine', function(event, arg) {
    //setting dialog
    vufineWindow = new BrowserWindow({
        width: 1000,
        height: 600
    });
    // Load options page.
    vufineWindow.setMenu(null);
    vufineWindow.loadURL(`${HOST}/vufine.html`);
    vufineWindow.setPosition(1281, 0);
    vufineWindow.setFullScreen(true);

    vufineWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        vufineWindow = null;
    });
});

// Refresh vufine window when refresh button is clicked.
ipcMain.on('refresh', function() {
    vufineWindow.reload();
});
