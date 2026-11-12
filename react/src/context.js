// What the Chart and Plots around an element tell it, in one context: its orientation, the Chart's `animate` (motion),
// the Chart itself (frame), whether it is inside a slat (nested), whether its Plot is static (still) and whether the
// Chart has a cross scale (crossed). All of these change rarely, so a block reads them without being drawn again for
// what changes often (the scale, the plot's size), which a Chart hands out through its frame instead.
import { createContext, useContext } from "react";

export const Around = createContext({ orientation: "horizontal", motion: undefined, frame: null, nested: false, still: false, crossed: false });

// The orientation of the Plot around
export const useOrientation = () => useContext(Around).orientation;

// A Theme's keys, for the Charts inside it
export const ThemeContext = createContext(null);

// Whether this is drawn on a server
export const isServer = typeof document === "undefined";
