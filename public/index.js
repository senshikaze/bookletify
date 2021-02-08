const {
    PDFDocument
} = PDFLib

async function convert() {
    const pdfFile = document.getElementById("pdf-file").files[0];
    let lastpage = document.getElementById("lastpage").checked;
    const converting = document.getElementById("convering");

    converting.style.visibility = "visible";

    if (!pdfFile)
        return;

    // Load the pdf
    const pdf = await PDFDocument.load(await pdfFile.arrayBuffer());

    // Extract the latter half of pages.
    const n = pdf.getPageCount();
    let defecit = 4 - n % 4;
    const halfway = Math.ceil((n + defecit) / 2);
    const reversedPages = pdf.getPages().slice(halfway, n).reverse();
    for (i = halfway; i < n; i++)
        pdf.removePage(halfway);

    // Assume all pages have the same width;
    const w = pdf.getPage(0).getWidth();

    let r = 0;
    for (let i = 0; i < halfway; i++) {
        let p = pdf.getPage(i);

        // Double the page width
        p.setWidth(w * 2);

        // Translate very other page
        if ((i % 2) != 1)
            p.translateContent(w, 0);

        // Insert the reversed page
        if (lastpage) 
            lastpage = false;
        else    
            if (defecit-- > 0) 
            continue;

        let e = await pdf.embedPage(reversedPages[r++])
        if ((i % 2) != 1)
            p.drawPage(e, {
                x: -w
            });
        else
            p.drawPage(e, {
                x: w
            });
    }

    download(await pdf.save(), pdfFile.name.replace(".pdf", "-booklet.pdf"), "application/pdf");

    converting.style.visibility = "hidden";
}