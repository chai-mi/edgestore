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
            newRow.insertCell(0).textContent = file.name
            newRow.insertCell(1).textContent = filesize(file.size)
            total += file.size
            if (file.size > 1e8)
                newRow.insertCell(2).textContent = statusMap.tooBig
            else {
                newRow.insertCell(2).textContent = statusMap.notUploaded
                newRow.cells[0].contentEditable = true
            }
            const buttonElement = document.createElement('div')
            buttonElement.textContent = actionMap.upload
            buttonElement.classList.add('action')
            newRow.insertCell(3).appendChild(buttonElement)
        }
        document.getElementById('count')?.textContent = `Count: ${fileInput.files.length}`
        document.getElementById('total')?.textContent = `Total: ${filesize(total)}`
    } else {
        document.getElementById('tableContainer')?.style.setProperty('display', 'none')
    }
})

document.getElementById('fileTable').addEventListener('click', (event) => {
    if (event.target.classList.contains('action') && !event.target.classList.contains('waitAction')) {
        const tr = event.target.parentElement.parentElement
        const rowIndex = Array.from(tr.parentElement.children).indexOf(tr)
        onClick(rowIndex)
    }
})

const onClick = (index) => {
    row.cells[3].firstChild.classList.add('waitAction')
    const file = fileInput.files[index]
    const row = fileList.rows[index]
    switch (row.cells[3].firstChild.textContent) {
        case actionMap.upload:
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
                    row.cells[3].firstChild.textContent = actionMap.delete
                } else {
                    row.cells[2].textContent = statusMap.uploadFail
                }
            })
            break
        case actionMap.delete:
            row.cells[2].textContent = statusMap.deleting
            fetch(`/${row.cells[0].firstChild.textContent}`, {
                method: 'DELETE'
            }).then(async (resp) => {
                if (resp.status === 200) {
                    row.cells[0].textContent = row.cells[0].firstChild.textContent
                    row.cells[2].textContent = statusMap.deleted
                    row.cells[3].removeChild(row.cells[3].firstChild)
                } else {
                    row.cells[2].textContent = statusMap.deleteFail
                }
            })
            break
        default:
            console.log('other status')
    }
    row.cells[3].firstChild.classList.remove('waitAction')
}