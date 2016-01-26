"use strict";

/* eslint global-require: 0 */

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

const notImplemented = require("../../browser/not-implemented");
const idlUtils = require("../generated/utils");

let Canvas;
try {
  Canvas = require("canvas");
  if (typeof Canvas !== "function") {
    // In browserify, the require will succeed but return an empty object
    Canvas = null;
  }
} catch (e) {
  // Do nothing
}

class HTMLCanvasElementImpl extends HTMLElementImpl {

  _attrModified(name) {
    if (Canvas && (name === "width" || name === "height")) {
      // Just nullify the canvas on size changes. We only create the actual
      // object when we really need it, to avoid creating two canvases when
      // setting width and height separately, before actually using it.
      this._canvas = null;
    }

    return super._attrModified.apply(this, arguments);
  }

  _getCanvas() {
    if (Canvas && !this._canvas) {
      this._canvas = new Canvas(this.width, this.height);
    }
    return this._canvas;
  }

  getContext(contextId) {
    // We need to wrap the methods that receive an image or canvas object
    // (luckily, always as the first argument), so that these objects can be
    // unwrapped an the expected types passed.
    function wrap(ctx, name) {
      var prev = ctx[name];
      ctx[name] = function(image) {
        var impl = idlUtils.implForWrapper(image);
        if (impl) {
          arguments[0] = impl._image || impl._canvas;
        }
        return prev.apply(ctx, arguments);
      }
    }

    const canvas = this._getCanvas();
    if (canvas) {
      var context = canvas.getContext(contextId) || null;
      if (context && context.canvas !== this) {
        context.canvas = this;
        wrap(context, "createPattern");
        wrap(context, "drawImage");
      }
      return context;
    }

    notImplemented("HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)",
      this._ownerDocument._defaultView);
  }

  probablySupportsContext(contextId) {
    const canvas = this._getCanvas();
    return canvas ? contextId === "2d" : false;
  }

  setContext() {
    notImplemented("HTMLCanvasElement.prototype.setContext");
  }

  toDataURL() {
    const canvas = this._getCanvas();
    if (canvas) {
      return canvas.toDataURL.apply(this._canvas, arguments);
    }

    notImplemented("HTMLCanvasElement.prototype.toDataURL (without installing the canvas npm package)",
      this._ownerDocument._defaultView);
  }

  toBlob(callback, type, encoderOptions) {
    const window = this._ownerDocument._defaultView;
    const canvas = this._getCanvas();
    if (canvas) {
      let stream;
      switch (type) {
        case "image/jpg":
        case "image/jpeg":
          stream = canvas.createJPEGStream({
            quality: Math.min(0, Math.max(1, encoderOptions)) * 100
          });
          break;
        default:
          // TODO: Patch node-canvas to receive encoderOptions for PNG stream
          type = "image/png";
          stream = canvas.createPNGStream();
      }
      let buffers = [];
      stream.on("data", function (chunk) {
        buffers.push(chunk);
      });
      stream.on("end", function() {
        callback(new window.Blob(buffers, {
          type: type
        }));
      });
    } else {
      notImplemented("HTMLCanvasElement.prototype.toBlob (without installing the canvas npm package)",
        window);
    }
  }

  get width() {
    const parsed = parseInt(this.getAttribute("width"));
    return isNaN(parsed) || parsed < 0 || parsed > 2147483647 ? 300 : parsed;
  }

  set width(v) {
    v = v > 2147483647 ? 300 : v;
    this.setAttribute("width", String(v));
  }

  get height() {
    const parsed = parseInt(this.getAttribute("height"));
    return isNaN(parsed) || parsed < 0 || parsed > 2147483647 ? 150 : parsed;
  }

  set height(v) {
    v = v > 2147483647 ? 150 : v;
    this.setAttribute("height", String(v));
  }
}

module.exports = {
  implementation: HTMLCanvasElementImpl
};
