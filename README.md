# 🎉 Kib Document Events  

> A lightweight utility for managing **document** and **window** events like a boss 🧙‍♂️✨  
> Handles setup, debouncing, throttling, and cleanup — so you don’t end up with a spaghetti web of listeners.  

---

## 🚀 Features  

- 🔗 **Singleton pattern** – import once, use anywhere.  
- 🧹 **Automatic cleanup** – no more zombie listeners haunting your app.  
- ⚡ **Event modules out of the box**:  
  - DOM Ready & Load tracking  
  - Viewport resize/scroll  
  - Keyboard shortcuts  
  - Navigation (history / hashchange)  
  - Network online/offline  
  - Clipboard (copy / cut / paste)  
  - Drag & Drop  
  - Lifecycle visibility/focus  
  - Error handling  

---

## 📦 Installation  

```bash
npm install kib_document_events
```

---

## 🛠️ Usage  

### Import the singleton
```js
import docEvents from "kib_document_events";

// Or get the class if you want multiple instances
import { KibDocumentEvents } from "kib_document_events";
```

### Example: DOM Ready & Loaded
```js
docEvents.ready(() => {
  console.log("DOM is ready! 🚀");
});

docEvents.loaded(() => {
  console.log("All resources finished loading 🖼️");
});
```

### Example: Visibility Change
```js
docEvents.onVisibilityChange((hidden, state) => {
  console.log(`Page is now: ${state} (${hidden ? "hidden" : "visible"})`);
});
```

### Example: Clipboard
```js
const unsubscribe = docEvents.onClipboard(({ type, data }) => {
  console.log(`Clipboard event: ${type}, data: ${data}`);
});

// Later...
unsubscribe();
```

### Example: Delegate Events
```js
docEvents.delegate("button.save", "click", (e, target) => {
  console.log("Save button clicked:", target);
});
```

---

## 🧼 Cleanup  

All tracked listeners can be removed at once:  
```js
docEvents.removeAllListeners();
```

---

## 📊 State Snapshot  

Grab current environment info any time:  
```js
console.log(docEvents.getState());
/*
{
  isReady: true,
  isLoaded: false,
  isOnline: true,
  isVisible: true,
  hasFocus: true,
  viewport: { width: 1440, height: 900 },
  scroll: { x: 0, y: 0 }
}
*/
```

---

## 🧑‍💻 For Hackers  

Want more control? You can import the core class:  
```js
import { KibDocumentEvents } from "kib_document_events";

const myEvents = new KibDocumentEvents();
```

---

## 📝 License  

MIT © [kibmuikia](https://github.com/)  

---

### 💡 Fun fact  
This project is basically a **party planner for browser events** 🎈 —  
it makes sure everyone shows up on time, behaves properly, and leaves without making a mess.  
