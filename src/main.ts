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

console.log("Hello World");
let iframeHTMLPassive = "";
const iframe = document.createElement("iframe");
const preview = document.getElementById("preview");
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
  a.download = "store.json";
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
  a.download = "index.html";
  a.click();
});

function saveStorageInBrowser() {
  localStorage.setItem("store", JSON.stringify(store));
}

function getStorageFromBrowser() {
  const store = localStorage.getItem("store");
  if (store) return JSON.parse(store);
  return null;
}
