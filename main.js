const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, dialog } = electron;

const yaml = require('js-yaml');
const jsonBuilder = require('./jsonBuilder');

const isDevToolsEnabled = true;
const supportedExtensions = ['json', 'yml', 'yaml'];

class ObjectEditor {
	constructor() {
		this.isDarkMode = true;
		this.mainWindow = null;
		this.folder = "";
		this.file = "";
		this.ext = "";

		this.mainMenuTemplate = [
			{
				label: 'File',
				submenu: [
					{
						label: 'Toggle Light/Dark Mode',
						accelerator: process.platform === 'darwin' ? 'Command+D' : 'Ctrl+D',
						click: () => {
							this.isDarkMode = !this.isDarkMode;
							this.mainWindow.webContents.send('toggleTheme', this.isDarkMode);
						}
					},
					{
						label: 'Open Directory',
						accelerator: process.platform == 'darwin' ? 'Command+O' : 'Ctrl+O',
						click: () => this.openDialog()
					},
					{
						label: 'Quit',
						accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
						click: () => app.quit()
					}
				]
			}
		];

		if (isDevToolsEnabled) {
			this.mainMenuTemplate.push({
				label: 'Developer Tools',
				submenu: [
					{
						role: 'reload'
					},
					{
						label: 'Toggle DevTools',
						accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
						click: (item, focusedWindow) => {
							focusedWindow.toggleDevTools();
						}
					}
				]
			});
		}

		app.on('ready', () => {
			this.createMainWindow();
			this.createMainMenu();
		});

		ipcMain.on('loadFolder', () => {
			this.openDialog();
		});
		ipcMain.on('displayItem', (event, item) => {
			this.displayItem(item);
		});
		ipcMain.on('saveForm', (event, formData) => {
			this.saveDataToDrive(formData);
		});
	}

	createMainWindow() {
		this.mainWindow = new BrowserWindow({
			webPreferences: {
				preload: path.join(app.getAppPath(), 'preload.js')
			}
		});

		this.mainWindow.loadURL(
			url.format({
				pathname: path.join(__dirname, 'mainWindow.html'),
				protocol: 'file:',
				slashes: true
			}) + `?theme=${this.isDarkMode ? 'dark' : 'light'}`
		);

		this.mainWindow.on('closed', () => {
			app.quit();
		});
	}

	createMainMenu() {
		const mainMenu = Menu.buildFromTemplate(this.mainMenuTemplate);
		Menu.setApplicationMenu(mainMenu);
	}

	openDialog() {
		this.mainWindow.webContents.send('clearItems');
		const folderToLoad = dialog.showOpenDialogSync(this.mainWindow, {
			properties: ['openDirectory']
		});

		if (typeof folderToLoad !== 'undefined' && folderToLoad) {
			this.folder = folderToLoad[0];
			console.log(`set this.folder to ${this.folder}`)
			this.expandFolder(folderToLoad);
		}
	}

	expandFolder(folder) {
		let noFiles = true;
		fs.readdirSync(`${folder}`).forEach(item => {
			let stat = fs.statSync(path.join(`${folder}`, item));
			if (stat.isFile()) {
				let itemExtension = path.extname(item).substring(1);
				if (supportedExtensions.includes(itemExtension)) {
					if (noFiles) {
						noFiles = false;
						this.mainWindow.webContents.send('addItem', folder, folder);
					}
					this.mainWindow.webContents.send('addItem', folder, item);
				}
			} else if (stat.isDirectory()) {
				this.expandFolder(path.join(`${folder}`, item));
			}
		});
	}

	displayItem(item) {
		this.file = item;
		console.log(`set this.file to ${this.file}`)

		this.ext = path.extname(item).substring(1);
		console.log(`set this.ext to ${this.ext}`)

		this.mainWindow.webContents.send('clearData');

		try {
			const content = fs.readFileSync(item, 'utf8');
			const jsonContent = yaml.load(content);
			this.mainWindow.webContents.send('isJSON', item, jsonContent);
		} catch (err) {
			this.mainWindow.webContents.send('notJSON', item, err);
		}
	}

	saveDataToDrive(formData) {
		const jsonData = jsonBuilder.formToJson(formData);

		const yamlExtensions = ['.yml', '.yaml']

		dialog
			.showSaveDialog({
				title: `Save ${this.ext.toUpperCase()} File`,
				defaultPath: this.file,
				filters: [{ name: `${this.ext.toUpperCase()} Files`, extensions: supportedExtensions }]
			})
			.then(result => {
				if (!result.canceled && result.filePath) {
					console.log(`set result to ${JSON.stringify(result)}`)
					let saveExt = path.extname(result.filePath.substring(1))
					console.log(`set saveExt to ${saveExt}`)
					const saveData = yamlExtensions.includes(saveExt) ? yaml.dump(jsonData) : JSON.stringify(jsonData, null, 4);
					try {
						fs.writeFileSync(result.filePath, saveData, 'utf8');
						console.log(`Saved data as ${saveExt} to ${result.filePath}`);
					} catch (error) {
						console.error(`Error saving data to ${result.filePath} as ${saveExt}:`, error);
					}
				}
			});
	}
}

const objectEditor = new ObjectEditor();
