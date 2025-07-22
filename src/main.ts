import { editor } from "monaco-editor";
import { Store, defaults } from "./default";
import { marked } from "marked";

const store: Store = getStorageFromBrowser()
  ? getStorageFromBrowser()
  : defaults;
const fileTabs = document.getElementById("fileTabs") as HTMLDivElement;
setTabAsActive("markdown");

const editorInstance = editor.create(document.getElementById("editor"), {
  value: store.markdown,
  language: "markdown",
  theme: "vs-dark",
});
window.onresize = function () {
  editorInstance.layout();
};

console.log("Application starting...");
let iframeHTMLPassive = "";
const iframe = document.createElement("iframe");
const preview = document.getElementById("preview");
const pdfPreview = document.getElementById("pdfPreview");
preview.innerHTML = "";
preview.appendChild(iframe);

buildPreview();

fileTabs.addEventListener("click", (e: any) => {
  const val = e.target.innerText;
  setTabAsActive(val);
  switch (val) {
    case "markdown":
      editorInstance.setValue(store.markdown);
      break;
    case "html":
      editorInstance.setValue(store.html);
      break;
    case "css":
      editorInstance.setValue(store.css);
      break;
    default:
      break;
  }
});

let loading = false;

editorInstance.getModel().onDidChangeContent((e) => {
  if (loading) return;
  loading = true;
  setTimeout(() => {
    setCurrentFile(editorInstance.getValue());
    buildPreview();
    handlePdfPreview();
    loading = false;
  }, 1000);
});

function setCurrentFile(val: string) {
  const file = getCurrentFile();
  switch (file) {
    case "markdown":
      store.markdown = val;
      break;
    case "html":
      store.html = val;
      break;
    case "css":
      store.css = val;
      break;
    default:
      break;
  }

  editor.setModelLanguage(editorInstance.getModel(), file);
}

function getCurrentFile() {
  return fileTabs.querySelector(".active").innerHTML;
}

function setTabAsActive(file: string) {
  const active = fileTabs.querySelector(".active");
  if (active) active.classList.remove("active");
  const newActive = fileTabs.querySelector(`[data-file='${file}']`);
  newActive.classList.add("active");
}

function buildPreview() {
  let html = store.html;
  const css = store.css;
  const markdownParsed = marked.parse(store.markdown);

  html = html.replace("{{css}}", css);
  html = html.replace("{{markdown}}", markdownParsed);

  iframe.contentWindow.document.write(linksWithNewTab(html));
  iframe.contentWindow.document.close();
  iframeHTMLPassive = html;
  saveStorageInBrowser();
}

function linksWithNewTab(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = doc.querySelectorAll("a");
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
  });
  return doc.documentElement.innerHTML;
}

document.getElementById("save").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Faultier-CV-store.json";
  a.click();
});

document.getElementById("import").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result as string;
      const store = JSON.parse(text);
      editorInstance.setValue(store.markdown);
      setTabAsActive("markdown");
      buildPreview();
    };
    reader.readAsText(file);
  };
  input.click();
});

document.getElementById("html").addEventListener("click", () => {
  const blob = new Blob([iframeHTMLPassive], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Faultier-CV-CV.html";
  a.click();
});

document.getElementById("pdf").addEventListener("click", async () => {
  try {
    const resp = await fetch("/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "text/html" },
      body: iframeHTMLPassive,
    });
    if (!resp.ok) throw new Error("failed");
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Faultier-CV.pdf";
    a.click();
  } catch (e) {
    alert("PDF generation failed: " + e.message);
  }
});


function saveStorageInBrowser() {
  localStorage.setItem("store", JSON.stringify(store));
}

function getStorageFromBrowser() {
  const store = localStorage.getItem("store");
  if (store) return JSON.parse(store);
  return null;
}

const showPdfPreviewCheckbox = document.getElementById("showPdfPreview") as HTMLInputElement;
let pdfPreviewAbortController: AbortController | null = null;

async function handlePdfPreview() {
  if (!showPdfPreviewCheckbox.checked) {
    pdfPreview.classList.remove("active");
    buildPreview();
    return;
  }

  // Abort ONLY if the previous one is still running
  if (pdfPreviewAbortController && !pdfPreviewAbortController.signal.aborted) {
    pdfPreviewAbortController.abort();
  }
  pdfPreviewAbortController = new AbortController();

  pdfPreview.classList.add("active");

  try {
    const resp = await fetch("/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "text/html" },
      body: iframeHTMLPassive,
      signal: pdfPreviewAbortController.signal,
      cache: "no-store"
    });

    if (!resp.ok) throw new Error("failed");

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);

    pdfPreview.innerHTML = "";
    const pdfIframe = document.createElement("iframe");
    pdfIframe.src = url;
    pdfIframe.width = "100%";
    pdfIframe.height = "100%";
    pdfIframe.style.border = "none";
    pdfPreview.appendChild(pdfIframe);
  } catch (e: any) {
    if (e.name !== "AbortError") {
      console.error("PDF preview failed", e);
    }
  }
}


// Listen for checkbox changes
showPdfPreviewCheckbox.addEventListener("change", handlePdfPreview);

const debounce = (fn: Function, ms: number) => {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const throttledResize = debounce(handlePdfPreview, 400);
window.addEventListener("resize", throttledResize);

const debouncedChange = debounce(() => {
  setCurrentFile(editorInstance.getValue());
  buildPreview();
  handlePdfPreview();
}, 700);

editorInstance.getModel().onDidChangeContent(debouncedChange);


handlePdfPreview();

const isGithubDomain = /(^|\.)github\.io$/.test(window.location.hostname);

if (isGithubDomain) {
  const pdfPreviewBtn = document.getElementById("showPdfPreview") as HTMLInputElement;
  const pdfDownloadBtn = document.getElementById("pdf") as HTMLButtonElement;

  if (pdfPreviewBtn) {
    pdfPreviewBtn.disabled = true;
    pdfPreviewBtn.title = "PDF preview is disabled on GitHub domains";
  }
  if (pdfDownloadBtn) {
    pdfDownloadBtn.disabled = true;
    pdfDownloadBtn.title = "PDF download is disabled on GitHub domains";
  }
}