import { editor } from "monaco-editor";
import { Store, defaults } from "./default";
import { marked } from "marked";

console.log("Hello World");
let iframeHTMLRO = "";
const iframe = document.createElement("iframe");
document.getElementById("preview").innerHTML = "";
document.getElementById("preview").appendChild(iframe);

const store: Store = defaults;

buildPreview();

const editorInstance = editor.create(document.getElementById("editor"), {
  value: store.markdown,
  language: "markdown",
  theme: "vs-dark",
});

const fileSelect = document.getElementById("file") as HTMLSelectElement;
fileSelect.addEventListener("change", (e) => {
  const val = fileSelect.value;
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

editorInstance.getModel().onDidChangeContent((e) => {
  setCurrentFile(editorInstance.getValue());
  buildPreview();
});

function setCurrentFile(val: string) {
  const file = fileSelect.value;
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

function buildPreview() {
  let html = store.html;
  const css = store.css;
  const markdownParsed = marked.parse(store.markdown);

  html = html.replace("{{css}}", css);
  html = html.replace("{{markdown}}", markdownParsed);

  iframe.contentWindow.document.write(html);
  iframeHTMLRO = html;
  iframe.contentWindow.document.close();
  console.log("HIT");
}

document.getElementById("save").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "store.json";
  a.click();
});

document.getElementById("html").addEventListener("click", () => {
  const blob = new Blob([iframeHTMLRO], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "index.html";
  a.click();
});
