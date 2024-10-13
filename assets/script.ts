declare function filesize(size: number): string

const fileInput = document.getElementById('fileInput') as HTMLInputElement
const fileList = document.getElementById('fileList') as HTMLTableSectionElement
const notification = document.getElementById('notification') as HTMLElement
const countElement = document.getElementById('count') as HTMLElement
const totalElement = document.getElementById('total') as HTMLElement
const tableElement = document.getElementById('tableContainer') as HTMLElement

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
    if (fileInput.files && fileInput.files.length > 0) {
        count += fileInput.files.length
        Array.from(fileInput.files).map(file => {
            total += file.size
            insertRow(file)
        })
    }
    if (count > 0) {
        countElement.textContent = `Count: ${count}`
        totalElement.textContent = `Total: ${filesize(total)}`
        tableElement.style.setProperty('display', 'flex')
    } else {
        tableElement.style.setProperty('display', 'none')
    }
})

const insertRow = (file: File) => {
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
        name.contentEditable = 'true'
        const actionButton = document.createElement('button')
        actionButton.textContent = actionMap.upload
        actionButton.classList.add('action')
        action.appendChild(actionButton)
        actionButton.onclick = async () => {
            actionButton.setAttribute('disabled', 'true')
            status.textContent = statusMap.uploading
            const target = new URL(name.textContent as string, window.location.href)
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
                    notification.style.opacity = '1'
                    setTimeout(() => {
                        notification.style.opacity = '0'
                        setTimeout(() => {
                            notification.style.visibility = 'hidden'
                        }, 500)
                    }, 1000)
                }
                name.textContent = ''
                name.appendChild(nameLink)
                name.contentEditable = 'false'
                status.textContent = statusMap.uploaded
                actionButton.textContent = actionMap.delete
                actionButton.onclick = async () => {
                    actionButton.setAttribute('disabled', 'true')
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

interface UploadedFile {
    name: string
    size: number
    url: string
    ttl: number
}

const insertUploadedRow = (result: UploadedFile) => {
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
        notification.style.opacity = '1'
        setTimeout(() => {
            notification.style.opacity = '0'
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
        actionButton.setAttribute('disabled', 'true')
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

const insertExpiredRow = (result: UploadedFile) => {
    const row = fileList.insertRow()
    const name = row.insertCell()
    const size = row.insertCell()
    const status = row.insertCell()
    const action = row.insertCell()
    name.textContent = result.name
    size.textContent = filesize(result.size)
    status.textContent = statusMap.expired
}

let db: IDBDatabase
const uploadedFileObjectStore = 'uploaded'
const request = indexedDB.open('file', 1)

request.onsuccess = async () => {
    db = request.result
    const { count, total } = await tableInit()
    if (count > 0) {
        countElement.textContent = `Count: ${count}`
        totalElement.textContent = `Total: ${filesize(total)}`
        tableElement.style.setProperty('display', 'flex')
    }
}

request.onupgradeneeded = () => {
    db = request.result
    if (!db.objectStoreNames.contains(uploadedFileObjectStore)) {
        db.createObjectStore(uploadedFileObjectStore, { keyPath: 'url' })
    }
}

const tableInit = (): Promise<{ total: number, count: number }> => {
    return new Promise((resolve, reject) => {
        const uploadedfile = db
            .transaction(uploadedFileObjectStore, 'readwrite')
            .objectStore(uploadedFileObjectStore)
        const cursorRequest = uploadedfile.openCursor()
        let total = 0
        let count = 0
        const now = performance.now()
        cursorRequest.onsuccess = () => {
            const result = cursorRequest.result
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
        cursorRequest.onerror = () => {
            reject(cursorRequest.error)
        }
    })
}