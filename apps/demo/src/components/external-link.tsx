import { Link } from '@fluentui/react';
import { ReactNode } from 'react';
import { withDisplayName } from '../utils/with-display-name';

export interface ExternalLinkProps {
    href: string;
    spaceBefore?: boolean;
    spaceAfter?: boolean;
    children?: ReactNode;
}

export const ExternalLink = withDisplayName('ExternalLink')(({
    href,
    spaceBefore,
    spaceAfter,
    children,
}: ExternalLinkProps) => {
    return (
        <>
            {spaceBefore && ' '}
            <Link href={href} target="_blank" rel="noopener">{children ?? href}</Link>
            {spaceAfter && ' '}
        </>
    );
});
