import * as history from '../selectionHistory.js';

export function registerKeyboardShortcuts ({ map }) {
  document.addEventListener('keydown', (e) => {
    /* zoom */
    const view = map.getView();
    const z    = view.getZoom();
    if (e.key === '+' || e.key === '=') view.setZoom(z + 1);
    else if (e.key === '-')             view.setZoom(z - 1);

    /* undo / redo */
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey) history.undo();
    if ((e.ctrlKey||e.metaKey) &&
        (e.key.toLowerCase()==='y' || (e.key.toLowerCase()==='z' && e.shiftKey)))
      history.redo();
  });
}

