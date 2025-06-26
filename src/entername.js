import { Vnode } from "../framework/index.js";
import { waitingpage } from "./waiting.js";

function handleSubmit(e) {
  e.preventDefault();
  const name = e.target.elements.playerName.value.trim();
  if (name) {
    document.body.innerHTML = "";
    waitingpage(name);
  }
}

export function EnterNamePage() {
  return Vnode("div", { class: "enter-name" }, [
    Vnode("h2", {}, ["Enter your name to join"]),
    Vnode(
      "form",
      { onsubmit: handleSubmit },
      [
        Vnode("input", {
          type: "text",
          name: "playerName",
          placeholder: "Your name",
          required: true,
          autocomplete: "off",
        }),
        Vnode("button", { type: "submit" }, ["Join"]),
      ]
    ),
  ]);
}

