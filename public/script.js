const fileInput = document.getElementById('fileInput')
const fileList = document.getElementById('fileList')
const fileTable = document.getElementById('tableContainer')
const fileCount = document.getElementById('count')
const fileTotal = document.getElementById('total')

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
                newRow.insertCell(2).textContent = 'Too big file'
            else {
                newRow.insertCell(2).textContent = 'Not uploaded'
                newRow.cells[2].classList.add('status')
            }
        }
        fileCount.textContent = `Count: ${fileInput.files.length}`
        fileTotal.textContent = `Total Size: ${filesize(total)}`
    } else {
        fileTable.style.setProperty('display', 'none')
    }
})

document.getElementById('fileTable').addEventListener('click', (event) => {
    if (event.target.tagName.toLowerCase() === 'td') {
        const cell = event.target
        const row = cell.parentElement
        const rowIndex = Array.from(row.parentElement.children).indexOf(row)
        const colIndex = Array.from(row.children).indexOf(cell)
        if (colIndex === 2)
            Upload(rowIndex)
    }
})

document.getElementById('uploadButton').addEventListener('click', () => {
    for (let i = 0; i < fileInput.files?.length || 0; i++) {
        Upload(i)
    }
})

const Upload = (index) => {
    const file = fileInput.files[index]
    const row = fileList.rows[index]
    if (file.size > 1e8) {
        row.cells[2].textContent = 'Pass'
    } else {
        row.cells[2].textContent = "Uploading"
        fetch(`/${row.cells[0].textContent}`, {
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