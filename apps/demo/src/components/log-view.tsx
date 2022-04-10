import { PropsWithChildren, useEffect, useState } from 'react';

export function NoSsr({ children }: PropsWithChildren<{}>) {
    const [showChild, setShowChild] = useState(false);

    // Wait until after client-side hydration to show
    useEffect(() => {
        setShowChild(true);
    }, []);

    if (!showChild) {
        return null;
    }

    return <>{children}</>;
}
