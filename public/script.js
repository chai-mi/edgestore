const fileInput = document.getElementById('fileInput')
const uploadButton = document.getElementById('uploadButton')
const fileList = document.getElementById('fileList')

fileInput.addEventListener('change', () => {
    while (fileList.firstChild)
        fileList.removeChild(fileList.firstChild)

    if (fileInput.files)
        for (const file of fileInput.files) {
            const newRow = fileList.insertRow()
            newRow.insertCell(0).textContent = file.name
            newRow.insertCell(1).textContent = filesize(file.size)
            if (file.size > 1e8)
                newRow.insertCell(2).textContent = 'Too big file'
            else
                newRow.insertCell(2).textContent = 'Not uploaded'
        }
})

uploadButton.addEventListener('click', () => {
    for (let i = 0; i < fileInput.files?.length || 0; i++) {
        const file = fileInput.files[i]
        const row = fileList.rows[i]
        if (file.size > 1e8) {
            row.cells[2].textContent = 'Pass'
        } else {
            row.cells[2].textContent = "Uploading"
            fetch(`/${file.name}`, {
                method: 'PUT',
                body: file
            }).then(async (resp) => {
                if (resp.status === 200) {
                    const data = await resp.json()
                    const { pathname } = new URL(data.url)
                    const filename = pathname.split('/').pop()

                    const linkElement = document.createElement("a")
                    linkElement.href = decodeURI(data.url)
                    linkElement.download = decodeURIComponent(filename)
                    linkElement.textContent = "Uploaded"
                    row.cells[2].textContent = ""
                    row.cells[2].appendChild(linkElement)
                } else {
                    row.cells[2].textContent = "Upload fail"
                }
            })
        }
    }
})