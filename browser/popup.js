import { ext, MODES, MODE_LABELS, getModes, setModes } from "./modes.js";
import { isReader, openReader } from "./read.js";

const box = document.getElementById("modes");
const on = await getModes();

for (const m of MODES) {
  const [name, desc] = MODE_LABELS[m].split(": ");
  const label = document.createElement("label");
  const input = Object.assign(document.createElement("input"), { type: "checkbox", value: m, checked: on.includes(m) });
  const text = document.createElement("div");
  text.append(Object.assign(document.createElement("b"), { textContent: name }), Object.assign(document.createElement("span"), { textContent: desc }));
  label.append(input, text);
  box.append(label);
}

box.addEventListener("change", () => {
  setModes([...box.querySelectorAll("input:checked")].map((i) => i.value));
});

const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
const readButton = document.getElementById("read");
if (isReader(tab)) {
  readButton.disabled = true;
  readButton.textContent = "This tab is the reader";
}
readButton.onclick = async () => {
  try {
    await openReader(tab, { preferSelection: false });
    window.close();
  } catch (e) {
    document.getElementById("error").textContent = `Cannot open the reader: ${e.message}`;
  }
};
