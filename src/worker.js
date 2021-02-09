importScripts("./lib/pdf-lib/pdf-lib.min.js");

const {
  PDFDocument,
  PDFPage
} = PDFLib

var parameters = {}

onmessage = async function (e) {
  if (e.data instanceof ArrayBuffer) {
    try {
      await convert(e.data)
    } catch (error) {
      if (error.loadError) {
        postMessage("load-error");
      } else if (error.sizeError) {
        postMessage("size-error");
      } else {
        postMessage("error");
      }
      throw error;
    }
  } else {
    parameters = e.data;
  }
}

async function convert(file) {

  const pdf = await load(file);

  checkSize(pdf)
  const s = pdf.getPage(0).getSize();

  const pages = extract_reversed_order_pages(pdf);

  clearPdf(pdf);
  
  let r = 0;
  for (let i = 0; i < pages.forward.length; i++) {
    let f = pages.forward[i];
    let already_added = false;

    if (!f) {
      f = pdf.addPage([s.width, s.height]);
      already_added = true;
    }

    // Double the page width
    f.setWidth(s.width * 2);

    // Switch sides for every other page
    if ((i % 2) != 1)
      f.translateContent(s.width, 0);
    
    // Insert reversed order page and switch sides if needed
    let b = pages.backward[i];
    if (b)
      if ((i % 2) != 1)
        f.drawPage(await pdf.embedPage(b), {
          x: -s.width
        });
      else
        f.drawPage(await pdf.embedPage(b), {
          x: s.width
        });

    if (!already_added)
      pdf.addPage(f);
  }

  // Send results to main thread
  postMessage(await pdf.save());
}

async function load(data) {
  try {
    return await PDFDocument.load(data);
  } catch (error) {
    error.loadError = true;
    throw error;
  }
}

function checkSize(pdf) {
  const n = pdf.getPageCount();
  const r = pdf.getPage(0).getSize();
  for (i = 1; i < n; i++) {
    let s = pdf.getPage(i).getSize();
    if (s.height == r.height && s.width == r.height) {
      var e = new Error("Pages do not have the same size.");
      e.sizeError = true;
      throw e;
    }
  }
}

function extract_reversed_order_pages(pdf) {
  let n = pdf.getPageCount();

  // Early outs for small pdfs.
  if (n == 1) {
    // Only one page exists, nothing to reverse
    return {
      forward: pdf.getPages(),
      backward: []
    };
  }
  
  if (n == 2 && parameters.lastpage) {
    // Two pages, both covers.
    let pages = [pdf.getPage(1)];
    return {
      forward: [pdf.getPage(0)],
      backward: [pdf.getPage(1)]
    };
  }

  const forward = pdf.getPages();

  // Insert empty cover pages
  if (parameters.insertafterfront) {
    forward.splice(1, 0, false);
  }
  if (parameters.lastpage && parameters.insertbeforeback) {
    forward.splice(forward.length - 1, 0, false);
  }

  // Number of pages missing for a multiple of 4
  n = forward.length;
  let defecit = (4 - n % 4) % 4;
  let reverse_from;

  // Determine where to reverse from
  if (defecit == 0) {
    reverse_from = n / 2;
  } else {
    reverse_from = Math.ceil((n + defecit) / 2);
  }

  // Get reverse pages
  const backward = forward.splice(reverse_from, n).reverse();

  // Add missing empty pages
  let missing = forward.length - backward.length;
  while(missing-- > 0) {
    if (parameters.lastpage) {
      backward.splice(1, 0, false);
    } else {
      backward.splice(0, 0, false);
    }
  }
 
  return {
    forward: forward,
    backward: backward
  };
}

function create_empty_page(pdf) {
  let page = PDFPage.create(pdf);
  let size = pdf.getPage(0).getSize();
  page.setSize(size.width, size.height);
  return page;
}

function clearPdf(pdf) {
  let n = pdf.getPageCount();
  while(n-- > 0) {
    pdf.removePage(0);
  }
}