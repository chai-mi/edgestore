const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')

const statusMap = {
    tooBig: 'Too big file',
    notUploaded: 'Not uploaded',
    uploading: 'Uploading',
    uploadFail: 'Upload fail',
    uploaded: 'Uploaded',
    deleting: 'Deleting',
    deleted: 'Deleted',
    deleteFail: 'Delete fail'
}

const actionMap = {
    upload: 'Upload',
    delete: 'Delete'
}

fileInput.addEventListener('change', () => {
    while (fileList.firstChild)
        fileList.removeChild(fileList.firstChild)

    if (fileInput.files && fileInput.files.length > 0) {
        document.getElementById('tableContainer')?.style.setProperty('display', 'flex')
        let total = 0
        for (const file of fileInput.files) {
            const newRow = fileList.insertRow()
            const name = newRow.insertCell()
            const size = newRow.insertCell()
            const status = newRow.insertCell()
            const action = newRow.insertCell()
            name.textContent = file.name
            size.textContent = filesize(file.size)
            total += file.size
            if (file.size > 1e8)
                status.textContent = statusMap.tooBig
            else {
                status.textContent = statusMap.notUploaded
                name.contentEditable = true
                const buttonElement = document.createElement('button')
                buttonElement.textContent = actionMap.upload
                buttonElement.classList.add('action')
                action.appendChild(buttonElement)
                buttonElement.onclick = () => {
                    if (buttonElement.classList.contains('action')) {
                        const tr = buttonElement.parentElement.parentElement
                        const rowIndex = Array.from(tr.parentElement.children).indexOf(tr)
                        toServer(rowIndex)
                    }
                }
            }
        }
        document.getElementById('count').textContent = `Count: ${fileInput.files.length}`
        document.getElementById('total').textContent = `Total: ${filesize(total)}`
    } else {
        document.getElementById('tableContainer')?.style.setProperty('display', 'none')
    }
})

const toServer = (index) => {
    const file = fileInput.files[index]
    const [name, size, status, action] = fileList.rows[index].cells
    switch (action.firstChild.textContent) {
        case actionMap.upload:
            action.firstChild.setAttribute("disabled", true)
            status.textContent = statusMap.uploading
            fetch(`/${name.textContent}`, {
                method: 'PUT',
                body: file
            }).then(async (resp) => {
                if (resp.status === 200) {
                    const data = await resp.json()
                    const linkElement = document.createElement('a')
                    linkElement.href = decodeURI(data.url)
                    linkElement.textContent = name.textContent
                    linkElement.onclick = (event) => {
                        event.preventDefault()
                        navigator.clipboard.writeText(data.url)
                    }
                    name.textContent = ''
                    name.appendChild(linkElement)
                    name.contentEditable = false
                    status.textContent = statusMap.uploaded
                    action.firstChild.textContent = actionMap.delete
                } else {
                    status.textContent = statusMap.uploadFail
                }
                action.firstChild.removeAttribute("disabled")
            })
            break
        case actionMap.delete:
            action.firstChild.setAttribute("disabled", true)
            status.textContent = statusMap.deleting
            fetch(`/${name.firstChild.textContent}`, {
                method: 'DELETE'
            }).then((resp) => {
                if (resp.status === 200) {
                    name.textContent = name.firstChild.textContent
                    status.textContent = statusMap.deleted
                    action.removeChild(action.firstChild)
                } else {
                    status.textContent = statusMap.deleteFail
                    action.firstChild.removeAttribute("disabled")
                }
            })
            break
    }
}