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
            total += file.size
            insertRow(file)
        }
        document.getElementById('count').textContent = `Count: ${fileInput.files.length}`
        document.getElementById('total').textContent = `Total: ${filesize(total)}`
    } else {
        document.getElementById('tableContainer')?.style.setProperty('display', 'none')
    }
})

const insertRow = (file) => {
    const row = fileList.insertRow()
    const name = row.insertCell()
    const size = row.insertCell()
    const status = row.insertCell()
    const action = row.insertCell()
    name.textContent = file.name
    size.textContent = filesize(file.size)
    if (file.size > 1e8)
        status.textContent = statusMap.tooBig
    else {
        status.textContent = statusMap.notUploaded
        name.contentEditable = true
        const actionButton = document.createElement('button')
        actionButton.textContent = actionMap.upload
        actionButton.classList.add('action')
        action.appendChild(actionButton)
        actionButton.onclick = async () => {
            if (actionButton.textContent === actionMap.upload) {
                actionButton.setAttribute('disabled', true)
                status.textContent = statusMap.uploading
                const resp = await fetch(`/${file.name}`, {
                    method: 'PUT',
                    body: file
                })
                if (resp.status === 200) {
                    const data = await resp.json()
                    const nameLink = document.createElement('u')
                    nameLink.textContent = file.name
                    nameLink.onclick = () => {
                        navigator.clipboard.writeText(data.url)
                    }
                    name.textContent = ''
                    name.appendChild(nameLink)
                    name.contentEditable = false
                    status.textContent = statusMap.uploaded
                    actionButton.textContent = actionMap.delete
                } else {
                    status.textContent = statusMap.uploadFail
                }
                actionButton.removeAttribute('disabled')
            } else if (actionButton.textContent === actionMap.delete) {
                actionButton.setAttribute('disabled', true)
                status.textContent = statusMap.deleting
                const resp = await fetch(`/${file.name}`, {
                    method: 'DELETE'
                })
                if (resp.status === 200) {
                    name.textContent = file.name
                    status.textContent = statusMap.deleted
                    action.removeChild(actionButton)
                } else {
                    status.textContent = statusMap.deleteFail
                    actionButton.removeAttribute('disabled')
                }
            }
        }
    }
}