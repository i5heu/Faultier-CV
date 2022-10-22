import { editor } from "monaco-editor";
import { Store, defaults } from "./default";
import { marked } from "marked";

const store: Store = defaults;

const editorInstance = editor.create(document.getElementById("editor"), {
  value: store.markdown,
  language: "markdown",
  theme: "vs-dark",
});

console.log("Hello World");

const iframe = document.createElement("iframe");
document.getElementById("preview").innerHTML = "";
document.getElementById("preview").appendChild(iframe);

buildPreview();

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
  iframe.contentWindow.document.close();
}

document.getElementById("save").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "store.json";
  a.click();
});

document.getElementById("html").addEventListener("click", () => {
  const blob = new Blob([], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "index.html";
  a.click();
});
