import { useEffect, useState } from "react";

export function CommandBarSpacerItem() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!container) {
            return;
        }

        const parent = container.parentElement!;
        const originalFlexGrow = parent.style.flexGrow;
        parent.style.flexGrow = "1";
        return () => {
            parent.style.flexGrow = originalFlexGrow;
        };
    }, [container]);

    return <div ref={setContainer} />;
}
