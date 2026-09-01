"use client";

import { useEffect, useRef } from "react";

export type AndroidBackHandler = () => boolean;

const handlers: Array<{
  id: symbol;
  handle: AndroidBackHandler;
}> = [];

function registerAndroidBackHandler(handle: AndroidBackHandler) {
  const entry = { id: Symbol("roots-android-back"), handle };
  handlers.push(entry);

  return () => {
    const index = handlers.findIndex(candidate => candidate.id === entry.id);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function runAndroidBackHandler() {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index].handle()) return true;
  }
  return false;
}

export function useAndroidBackHandler(handle: AndroidBackHandler) {
  const handleRef = useRef(handle);

  useEffect(() => {
    handleRef.current = handle;
  }, [handle]);

  useEffect(
    () => registerAndroidBackHandler(() => handleRef.current()),
    [],
  );
}
