const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const formBuilder = require('./formBuilder.js')

contextBridge.exposeInMainWorld(
	'electron',
	{
		loadFolder: () => ipcRenderer.send("loadFolder")
	}
)

ipcRenderer.on('clearItems',(err) => {
	const dl = document.querySelector('dl')
	dl.innerHTML = ""

})

ipcRenderer.on('clearData',(err) => {
	const fileDataDiv = document.getElementById('fileData')
	fileDataDiv.innerHTML = ""
})

ipcRenderer.on('addItem',(err, folder, file) => {
	const dl = document.querySelector('dl')

	//console.log("folder: " + folder)
	//console.log("file: " + file)

	if (folder == file) {
		const dt = document.createElement('dt')
		dt.appendChild(document.createTextNode(file))
		dt.setAttribute("value", folder)
		dt.addEventListener("click", displayItem)
		dl.appendChild(dt)
	}else{
		const dd = document.createElement('dd')
		dd.appendChild(document.createTextNode(" - " + file))
		dd.setAttribute("value", path.join(`${folder}`,`${file}`))
		dd.addEventListener("click", displayItem)
		dl.appendChild(dd)
	}
})

ipcRenderer.on('isJSON',(err, file, content) => {
	//console.log(`${file}:${JSON.stringify(content)}`)
	const fileDataDiv = document.getElementById("fileData");
	const form = formBuilder.getFormFromJSON(content);

	const submitButton = document.createElement('button');
	submitButton.type = 'submit';
	submitButton.textContent = 'Submit';
	submitButton.style.display = "block";
	//submitButton.style.margin = "0 auto";
	submitButton.addEventListener("click", submitForm)
	form.appendChild(submitButton);

	fileDataDiv.appendChild(form)
})



ipcRenderer.on('notJSON',(err, file, error) => {
	fileDataDiv = document.getElementById("fileData")
	console.log(file, typeof(file))
	form = document.createElement('form')
	form.innerHTML = `<br><strong>file:</strong> ${file} <br><strong>error:</strong> ${error}`
	fileDataDiv.appendChild(form)

})

ipcRenderer.on('toggleTheme', (event, isDarkMode) => {
	const body = document.body;
	if (isDarkMode) {
		body.classList.remove('light-mode');
		body.classList.add('dark-mode');
	} else {
		body.classList.remove('dark-mode');
		body.classList.add('light-mode');
	}
});

function displayItem(){
	//console.log("displayItem:" + this.getAttribute("value"))
	ipcRenderer.send("displayItem", this.getAttribute("value"))
}

function submitForm() {
	event.preventDefault(); // Prevent the default form submission behavior

	const form = document.querySelector('form'); // Assuming your form has been created and populated properly

	// Collect form data
	const formData = new FormData(form);

	// Convert FormData to a plain object, considering visibility
	const formDataObject = {};
	formData.forEach((value, key) => {
		const field = form.querySelector(`[name="${key}"]`);
		const fieldStyles = window.getComputedStyle(field);

		// Check if the field is visible (you might need to adjust this based on your styling)
		if (fieldStyles.display !== "none" && fieldStyles.visibility !== "hidden") {
			formDataObject[key] = value;
		}
	});

	// Send the visible form data to the main process
	ipcRenderer.send("saveForm", formDataObject);
}