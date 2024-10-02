const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')
const fileTable = document.getElementById('tableContainer')
const fileCount = document.getElementById('count')
const fileTotal = document.getElementById('total')

const statusMap = {
    tooBig: 'Too big file',
    notUploaded: 'Not uploaded',
    pass: 'Pass',
    uploading: 'Uploading',
    uploaded: 'uploaded',
    uploadFail: 'Upload fail'
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
            newRow.cells[2].classList.add('status')
        }
        fileCount.textContent = `Count: ${fileInput.files.length}`
        fileTotal.textContent = `Total Size: ${filesize(total)}`
    } else {
        fileTable.style.setProperty('display', 'none')
    }
})

document.getElementById('fileTable').addEventListener('click', (event) => {
    if (event.target.tagName.toLowerCase() === 'td') {
        const row = event.target.parentElement
        const rowIndex = Array.from(row.parentElement.children).indexOf(row)
        const colIndex = Array.from(row.children).indexOf(event.target)
        if (colIndex === 2)
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
    switch (row.cells[2].textContent) {
        case statusMap.notUploaded:
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
                    linkElement.textContent = statusMap.uploaded
                    row.cells[2].textContent = ''
                    row.cells[2].appendChild(linkElement)
                    eow.cells[0].contentEditable = false
                } else {
                    row.cells[2].textContent = statusMap.uploadFail
                }
            })
            break
        case statusMap.tooBig:
            row.cells[2].textContent = 'Pass'
            break
        default:
            console.log('other status')
    }
}