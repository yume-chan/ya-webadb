import { useLayoutEffect as useReactLayoutEffect } from "react";

export const useLayoutEffect =
    typeof window !== "undefined" ? useReactLayoutEffect : () => {};
