# Patches

This is the folder `pnpm` uses to hold patches for dependencies.
`pnpm patch <package>` -> edit the `/tmp/<UUID>` from the output -> `pnpm patch-commit /tmp/<UUID>`
To undo - `pnpm patch-remove <package>`

* [react-modal-resizable-draggable@0.1.6.patch](./react-modal-resizable-draggable@0.1.6.patch)
  * Needed since the Modal was forcing `mouseDown` to stick on `Canvas` - dragging it around even once released
  * From [here](https://github.com/wwan5803/react-modal-resizable-draggable/issues/54) - had to edit the built
    minified `build/main.js` directly