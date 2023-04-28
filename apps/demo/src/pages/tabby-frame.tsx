import { useEffect } from "react";

function TabbyFrame() {
    useEffect(() => {
        // Only run at client side.
        try {
            require("@yume-chan/tabby-launcher");
        } catch (e) {
            console.error(e);
        }
    }, []);

    return (
        <div>
            <style id="custom-css" />

            {/* @ts-expect-error */}
            <app-root />
        </div>
    );
}

TabbyFrame.noLayout = true;

export default TabbyFrame;
