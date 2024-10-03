const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')
const fileTable = document.getElementById('tableContainer')
const fileCount = document.getElementById('count')
const fileTotal = document.getElementById('total')

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

const operationMap = {
    upload: 'Upload',
    delete: 'Delete'
}

fileInput.addEventListener('change', () => {
    while (fileList.firstChild)
        fileList.removeChild(fileList.firstChild)

    if (fileInput.files && fileInput.files.length > 0) {
        fileTable.style.setProperty('display', 'flex')
        let total = 0
        for (const file of fileInput.files) {
            const newRow = fileList.insertRow()
            newRow.insertCell(0).textContent = file.name
            newRow.insertCell(1).textContent = filesize(file.size)
            total += file.size
            if (file.size > 1e8)
                newRow.insertCell(2).textContent = statusMap.tooBig
            else {
                newRow.insertCell(2).textContent = statusMap.notUploaded
                newRow.cells[0].contentEditable = true
            }
            newRow.insertCell(3).textContent = operationMap.upload
            newRow.cells[3].classList.add('operation')
        }
        fileCount.textContent = `Count: ${fileInput.files.length}`
        fileTotal.textContent = `Total: ${filesize(total)}`
    } else {
        fileTable.style.setProperty('display', 'none')
    }
})

document.getElementById('fileTable').addEventListener('click', (event) => {
    if (event.target.tagName.toLowerCase() === 'td') {
        const row = event.target.parentElement
        const rowIndex = Array.from(row.parentElement.children).indexOf(row)
        const colIndex = Array.from(row.children).indexOf(event.target)
        if (colIndex === 3)
            onChink(rowIndex)
    }
})

document.getElementById('uploadButton').addEventListener('click', () => {
    for (let i = 0; i < fileInput.files?.length || 0; i++) {
        onChink(i)
    }
})

const onChink = (index) => {
    const file = fileInput.files[index]
    const row = fileList.rows[index]
    switch (row.cells[3].textContent) {
        case operationMap.upload:
            row.cells[2].textContent = statusMap.uploading
            fetch(`/${row.cells[0].textContent}`, {
                method: 'PUT',
                body: file
            }).then(async (resp) => {
                if (resp.status === 200) {
                    const data = await resp.json()
                    const { pathname } = new URL(data.url)
                    const filename = pathname.split('/').pop()

                    const linkElement = document.createElement('a')
                    linkElement.href = decodeURI(data.url)
                    linkElement.download = decodeURIComponent(filename)
                    linkElement.textContent = row.cells[0].textContent
                    row.cells[0].textContent = ''
                    row.cells[0].appendChild(linkElement)
                    row.cells[0].contentEditable = false
                    row.cells[2].textContent = statusMap.uploaded
                    row.cells[3].textContent = operationMap.delete
                } else {
                    row.cells[2].textContent = statusMap.uploadFail
                }
            })
            break
        case operationMap.delete:
            row.cells[2].textContent = statusMap.deleting
            fetch(`/${row.cells[0].firstChild.textContent}`, {
                method: 'DELETE'
            }).then(async (resp) => {
                if (resp.status === 200) {
                    row.cells[0].textContent = row.cells[0].firstChild.textContent
                    row.cells[2].textContent = statusMap.deleted
                    row.cells[3].textContent = ''
                    row.cells[3].classList.remove('operation')
                } else {
                    row.cells[2].textContent = statusMap.deleteFail
                }
            })
            break
        default:
            console.log('other status')
    }
}