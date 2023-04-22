import Router from "next/router";
import { useEffect } from "react";

export default function Fallback() {
    useEffect(() => {
        Router.replace(location.href);
    }, []);

    return null;
}
