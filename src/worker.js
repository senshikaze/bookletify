importScripts("./lib/pdf-lib/pdf-lib.min.js");

const {
  PDFDocument,
  PDFPage
} = PDFLib

var parameters = {}

onmessage = async function (e) {
  if (e.data instanceof ArrayBuffer) {
    try {
      let pdf = await load(e.data);
      checkSize(pdf)
      let newPDF = await PDFDocument.create();
      let chunkSize = parameters.chunkSize ?? null;
      // if we have a chunk size, instead of doing the whole pdf at once,
      // we need to do the pdf in discreet "chunks" (also known as "impositions")
      if (chunkSize !== null) {
        // round up to next multiple of 4
        if ((mod = chunkSize % 4) !== 0) {
          chunkSize += (4 - mod);
        }
        let pageCount = pdf.getPageCount();
        let curr = 0;
        while (curr < pageCount) {
          let pages = extract_reversed_order_pages(pdf, chunkSize, curr);
          await convert(pdf, pages, newPDF);
          curr = curr + chunkSize;
        }
      } else {
        let pages = extract_reversed_order_pages(pdf);
        await convert(pdf, pages, newPDF)
      }
      // Send results to main thread
      postMessage(await newPDF.save());
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

async function convert(src, pages, newPDF = null) {
  const size = pages.forward[0].page.getSize();

  for (let i = 0; i < pages.forward.length; i++) {
    let f = pages.forward[i].page;
    let already_added = false;

    if (!f) {
      f = newPDF.addPage([size.width, size.height]);
      already_added = true;
    } else {
      [f] = await newPDF.copyPages(src, [pages.forward[i].index]);
    }

    // Double the page width
    f.setWidth(size.width * 2);

    // Switch sides for every other page
    if ((i % 2) != 1)
      f.translateContent(size.width, 0);
    
    // Insert reversed order page and switch sides if needed
    let b = pages.backward[i];
    if (b) {
      let [bPage] = await newPDF.copyPages(src, [b.index]);
      if ((i % 2) != 1)
        f.drawPage(await(newPDF.embedPage(bPage)), {
          x: -size.width
        });
      else
        f.drawPage(await(newPDF.embedPage(bPage)), {
          x: size.width
        });
    }

    if (!already_added) {
      newPDF.addPage(f);
    }
  }
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

function extract_reversed_order_pages(pdf, count = 0, start = 0) {
  let n = pdf.getPageCount();
  if (count == 0) {
    count = n;
  }
  // Early outs for small pdfs.
  if (count == 1) {
    // Only one page exists, nothing to reverse
    return {
      forward: [{
        page: pdf.getPage(0),
        index: 0
      }],
      backward: []
    };
  }
  
  if (count == 2 && parameters.lastpage) {
    // Two pages, both covers.
    return {
      forward: [{
        page: pdf.getPage(0),
        index: 0
      }],
      backward: [{
        page:pdf.getPage(1),
        index: 1
      }]
    };
  }

  // get the pages we need
  let forward = [];
  let backward = [];

  for(i = start; i < Math.min(n, start + count); i++) {
    forward.push({page: pdf.getPage(i), index: i});
  }

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
  backward = forward.splice(reverse_from, n).reverse();

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