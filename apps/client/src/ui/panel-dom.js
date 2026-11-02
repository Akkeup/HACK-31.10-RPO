// Keep live control nodes: a snapshot must never remove a pressed button or open select.
const markup = new WeakMap();
function key(node) {
  if (node.nodeType !== 1) return null;
  const action =
    node.getAttribute("data-competition") ||
    node.getAttribute("data-education");
  if (action)
    return `${node.tagName}:action:${action}:${node.getAttribute("data-option") || node.getAttribute("data-module") || ""}`;
  if (node.id) return `${node.tagName}:id:${node.id}`;
  if (node.hasAttribute("name"))
    return `${node.tagName}:name:${node.getAttribute("name")}:${node.getAttribute("data-question") || ""}`;
  if (node.tagName === "OPTION") return `OPTION:${node.value}`;
  return null;
}
function same(a, b) {
  return (
    a.nodeType === b.nodeType &&
    (a.nodeType !== 1 || a.tagName === b.tagName) &&
    key(a) === key(b)
  );
}
function patch(node, next) {
  if (node.nodeType !== 1) {
    if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
    return;
  }
  for (const attr of [...node.attributes])
    if (!next.hasAttribute(attr.name)) node.removeAttribute(attr.name);
  for (const attr of [...next.attributes])
    if (node.getAttribute(attr.name) !== attr.value)
      node.setAttribute(attr.name, attr.value);
  children(node, next);
  // Values come from the view's draft, never from an unrelated network refresh.
  if (["INPUT", "TEXTAREA"].includes(node.tagName) && node.value !== next.value)
    node.value = next.value;
  if (
    node.tagName === "SELECT" &&
    document.activeElement !== node &&
    node.value !== next.value
  )
    node.value = next.value;
}
function children(parent, next) {
  const previous = [...parent.childNodes],
    used = new Set();
  let cursor = parent.firstChild;
  for (const desired of [...next.childNodes]) {
    let current =
      cursor && !used.has(cursor) && same(cursor, desired)
        ? cursor
        : previous.find((n) => !used.has(n) && same(n, desired));
    if (current) {
      used.add(current);
      if (current !== cursor) parent.insertBefore(current, cursor);
      patch(current, desired);
    } else {
      current = desired.cloneNode(true);
      parent.insertBefore(current, cursor);
    }
    cursor = current.nextSibling;
  }
  for (const old of previous) if (!used.has(old)) old.remove();
}
export function updatePanel(root, html) {
  if (markup.get(root) === html) return;
  const template = document.createElement("template");
  template.innerHTML = html;
  children(root, template.content);
  markup.set(root, html);
}
