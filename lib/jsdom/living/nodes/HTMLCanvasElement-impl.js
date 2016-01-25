"use strict";

/* eslint global-require: 0 */

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

const notImplemented = require("../../browser/not-implemented");
const implSymbol = require("../generated/utils.js").implSymbol;

let Canvas;
try {
  Canvas = require("canvas");
} catch (e) {
  // Do nothing
}

class HTMLCanvasElementImpl extends HTMLElementImpl {
  constructor(args, privateData) {
    super(args, privateData);

    if (typeof Canvas === "function") { // in browserify, the require will succeed but return an empty object
      this._canvas = new Canvas(this.width, this.height);
    }
  }

  _attrModified(name) {
    if ((name === "width" || name === "height") && this._canvas) {
      this._canvas = new Canvas(this.width, this.height);
    }

    return super._attrModified.apply(this, arguments);
  }

  getContext(contextId) {
    // We need to wrap the methods that receive an image or canvas object
    // (luckily, always as the first argument), so that these objects can be
    // unwrapped an the expected types passed.
    function wrap(ctx, name) {
      var prev = ctx[name];
      ctx[name] = function(image) {
        var impl = image[implSymbol];
        if (impl) {
          arguments[0] = impl._image || impl._canvas;
        }
        return prev.apply(ctx, arguments);
      }
    }

    if (this._canvas) {
      var context = this._canvas.getContext(contextId) || null;
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
    return this._canvas ? contextId === "2d" : false;
  }

  setContext() {
    notImplemented("HTMLCanvasElement.prototype.setContext");
  }

  toDataURL() {
    if (this._canvas) {
      return this._canvas.toDataURL.apply(this._canvas, arguments);
    }

    notImplemented("HTMLCanvasElement.prototype.toDataURL (without installing the canvas npm package)",
      this._ownerDocument._defaultView);
  }

  toBlob(callback, type, encoderOptions) {
    const window = this._ownerDocument._defaultView;
    if (this._canvas) {
      let stream;
      switch (type) {
        case "image/jpg":
        case "image/jpeg":
          stream = this._canvas.createJPEGStream({
            quality: Math.min(0, Math.max(1, encoderOptions)) * 100
          });
          break;
        default:
          // TODO: Patch node-canvas to receive encoderOptions
          type = "image/png";
          stream = this._canvas.createPNGStream();
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
    }

    notImplemented("HTMLCanvasElement.prototype.toBlob (without installing the canvas npm package)",
      window);
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
