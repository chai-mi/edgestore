const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')
const notification = document.getElementById('notification')

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

fileInput.addEventListener('change', async () => {
    while (fileList.firstChild)
        fileList.removeChild(fileList.firstChild)

    let { count, total } = await tableInit()
    count += fileInput.files.length
    for (const file of fileInput.files) {
        total += file.size
        insertRow(file)
    }
    if (count > 0) {
        document.getElementById('count').textContent = `Count: ${count}`
        document.getElementById('total').textContent = `Total: ${filesize(total)}`
        document.getElementById('tableContainer').style.setProperty('display', 'flex')
    } else {
        document.getElementById('tableContainer').style.setProperty('display', 'none')
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
                        notification.style.visibility = 'visible'
                        notification.style.opacity = 1
                        setTimeout(() => {
                            notification.style.opacity = 0
                            setTimeout(() => {
                                notification.style.visibility = 'hidden'
                            }, 500)
                        }, 1000)
                    }
                    name.textContent = ''
                    name.appendChild(nameLink)
                    name.contentEditable = false
                    status.textContent = statusMap.uploaded
                    actionButton.textContent = actionMap.delete
                    db.transaction(uploadedFileObjectStore, 'readwrite')
                        .objectStore(uploadedFileObjectStore)
                        .put({
                            url: data.url,
                            ttl: data.ttl,
                            name: file.name,
                            size: file.size,
                        })
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
                    const data = await resp.json()
                    db.transaction(uploadedFileObjectStore, 'readwrite')
                        .objectStore(uploadedFileObjectStore)
                        .delete(data.url)
                } else {
                    status.textContent = statusMap.deleteFail
                    actionButton.removeAttribute('disabled')
                }
            }
        }
    }
}

const insertUploadedRow = (result) => {
    const row = fileList.insertRow()
    const name = row.insertCell()
    const size = row.insertCell()
    const status = row.insertCell()
    const action = row.insertCell()
    name.textContent = result.name
    size.textContent = filesize(result.size)
    status.textContent = statusMap.uploaded
    const actionButton = document.createElement('button')
    actionButton.textContent = actionMap.delete
    actionButton.classList.add('action')
    action.appendChild(actionButton)
    actionButton.onclick = async () => {
        if (actionButton.textContent === actionMap.delete) {
            actionButton.setAttribute('disabled', true)
            status.textContent = statusMap.deleting
            const resp = await fetch(`/${result.name}`, {
                method: 'DELETE'
            })
            if (resp.status === 200) {
                name.textContent = result.name
                status.textContent = statusMap.deleted
                action.removeChild(actionButton)
                const data = await resp.json()
                db.transaction(uploadedFileObjectStore, 'readwrite')
                    .objectStore(uploadedFileObjectStore)
                    .delete(data.url)
            } else {
                status.textContent = statusMap.deleteFail
                actionButton.removeAttribute('disabled')
            }
        }
    }
}

let db
const uploadedFileObjectStore = 'uploaded'
const request = indexedDB.open('file', 1)

request.onsuccess = async (event) => {
    db = event.target.result
    const { count, total } = await tableInit()
    if (count > 0) {
        document.getElementById('count').textContent = `Count: ${count}`
        document.getElementById('total').textContent = `Total: ${filesize(total)}`
        document.getElementById('tableContainer').style.setProperty('display', 'flex')
    }
}

request.onupgradeneeded = (event) => {
    db = event.target.result
    if (!db.objectStoreNames.contains(uploadedFileObjectStore)) {
        db.createObjectStore(uploadedFileObjectStore, { keyPath: 'url' })
    }
}

const tableInit = () => {
    return new Promise((resolve, reject) => {
        const uploadedfile = db
            .transaction(uploadedFileObjectStore, 'readwrite')
            .objectStore(uploadedFileObjectStore)
        const cursorRequest = uploadedfile.openCursor()
        let total = 0
        let count = 0
        const now = performance.now()
        cursorRequest.onsuccess = (event) => {
            const result = event.target.result
            if (result) {
                if (result.value.ttl > now) {
                    insertUploadedRow(result.value)
                    count += 1
                    total += result.value.size
                } else {
                    uploadedfile.delete(result.value.url)
                }
                result.continue()
            } else {
                resolve({ total, count })
            }
        }
        cursorRequest.onerror = (event) => {
            reject(event.target.error)
        }
    })
}