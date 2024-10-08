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
    expired: 'Expired'
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
            actionButton.setAttribute('disabled', true)
            status.textContent = statusMap.uploading
            const target = new URL(name.textContent, window.location.href)
            target.searchParams.set('sign', crypto.randomUUID())
            const resp = await fetch(target, {
                method: 'PUT',
                body: file
            })
            if (resp.status !== 200) {
                status.textContent = statusMap.uploadFail
            } else {
                const putData = await resp.json()
                const nameLink = document.createElement('u')
                nameLink.textContent = name.textContent
                nameLink.onclick = () => {
                    navigator.clipboard.writeText(putData.url)
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
                actionButton.onclick = async () => {
                    actionButton.setAttribute('disabled', true)
                    status.textContent = statusMap.deleting
                    const resp = await fetch(putData.url, {
                        method: 'DELETE'
                    })
                    name.textContent = name.textContent
                    status.textContent = statusMap.deleted
                    action.removeChild(actionButton)
                    const deleteData = await resp.json()
                    db.transaction(uploadedFileObjectStore, 'readwrite')
                        .objectStore(uploadedFileObjectStore)
                        .delete(deleteData.url)
                    actionButton.removeAttribute('disabled')
                }
                db.transaction(uploadedFileObjectStore, 'readwrite')
                    .objectStore(uploadedFileObjectStore)
                    .put({
                        url: putData.url,
                        ttl: putData.ttl,
                        name: name.textContent,
                        size: file.size,
                    })
            }
            actionButton.removeAttribute('disabled')
        }
    }
}

const insertUploadedRow = (result) => {
    const row = fileList.insertRow()
    const name = row.insertCell()
    const size = row.insertCell()
    const status = row.insertCell()
    const action = row.insertCell()
    const nameLink = document.createElement('u')
    nameLink.textContent = result.name
    nameLink.onclick = () => {
        navigator.clipboard.writeText(result.url)
        notification.style.visibility = 'visible'
        notification.style.opacity = 1
        setTimeout(() => {
            notification.style.opacity = 0
            setTimeout(() => {
                notification.style.visibility = 'hidden'
            }, 500)
        }, 1000)
    }
    name.appendChild(nameLink)
    size.textContent = filesize(result.size)
    status.textContent = statusMap.uploaded
    const actionButton = document.createElement('button')
    actionButton.textContent = actionMap.delete
    actionButton.classList.add('action')
    action.appendChild(actionButton)
    actionButton.onclick = async () => {
        actionButton.setAttribute('disabled', true)
        status.textContent = statusMap.deleting
        const resp = await fetch(result.url, {
            method: 'DELETE'
        })
        name.textContent = result.name
        status.textContent = statusMap.deleted
        action.removeChild(actionButton)
        const data = await resp.json()
        db.transaction(uploadedFileObjectStore, 'readwrite')
            .objectStore(uploadedFileObjectStore)
            .delete(data.url)
        actionButton.removeAttribute('disabled')
    }
}

const insertExpiredRow = (result) => {
    const row = fileList.insertRow()
    const name = row.insertCell()
    const size = row.insertCell()
    const status = row.insertCell()
    const action = row.insertCell()
    name.textContent = result.name
    size.textContent = filesize(result.size)
    status.textContent = statusMap.expired
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
                count += 1
                total += result.value.size
                if (result.value.ttl > now) {
                    insertUploadedRow(result.value)
                } else {
                    insertExpiredRow(result.value)
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